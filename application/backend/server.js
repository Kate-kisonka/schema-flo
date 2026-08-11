import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { pool, query } from "./db.js"; //подключение к бд и обработка скюль запросов
import { COMPANION_CRISIS_REPLY, isCompanionCrisisMessage } from "./companionSafety.js";
import { getImportConflictPolicy } from "./legacyImportPolicy.js";

dotenv.config();

const app = express();
// За backend в цепочке 2 прокси (Traefik → Caddy), поэтому req.ip должен браться
// из 2-го X-Forwarded-For справа. trust proxy: true доверяет ЛЮБОМУ значению из
// заголовка (клиент может подделать), а число хопов — доверяет ровно нашей топологии.
app.set("trust proxy", 2);
const PORT = process.env.PORT || 3001; //
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://schema-flo.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function readBoundedEnvInt(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b-instruct";
const OLLAMA_TIMEOUT_MS = 30000;
const COMPANION_RETENTION_DAYS = readBoundedEnvInt("COMPANION_RETENTION_DAYS", 30, 1, 3650);
const COMPANION_CLEANUP_INTERVAL_HOURS = readBoundedEnvInt("COMPANION_CLEANUP_INTERVAL_HOURS", 1, 1, 24);
const COMPANION_NUM_PREDICT = readBoundedEnvInt("COMPANION_NUM_PREDICT", 384, 64, 1024);
const COMPANION_MAX_REPLY_LENGTH = readBoundedEnvInt("COMPANION_MAX_REPLY_LENGTH", 4000, 500, 12000);
const COMPANION_MAX_MESSAGE_LENGTH = 4000;
const COMPANION_HISTORY_CONTEXT_LIMIT = 19;
const COMPANION_ROLE_TO_OLLAMA = { user: "user", companion: "assistant" };

// credentials: true нужен для будущих cookie-based flow
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: "2mb" }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}
const DIARY_SELECT = `id, entry_date, mood_ids, active_schema_ids, intensity, notes,
  cycle_day, phase_key, symptoms, discharge, digestion, libido, symptom_notes,
  completed_exercise_ids, created_at, updated_at`;

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [];
}

const DIARY_TEXT_FIELDS = ["notes", "phaseKey", "discharge", "digestion", "libido", "symptomNotes"];

// Postgres роняет запрос с ошибкой типа колонки (500), если сюда придёт объект/массив вместо строки —
// проверяем тип заранее и возвращаем понятный 400.
function validateDiaryTextFields(body) {
  for (const field of DIARY_TEXT_FIELDS) {
    const value = body[field];
    if (value !== undefined && value !== null && typeof value !== "string") {
      return `${field} должен быть строкой`;
    }
  }
  return null;
}

function buildDiaryParams(body) {
  const {
    moodIds,
    activeSchemaIds,
    intensity,
    notes,
    cycleDay,
    phaseKey,
    symptoms,
    discharge,
    digestion,
    libido,
    symptomNotes,
    completedExerciseIds,
  } = body;

  const safeIntensity = intensity !== undefined && intensity !== null
    ? toSafeInt(intensity, 1, 10)
    : undefined;

  return {
    moodIds: moodIds !== undefined ? JSON.stringify(parseJsonArray(moodIds)) : undefined,
    activeSchemaIds: activeSchemaIds !== undefined ? JSON.stringify(parseJsonArray(activeSchemaIds)) : undefined,
    intensity: safeIntensity,
    notes,
    cycleDay,
    phaseKey,
    symptoms: symptoms !== undefined ? JSON.stringify(parseJsonArray(symptoms)) : undefined,
    discharge,
    digestion,
    libido,
    symptomNotes,
    completedExerciseIds: completedExerciseIds !== undefined
      ? JSON.stringify(parseJsonArray(completedExerciseIds))
      : undefined,
  };
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function toSafeInt(value, min, max) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

// 7 дней — достаточно долго чтобы не выкидывать юзера каждые 15 минут
function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

// Фронтенд (useAuth.js) читает токен из hash "#auth=token=...&user=...", а не из query —
// так токен не попадает в логи сервера/истории браузера через query string.
function buildFrontendAuthRedirect(user, token) {
  const authParams = new URLSearchParams({
    token,
    user: JSON.stringify({ id: user.id, email: user.email }),
  });
  return `${FRONTEND_URL}/#auth=${encodeURIComponent(authParams.toString())}`;
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

const companionChatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  message: { error: "Слишком много сообщений компаньону. Попробуйте позже." },
});

const COMPANION_SYSTEM_PROMPT =
  "Ты — Свет, тёплый и бережный компаньон в приложении для отслеживания психического состояния и цикла. " +
  "Слушай внимательно, поддерживай без осуждения и отвечай кратко. " +
  "Не ставь диагнозы, не давай медицинских советов и не заменяй врача или психотерапевта.";

function parseBoundedQueryInt(value, fallback, min, max) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

async function callOllama(messages) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: "system", content: COMPANION_SYSTEM_PROMPT }, ...messages],
        options: { num_predict: COMPANION_NUM_PREDICT },
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Ollama responded with status ${response.status}`);
    }
    const data = await response.json();
    const content = data?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Ollama returned empty content");
    }
    return content.trim().slice(0, COMPANION_MAX_REPLY_LENGTH);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getCompanionConsent(client, userId) {
  const result = await client.query(
    `SELECT consented_at, revoked_at, retention_days, chat_version
     FROM companion_chat_consents WHERE user_id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row || row.revoked_at) {
    return { active: false, retentionDays: COMPANION_RETENTION_DAYS };
  }
  return {
    active: true,
    consentedAt: row.consented_at,
    retentionDays: Math.min(row.retention_days, COMPANION_RETENTION_DAYS),
    chatVersion: Number(row.chat_version),
  };
}

async function requireCompanionConsent(req, res, next) {
  try {
    const consent = await getCompanionConsent(pool, req.user.id);
    if (!consent.active) {
      return res.status(403).json({
        code: "COMPANION_CONSENT_REQUIRED",
        error: "Для использования компаньона нужно активное согласие",
        retentionDays: consent.retentionDays,
      });
    }
    req.companionRetentionDays = consent.retentionDays;
    req.companionChatVersion = consent.chatVersion;
    next();
  } catch (err) {
    console.error("companion consent check error:", err.message);
    res.status(500).json({ error: "Не удалось проверить согласие" });
  }
}

const COMPANION_GLOBAL_CLEANUP_SQL = `
  WITH cleanup_users AS MATERIALIZED (
    SELECT DISTINCT message.user_id
    FROM companion_messages AS message
    LEFT JOIN companion_chat_consents AS consent ON consent.user_id = message.user_id
    WHERE consent.user_id IS NULL
       OR consent.revoked_at IS NOT NULL
       OR message.created_at < now() - (
         LEAST(consent.retention_days, $1::integer) * interval '1 day'
       )
  ),
  bumped AS (
    UPDATE companion_chat_consents AS consent
    SET chat_version = consent.chat_version + 1
    FROM cleanup_users
    WHERE consent.user_id = cleanup_users.user_id
    RETURNING consent.user_id
  ),
  deleted AS (
    DELETE FROM companion_messages AS message
    USING cleanup_users
    WHERE message.user_id = cleanup_users.user_id
      AND (
        NOT EXISTS (
          SELECT 1 FROM companion_chat_consents AS consent
          WHERE consent.user_id = message.user_id
        )
        OR EXISTS (
          SELECT 1 FROM bumped WHERE bumped.user_id = message.user_id
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM companion_chat_consents AS active_consent
        WHERE active_consent.user_id = message.user_id
          AND active_consent.revoked_at IS NULL
          AND message.created_at >= now() - (
            LEAST(active_consent.retention_days, $1::integer) * interval '1 day'
          )
      )
    RETURNING message.user_id
  )
  SELECT
    (SELECT count(*)::integer FROM deleted) AS deleted_messages,
    (SELECT count(*)::integer FROM bumped) AS affected_users
`;

async function runGlobalCompanionCleanup() {
  const result = await query(COMPANION_GLOBAL_CLEANUP_SQL, [COMPANION_RETENTION_DAYS]);
  return result.rows[0] || { deleted_messages: 0, affected_users: 0 };
}

async function cleanupCompanionMessagesForUser(client, userId, retentionDays) {
  const deleted = await client.query(
    `DELETE FROM companion_messages
     WHERE user_id = $1
       AND created_at < now() - ($2::integer * interval '1 day')
     RETURNING id`,
    [userId, retentionDays]
  );
  if (deleted.rowCount > 0) {
    const version = await client.query(
      `UPDATE companion_chat_consents
       SET chat_version = chat_version + 1
       WHERE user_id = $1
       RETURNING chat_version`,
      [userId]
    );
    return Number(version.rows[0].chat_version);
  }
  return null;
}

async function cleanupActiveCompanionMessages(userId) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const consentResult = await client.query(
      `SELECT retention_days, chat_version
       FROM companion_chat_consents
       WHERE user_id = $1 AND revoked_at IS NULL
       FOR UPDATE`,
      [userId]
    );
    if (consentResult.rowCount === 0) {
      const error = new Error("Companion consent is required");
      error.code = "COMPANION_CONSENT_REQUIRED";
      throw error;
    }
    const consent = consentResult.rows[0];
    const retentionDays = Math.min(consent.retention_days, COMPANION_RETENTION_DAYS);
    const cleanedVersion = await cleanupCompanionMessagesForUser(client, userId, retentionDays);
    await client.query("commit");
    return {
      retentionDays,
      chatVersion: cleanedVersion ?? Number(consent.chat_version),
    };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

function toCompanionClientMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function prepareCompanionGeneration(userId) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const consentResult = await client.query(
      `SELECT retention_days, chat_version
       FROM companion_chat_consents
       WHERE user_id = $1 AND revoked_at IS NULL
       FOR UPDATE`,
      [userId]
    );
    if (consentResult.rowCount === 0) {
      const error = new Error("Companion consent is required");
      error.code = "COMPANION_CONSENT_REQUIRED";
      throw error;
    }

    const consent = consentResult.rows[0];
    const retentionDays = Math.min(consent.retention_days, COMPANION_RETENTION_DAYS);
    const cleanedVersion = await cleanupCompanionMessagesForUser(client, userId, retentionDays);
    const expectedVersion = cleanedVersion ?? Number(consent.chat_version);
    const historyResult = await client.query(
      `SELECT id, role, content, created_at FROM (
         SELECT id, role, content, created_at FROM companion_messages
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2
       ) recent
       ORDER BY created_at ASC, id ASC`,
      [userId, COMPANION_HISTORY_CONTEXT_LIMIT]
    );
    await client.query("commit");
    return { expectedVersion, history: historyResult.rows };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function saveCompanionExchange(userId, expectedVersion, userMessage, companionReply) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const versionUpdate = await client.query(
      `UPDATE companion_chat_consents
       SET chat_version = chat_version + 1
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND chat_version = $2
       RETURNING chat_version`,
      [userId, expectedVersion]
    );
    if (versionUpdate.rowCount === 0) {
      const current = await client.query(
        `SELECT revoked_at FROM companion_chat_consents WHERE user_id = $1`,
        [userId]
      );
      const error = new Error("Companion chat changed during generation");
      error.code = current.rowCount === 0 || current.rows[0].revoked_at
        ? "COMPANION_CONSENT_REQUIRED"
        : "COMPANION_CHAT_CONFLICT";
      throw error;
    }

    const result = await client.query(
      `WITH inserted AS (
         INSERT INTO companion_messages (user_id, role, content, created_at)
         VALUES
           ($1, 'user', $2, now()),
           ($1, 'companion', $3, now() + interval '1 microsecond')
         RETURNING id, role, content, created_at
       )
       SELECT id, role, content, created_at FROM inserted
       ORDER BY created_at ASC, id ASC`,
      [userId, userMessage, companionReply]
    );
    await client.query("commit");
    return {
      chatVersion: Number(versionUpdate.rows[0].chat_version),
      messages: result.rows.map(toCompanionClientMessage),
    };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/health", async (_req, res) => {
  try {
    await query("SELECT NOW()");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/register", registerLimiter, async (req, res) => {
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
    const accessToken = signToken(user);
    res.status(201).json({ user, accessToken });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Пользователь с таким email уже существует" });
    }
    console.error("register error:", err.message);
    res.status(500).json({ error: "Ошибка регистрации" });
  }
});

app.get("/api/auth/google", (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REDIRECT_URI) {
    return res.status(500).json({ error: "Google OAuth is not configured" });
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/api/auth/google/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect(`${FRONTEND_URL}/?authError=missing_google_code`);

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
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
    res.redirect(`${FRONTEND_URL}/?authError=google_auth_failed`);
  }
});
//Логин иошибки с ним
app.post("/api/auth/login", loginLimiter, async (req, res) => {
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
app.get("/api/auth/me", auth, async (req, res) => {
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

// ─── Diary ────────────────────────────────────────────────────────────────────

app.get("/api/diary", auth, async (req, res) => {
  if (req.query.limit !== undefined && !Number.isFinite(Number(req.query.limit))) {
    return res.status(400).json({ error: "limit должен быть числом" });
  }
  if (req.query.offset !== undefined && !Number.isFinite(Number(req.query.offset))) {
    return res.status(400).json({ error: "offset должен быть числом" });
  }
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 500);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  // Фильтр по конкретной дате — нужен для эффективного upsert без N+1
  const date = req.query.date;
  try {
    let result;
    if (date && isIsoDate(date)) {
      result = await query(
        `SELECT ${DIARY_SELECT} FROM diary_entries WHERE user_id = $1 AND entry_date = $2`,
        [req.user.id, date]
      );
    } else {
      result = await query(
        `SELECT ${DIARY_SELECT} FROM diary_entries WHERE user_id = $1 ORDER BY entry_date DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      );
    }
    res.json({ items: result.rows });
  } catch (err) {
    console.error("diary GET error:", err.message);
    res.status(500).json({ error: "Не удалось загрузить записи" });
  }
});

app.post("/api/diary", auth, async (req, res) => {
  const { entryDate } = req.body;
  if (entryDate && !isIsoDate(entryDate)) return res.status(400).json({ error: "entryDate должен быть в формате YYYY-MM-DD" });
  if (req.body.moodIds !== undefined && !Array.isArray(req.body.moodIds)) {
    return res.status(400).json({ error: "moodIds должен быть массивом" });
  }
  if (req.body.activeSchemaIds !== undefined && !Array.isArray(req.body.activeSchemaIds)) {
    return res.status(400).json({ error: "activeSchemaIds должен быть массивом" });
  }
  const textFieldErrors = validateDiaryTextFields(req.body);
  if (textFieldErrors) return res.status(400).json({ error: textFieldErrors });

  const fields = buildDiaryParams({
    moodIds: req.body.moodIds ?? [],
    activeSchemaIds: req.body.activeSchemaIds ?? [],
    intensity: req.body.intensity ?? null,
    notes: req.body.notes ?? "",
    cycleDay: req.body.cycleDay ?? null,
    phaseKey: req.body.phaseKey ?? null,
    symptoms: req.body.symptoms ?? [],
    discharge: req.body.discharge ?? null,
    digestion: req.body.digestion ?? null,
    libido: req.body.libido ?? null,
    symptomNotes: req.body.symptomNotes ?? "",
    completedExerciseIds: req.body.completedExerciseIds ?? [],
  });
  if (req.body.intensity !== null && req.body.intensity !== undefined && fields.intensity === null) {
    return res.status(400).json({ error: "intensity: целое число от 1 до 10" });
  }

  try {
    const result = await query(
      `INSERT INTO diary_entries (
         user_id, entry_date, mood_ids, active_schema_ids, intensity, notes,
         cycle_day, phase_key, symptoms, discharge, digestion, libido,
         symptom_notes, completed_exercise_ids
       )
       VALUES ($1, COALESCE($2, current_date), $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14::jsonb)
       ON CONFLICT (user_id, entry_date) DO UPDATE SET
         mood_ids = EXCLUDED.mood_ids,
         active_schema_ids = EXCLUDED.active_schema_ids,
         intensity = EXCLUDED.intensity,
         notes = EXCLUDED.notes,
         cycle_day = EXCLUDED.cycle_day,
         phase_key = EXCLUDED.phase_key,
         symptoms = EXCLUDED.symptoms,
         discharge = EXCLUDED.discharge,
         digestion = EXCLUDED.digestion,
         libido = EXCLUDED.libido,
         symptom_notes = EXCLUDED.symptom_notes,
         completed_exercise_ids = EXCLUDED.completed_exercise_ids,
         updated_at = now()
       RETURNING ${DIARY_SELECT}`,
      [
        req.user.id,
        entryDate || null,
        fields.moodIds,
        fields.activeSchemaIds,
        fields.intensity,
        fields.notes,
        fields.cycleDay,
        fields.phaseKey,
        fields.symptoms,
        fields.discharge,
        fields.digestion,
        fields.libido,
        fields.symptomNotes,
        fields.completedExerciseIds,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("diary POST error:", err.message);
    res.status(500).json({ error: "Не удалось создать запись" });
  }
});

app.patch("/api/diary/:id", auth, async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) return res.status(400).json({ error: "Некорректный id записи" });
  const { entryDate } = req.body;
  if (entryDate && !isIsoDate(entryDate)) return res.status(400).json({ error: "entryDate должен быть в формате YYYY-MM-DD" });

  const textFieldErrors = validateDiaryTextFields(req.body);
  if (textFieldErrors) return res.status(400).json({ error: textFieldErrors });

  const fields = buildDiaryParams(req.body);
  if (req.body.intensity !== undefined && req.body.intensity !== null && fields.intensity === null) {
    return res.status(400).json({ error: "intensity: целое число от 1 до 10" });
  }

  try {
    const result = await query(
      `UPDATE diary_entries
       SET entry_date              = COALESCE($3, entry_date),
           mood_ids                = COALESCE($4::jsonb, mood_ids),
           active_schema_ids       = COALESCE($5::jsonb, active_schema_ids),
           intensity               = COALESCE($6, intensity),
           notes                   = COALESCE($7, notes),
           cycle_day               = COALESCE($8, cycle_day),
           phase_key               = COALESCE($9, phase_key),
           symptoms                = COALESCE($10::jsonb, symptoms),
           discharge               = COALESCE($11, discharge),
           digestion               = COALESCE($12, digestion),
           libido                  = COALESCE($13, libido),
           symptom_notes           = COALESCE($14, symptom_notes),
           completed_exercise_ids  = COALESCE($15::jsonb, completed_exercise_ids)
       WHERE id = $1 AND user_id = $2
       RETURNING ${DIARY_SELECT}`,
      [
        id, req.user.id,
        entryDate ?? null,
        fields.moodIds ?? null,
        fields.activeSchemaIds ?? null,
        fields.intensity ?? null,
        fields.notes ?? null,
        fields.cycleDay ?? null,
        fields.phaseKey ?? null,
        fields.symptoms ?? null,
        fields.discharge ?? null,
        fields.digestion ?? null,
        fields.libido ?? null,
        fields.symptomNotes ?? null,
        fields.completedExerciseIds ?? null,
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Запись не найдена" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("diary PATCH error:", err.message);
    res.status(500).json({ error: "Не удалось обновить запись" });
  }
});

app.delete("/api/diary/:id", auth, async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: "Некорректный id записи" });
  try {
    const result = await query(
      "DELETE FROM diary_entries WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Запись не найдена" });
    res.status(204).send();
  } catch (err) {
    console.error("diary DELETE error:", err.message);
    res.status(500).json({ error: "Не удалось удалить запись" });
  }
});

// ─── Cycle ────────────────────────────────────────────────────────────────────

app.get("/api/cycle", auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, period_start_date, cycle_length, notes, created_at
       FROM cycle_entries WHERE user_id = $1 ORDER BY period_start_date DESC`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error("cycle GET error:", err.message);
    res.status(500).json({ error: "Не удалось загрузить историю цикла" });
  }
});

app.post("/api/cycle", auth, async (req, res) => {
  const { periodStartDate, cycleLength = null, notes = "" } = req.body;
  if (!periodStartDate) return res.status(400).json({ error: "periodStartDate обязателен" });
  if (!isIsoDate(periodStartDate)) return res.status(400).json({ error: "periodStartDate должен быть в формате YYYY-MM-DD" });

  const safeCycleLength = cycleLength !== null && cycleLength !== undefined
    ? toSafeInt(cycleLength, 1, 99)
    : null;
  if (cycleLength !== null && cycleLength !== undefined && safeCycleLength === null) {
    return res.status(400).json({ error: "cycleLength: целое число от 1 до 99" });
  }

  try {
    const result = await query(
      `INSERT INTO cycle_entries (user_id, period_start_date, cycle_length, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, period_start_date) DO UPDATE SET
         cycle_length = EXCLUDED.cycle_length,
         notes = EXCLUDED.notes
       RETURNING *`,
      [req.user.id, periodStartDate, safeCycleLength, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("cycle POST error:", err.message);
    res.status(500).json({ error: "Не удалось сохранить цикл" });
  }
});

// ─── Practices ────────────────────────────────────────────────────────────────

app.get("/api/practices", auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, practice_type, duration_sec, logged_at, metadata
       FROM practice_logs WHERE user_id = $1 ORDER BY logged_at DESC`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    console.error("practices GET error:", err.message);
    res.status(500).json({ error: "Не удалось загрузить практики" });
  }
});

app.post("/api/practices", auth, async (req, res) => {
  const { practiceType, durationSec = null, loggedAt = null, metadata = {} } = req.body;
  if (!practiceType) return res.status(400).json({ error: "practiceType обязателен" });
  const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};
  const loggedAtValue = loggedAt || new Date().toISOString();

  try {
    if (practiceType === "silence") {
      const result = await query(
        `INSERT INTO practice_logs (user_id, practice_type, duration_sec, logged_at, metadata)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()), $5::jsonb)
         ON CONFLICT (user_id, ((logged_at AT TIME ZONE 'UTC')::date))
         WHERE practice_type = 'silence'
         DO UPDATE SET metadata = EXCLUDED.metadata, logged_at = EXCLUDED.logged_at
         RETURNING id, practice_type, duration_sec, logged_at, metadata`,
        [req.user.id, practiceType, durationSec, loggedAtValue, JSON.stringify(safeMetadata)]
      );
      return res.status(201).json(result.rows[0]);
    }

    const result = await query(
      `INSERT INTO practice_logs (user_id, practice_type, duration_sec, logged_at, metadata)
       VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()), $5::jsonb)
       RETURNING id, practice_type, duration_sec, logged_at, metadata`,
      [req.user.id, practiceType, durationSec, loggedAtValue, JSON.stringify(safeMetadata)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("practices POST error:", err.message);
    res.status(500).json({ error: "Не удалось сохранить практику" });
  }
});

// ─── State (цикл + тишина в одной записи) ────────────────────────────────────

app.get("/api/state", auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT cycle_day, period_start_date, period_active,
              silence_active, silence_start_date, silence_days
       FROM user_states WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("state GET error:", err.message);
    res.status(500).json({ error: "Не удалось загрузить состояние" });
  }
});

app.put("/api/state", auth, async (req, res) => {
  const {
    cycleDay = null,
    periodStartDate = null,
    periodActive = false,
    silenceActive = false,
    silenceStartDate = null,
    silenceDays = 14,
  } = req.body;

  const safeCycleDay = cycleDay !== null && cycleDay !== undefined ? toSafeInt(cycleDay, 1, 99) : null;
  if (cycleDay !== null && cycleDay !== undefined && safeCycleDay === null) {
    return res.status(400).json({ error: "cycleDay: целое число от 1 до 99" });
  }
  const safeSilenceDays = silenceDays !== null && silenceDays !== undefined ? toSafeInt(silenceDays, 1, 365) : null;
  if (silenceDays !== null && silenceDays !== undefined && safeSilenceDays === null) {
    return res.status(400).json({ error: "silenceDays: целое число от 1 до 365" });
  }

  try {
    const result = await query(
      `INSERT INTO user_states
         (user_id, cycle_day, period_start_date, period_active, silence_active, silence_start_date, silence_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         cycle_day          = EXCLUDED.cycle_day,
         period_start_date  = EXCLUDED.period_start_date,
         period_active      = EXCLUDED.period_active,
         silence_active     = EXCLUDED.silence_active,
         silence_start_date = EXCLUDED.silence_start_date,
         silence_days       = EXCLUDED.silence_days
       RETURNING cycle_day, period_start_date, period_active, silence_active, silence_start_date, silence_days`,
      [req.user.id, safeCycleDay, periodStartDate, periodActive, silenceActive, silenceStartDate, safeSilenceDays]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("state PUT error:", err.message);
    res.status(500).json({ error: "Не удалось сохранить состояние" });
  }
});

// ─── Импорт локальных данных  ──────

app.post("/api/import/local", auth, async (req, res) => {
  const {
    diary = [],
    periodHistory = [],
    silenceLogs = [],
    source = "backup-restore",
    confirmedOwnership = false,
  } = req.body;
  if (!Array.isArray(diary) || !Array.isArray(periodHistory) || !Array.isArray(silenceLogs)) {
    return res.status(400).json({ error: "diary, periodHistory и silenceLogs должны быть массивами" });
  }
  const {
    isLegacyMigration,
    diaryConflictClause,
    cycleConflictClause,
    practiceConflictClause,
  } = getImportConflictPolicy(source);
  if (isLegacyMigration && confirmedOwnership !== true) {
    return res.status(400).json({
      error: "Для schema-flo-legacy-local-storage требуется confirmedOwnership=true",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    let diaryCount = 0;
    for (const item of diary) {
      const result = await client.query(
        `INSERT INTO diary_entries ( 
           user_id, entry_date, mood_ids, active_schema_ids, intensity, notes,
           cycle_day, phase_key, symptoms, discharge, digestion, libido,
           symptom_notes, completed_exercise_ids
         )
         VALUES ($1, COALESCE($2, current_date), $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14::jsonb)
         ${diaryConflictClause}`,
        [
          req.user.id,
          item.date ?? null,
          JSON.stringify(item.moods ?? []),
          JSON.stringify(item.schemas ?? []),
          item.intensity ?? null,
          item.notes ?? "",
          item.cycleDay ?? null,
          item.phase ?? null,
          JSON.stringify(item.symptoms ?? []),
          item.discharge ?? null,
          item.digestion ?? null,
          item.libido ?? null,
          item.symptomNotes ?? "",
          JSON.stringify(item.exercises ?? item.completedExerciseIds ?? []),
        ]
      );
      diaryCount += isLegacyMigration ? result.rowCount : 1;
    }

    let cycleCount = 0;
    for (const item of periodHistory) {
      if (!item.date) continue;
      const result = await client.query(
        `INSERT INTO cycle_entries (user_id, period_start_date, cycle_length, notes)
         VALUES ($1, $2, $3, $4)
         ${cycleConflictClause}`,
        [req.user.id, item.date, item.cycleLength ?? null, item.flowIntensity ?? ""]
      );
      cycleCount += isLegacyMigration ? result.rowCount : 1;
    }

    let practiceCount = 0;
    for (const item of silenceLogs) {
      const metadata = {
        dayNum: item.dayNum ?? null,
        needsChecked: item.needsChecked ?? [],
        morningNote: item.morningNote ?? "",
        goodDone: item.goodDone ?? "",
        goodTomorrow: item.goodTomorrow ?? "",
      };
      const result = await client.query(
        `INSERT INTO practice_logs (user_id, practice_type, duration_sec, logged_at, metadata)
         VALUES ($1, 'silence', NULL, COALESCE($2::timestamptz, now()), $3::jsonb)
         ${practiceConflictClause}`,
        [req.user.id, item.date ? `${item.date}T00:00:00Z` : null, JSON.stringify(metadata)]
      );
      practiceCount += isLegacyMigration ? result.rowCount : 1;
    }

    await client.query("commit");
    res.json({ imported: { diary: diaryCount, cycle: cycleCount, practices: practiceCount } });
  } catch (err) {
    await client.query("rollback");
    console.error("import error:", err.message);
    res.status(500).json({ error: "Импорт данных не удался" });
  } finally {
    client.release();
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.get("/api/companion/consent", auth, async (req, res) => {
  try {
    const consent = await getCompanionConsent(pool, req.user.id);
    res.json(consent);
  } catch (err) {
    console.error("companion consent GET error:", err.message);
    res.status(500).json({ error: "Не удалось загрузить согласие" });
  }
});

app.post("/api/companion/consent", auth, async (req, res) => {
  try {
    const result = await query(
      `INSERT INTO companion_chat_consents (user_id, consented_at, revoked_at, retention_days, chat_version)
       VALUES ($1, now(), NULL, $2, 0)
       ON CONFLICT (user_id) DO UPDATE SET
         consented_at = now(),
         revoked_at = NULL,
         retention_days = EXCLUDED.retention_days,
         chat_version = companion_chat_consents.chat_version + 1
       RETURNING consented_at, retention_days, chat_version`,
      [req.user.id, COMPANION_RETENTION_DAYS]
    );
    res.json({
      active: true,
      consentedAt: result.rows[0].consented_at,
      retentionDays: result.rows[0].retention_days,
      chatVersion: Number(result.rows[0].chat_version),
    });
  } catch (err) {
    console.error("companion consent POST error:", err.message);
    res.status(500).json({ error: "Не удалось сохранить согласие" });
  }
});

app.delete("/api/companion/consent", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `UPDATE companion_chat_consents
       SET revoked_at = now(), chat_version = chat_version + 1
       WHERE user_id = $1`,
      [req.user.id]
    );
    const deleted = await client.query(
      "DELETE FROM companion_messages WHERE user_id = $1",
      [req.user.id]
    );
    await client.query("commit");
    res.json({ active: false, deletedMessages: deleted.rowCount });
  } catch (err) {
    await client.query("rollback");
    console.error("companion consent DELETE error:", err.message);
    res.status(500).json({ error: "Не удалось отозвать согласие" });
  } finally {
    client.release();
  }
});

app.post(
  "/api/companion/chat",
  auth,
  companionChatLimiter,
  async (req, res) => {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      return res.status(400).json({ error: "message обязателен и должен быть непустой строкой" });
    }
    if (message.length > COMPANION_MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: "message слишком длинное" });
    }

    try {
      const generation = await prepareCompanionGeneration(req.user.id);

      let reply;
      let crisis = false;
      if (isCompanionCrisisMessage(message)) {
        crisis = true;
        reply = COMPANION_CRISIS_REPLY;
      } else {
        const ollamaMessages = [
          ...generation.history.map((row) => ({
            role: COMPANION_ROLE_TO_OLLAMA[row.role] || "user",
            content: row.content,
          })),
          { role: "user", content: message },
        ];
        try {
          reply = await callOllama(ollamaMessages);
        } catch (err) {
          console.error("companion ollama error:", err.message);
          return res.status(503).json({ error: "Компаньон временно недоступен, попробуйте позже" });
        }
      }

      const saved = await saveCompanionExchange(
        req.user.id,
        generation.expectedVersion,
        message,
        reply
      );
      const { messages } = saved;
      const companionMessage = messages.find((item) => item.role === "companion");
      res.json({
        reply: companionMessage.content,
        createdAt: companionMessage.createdAt,
        messages,
        crisis,
        chatVersion: saved.chatVersion,
      });
    } catch (err) {
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({
          code: err.code,
          error: "Согласие было отозвано",
          retentionDays: COMPANION_RETENTION_DAYS,
        });
      }
      if (err.code === "COMPANION_CHAT_CONFLICT") {
        return res.status(409).json({
          code: err.code,
          error: "История чата изменилась. Обновите её и повторите сообщение.",
        });
      }
      console.error("companion chat error:", err.message);
      res.status(500).json({ error: "Не удалось обработать сообщение" });
    }
  }
);

app.get(
  "/api/companion/chat/history",
  auth,
  requireCompanionConsent,
  async (req, res) => {
    const limit = parseBoundedQueryInt(req.query.limit, 100, 1, 500);
    const offset = parseBoundedQueryInt(req.query.offset, 0, 0, 100000);
    if (limit === null || offset === null) {
      return res.status(400).json({ error: "limit и offset должны быть целыми числами в допустимом диапазоне" });
    }
    try {
      const state = await cleanupActiveCompanionMessages(req.user.id);
      const result = await query(
        `SELECT id, role, content, created_at FROM (
           SELECT id, role, content, created_at FROM companion_messages
           WHERE user_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT $2 OFFSET $3
         ) recent
         ORDER BY created_at ASC, id ASC`,
        [req.user.id, limit, offset]
      );
      res.json({
        messages: result.rows.map(toCompanionClientMessage),
        retentionDays: state.retentionDays,
        chatVersion: state.chatVersion,
      });
    } catch (err) {
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({ code: err.code, error: "Согласие не активно" });
      }
      console.error("companion history error:", err.message);
      res.status(500).json({ error: "Не удалось загрузить историю" });
    }
  }
);

app.delete(
  "/api/companion/chat/history",
  auth,
  requireCompanionConsent,
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const version = await client.query(
        `UPDATE companion_chat_consents
         SET chat_version = chat_version + 1
         WHERE user_id = $1 AND revoked_at IS NULL
         RETURNING chat_version`,
        [req.user.id]
      );
      if (version.rowCount === 0) {
        const error = new Error("Companion consent is required");
        error.code = "COMPANION_CONSENT_REQUIRED";
        throw error;
      }
      const result = await client.query(
        "DELETE FROM companion_messages WHERE user_id = $1",
        [req.user.id]
      );
      await client.query("commit");
      res.json({
        deletedMessages: result.rowCount,
        chatVersion: Number(version.rows[0].chat_version),
      });
    } catch (err) {
      await client.query("rollback");
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({ code: err.code, error: "Согласие не активно" });
      }
      console.error("companion history DELETE error:", err.message);
      res.status(500).json({ error: "Не удалось удалить историю" });
    } finally {
      client.release();
    }
  }
);

app.get(
  "/api/companion/chat/export",
  auth,
  requireCompanionConsent,
  async (req, res) => {
    try {
      await cleanupActiveCompanionMessages(req.user.id);
      const result = await query(
        `SELECT id, role, content, created_at FROM companion_messages
         WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
        [req.user.id]
      );
      const lines = result.rows.map((row) => {
        const roleLabel = row.role === "companion" ? "Свет" : "Я";
        return `[${row.created_at.toISOString()}] ${roleLabel}: ${row.content}`;
      });
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Content-Disposition", 'attachment; filename="companion-chat.txt"');
      res.send(lines.join("\n\n"));
    } catch (err) {
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({ code: err.code, error: "Согласие не активно" });
      }
      console.error("companion export error:", err.message);
      res.status(500).json({ error: "Не удалось экспортировать историю" });
    }
  }
);

let companionCleanupRunning = false;
async function runScheduledCompanionCleanup() {
  if (companionCleanupRunning) return;
  companionCleanupRunning = true;
  try {
    const result = await runGlobalCompanionCleanup();
    if (result.deleted_messages > 0) {
      console.log(
        `companion retention cleanup: deleted=${result.deleted_messages} users=${result.affected_users}`
      );
    }
  } catch (err) {
    console.error("companion retention cleanup error:", err.message);
  } finally {
    companionCleanupRunning = false;
  }
}

runScheduledCompanionCleanup();
const companionCleanupTimer = setInterval(
  runScheduledCompanionCleanup,
  COMPANION_CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000
);
companionCleanupTimer.unref();

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
