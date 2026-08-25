import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

export function createAuthRouter({
  auth,
  pool,
  query,
  jwtSecret,
  frontendUrl,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
}) {
  const router = express.Router();
  const googleOAuthEnabled = Boolean(googleClientId && googleRedirectUri);

  // 7 дней — достаточно долго чтобы не выкидывать юзера каждые 15 минут
  function signToken(user) {
    return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: "7d" });
  }

  // Фронтенд (useAuth.js) читает токен из hash "#auth=token=...&user=...", а не из query —
  // так токен не попадает в логи сервера/истории браузера через query string.
  function buildFrontendAuthRedirect(user, token) {
    const authParams = new URLSearchParams({
      token,
      user: JSON.stringify({ id: user.id, email: user.email }),
    });
    return `${frontendUrl}/#auth=${encodeURIComponent(authParams.toString())}`;
  }

  // Защита от подбора пароля брутфорсом — считаем попытки по IP, не по email/user_id
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Слишком много попыток входа. Попробуйте позже." },
  });

  const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Слишком много попыток регистрации. Попробуйте позже." },
  });

  router.post("/register", registerLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email и пароль обязательны" });
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Пароль должен быть минимум 8 символов" });
    }
    const normalizedEmail = normalizeEmail(email);

    try {
      const passwordHash = await bcrypt.hash(password, 12);
      const result = await query(
        "INSERT INTO users (email, password_hash, email_verified_at) VALUES ($1, $2, now()) RETURNING id, email",
        [normalizedEmail, passwordHash]
      );
      const user = result.rows[0];
      res.status(201).json({ user, accessToken: signToken(user) });
    } catch (err) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Пользователь с таким email уже существует" });
      }
      console.error("register error:", err.message);
      res.status(500).json({ error: "Ошибка регистрации" });
    }
  });

  router.get("/google", (_req, res) => {
    if (!googleOAuthEnabled) {
      return res.status(500).json({ error: "Google OAuth is not configured" });
    }

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  router.get("/google/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect(`${frontendUrl}/?authError=missing_google_code`);

    try {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: googleRedirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error_description || "Google token exchange failed");

      const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profile.error_description || "Google profile failed");
      if (!profile.email || !profile.sub) throw new Error("Google profile is missing email or subject");

      const email = normalizeEmail(profile.email);
      const client = await pool.connect();
      try {
        await client.query("begin");
        const linked = await client.query(
          `SELECT u.id, u.email
           FROM oauth_accounts oa
           JOIN users u ON u.id = oa.user_id
           WHERE oa.provider = 'google' AND oa.provider_user_id = $1`,
          [profile.sub]
        );

        let user = linked.rows[0];
        if (!user) {
          const existing = await client.query("SELECT id, email FROM users WHERE lower(email) = $1", [email]);
          user = existing.rows[0];
          if (!user) {
            const created = await client.query(
              "INSERT INTO users (email, password_hash, email_verified_at) VALUES ($1, NULL, now()) RETURNING id, email",
              [email]
            );
            user = created.rows[0];
          } else {
            await client.query(
              "UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1",
              [user.id]
            );
          }

          await client.query(
            `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
             VALUES ($1, 'google', $2, $3)
             ON CONFLICT (provider, provider_user_id)
             DO UPDATE SET user_id = EXCLUDED.user_id, email = EXCLUDED.email`,
            [user.id, profile.sub, email]
          );
        }

        await client.query("commit");
        res.redirect(buildFrontendAuthRedirect(user, signToken(user)));
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("google auth error:", err.message);
      res.redirect(`${frontendUrl}/?authError=google_auth_failed`);
    }
  });

  //Логин иошибки с ним
  router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email и пароль обязательны" });
    const normalizedEmail = normalizeEmail(email);

    try {
      const result = await query(
        "SELECT id, email, password_hash, email_verified_at FROM users WHERE lower(email) = $1",
        [normalizedEmail]
      );
      const user = result.rows[0];
      // Одинаковые сообщения — безопасная практика (не раскрываем какого поля нет)
      if (!user) return res.status(401).json({ error: "Неверный email или пароль" });
      if (!user.password_hash) return res.status(401).json({ error: "Войдите через Google для этого аккаунта" });
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Неверный email или пароль" });

      res.json({ user: { id: user.id, email: user.email }, accessToken: signToken(user) });
    } catch (err) {
      console.error("login error:", err.message);
      res.status(500).json({ error: "Ошибка входа" });
    }
  });

  // Нужен для проверки токена при загрузке приложения (useAuth.js)
  router.get("/me", auth, async (req, res) => {
    try {
      const result = await query(
        "SELECT id, email, created_at, email_verified_at FROM users WHERE id = $1",
        [req.user.id]
      );
      const user = result.rows[0];
      if (!user || !user.email_verified_at) return res.status(401).json({ error: "Unauthorized" });
      res.json({ user: { id: user.id, email: user.email, created_at: user.created_at } });
    } catch (err) {
      console.error("me error:", err.message);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });

  return router;
}
