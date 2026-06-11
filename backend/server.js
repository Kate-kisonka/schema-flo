import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, query } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,https://schema-flo.vercel.app")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

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

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email и пароль обязательны" });
  if (password.length < 8) return res.status(400).json({ error: "Пароль должен быть минимум 8 символов" });
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
app.post("/api/auth/login", async (req, res) => {
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
  const { entryDate } = req.body;
  if (entryDate && !isIsoDate(entryDate)) return res.status(400).json({ error: "entryDate должен быть в формате YYYY-MM-DD" });

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
  try {
    const result = await query(
      `INSERT INTO cycle_entries (user_id, period_start_date, cycle_length, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, period_start_date) DO UPDATE SET
         cycle_length = EXCLUDED.cycle_length,
         notes = EXCLUDED.notes
       RETURNING *`,
      [req.user.id, periodStartDate, cycleLength, notes]
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
      [req.user.id, cycleDay, periodStartDate, periodActive, silenceActive, silenceStartDate, silenceDays]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("state PUT error:", err.message);
    res.status(500).json({ error: "Не удалось сохранить состояние" });
  }
});

// ─── Импорт локальных данных (одноразовая миграция с localStorage/Dexie) ──────

app.post("/api/import/local", auth, async (req, res) => {
  const { diary = [], periodHistory = [], silenceLogs = [] } = req.body;
  if (!Array.isArray(diary) || !Array.isArray(periodHistory) || !Array.isArray(silenceLogs)) {
    return res.status(400).json({ error: "diary, periodHistory и silenceLogs должны быть массивами" });
  }
  const client = await pool.connect();
  try {
    await client.query("begin");

    let diaryCount = 0;
    for (const item of diary) {
      await client.query(
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
           updated_at = now()`,
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
      diaryCount += 1;
    }

    let cycleCount = 0;
    for (const item of periodHistory) {
      if (!item.date) continue;
      await client.query(
        `INSERT INTO cycle_entries (user_id, period_start_date, cycle_length, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, period_start_date) DO UPDATE SET
           cycle_length = EXCLUDED.cycle_length,
           notes = EXCLUDED.notes`,
        [req.user.id, item.date, item.cycleLength ?? null, item.flowIntensity ?? ""]
      );
      cycleCount += 1;
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
      await client.query(
        `INSERT INTO practice_logs (user_id, practice_type, duration_sec, logged_at, metadata)
         VALUES ($1, 'silence', NULL, COALESCE($2::timestamptz, now()), $3::jsonb)
         ON CONFLICT (user_id, ((logged_at at time zone 'UTC')::date))
         WHERE practice_type = 'silence'
         DO UPDATE SET metadata = EXCLUDED.metadata`,
        [req.user.id, item.date ? `${item.date}T00:00:00Z` : null, JSON.stringify(metadata)]
      );
      practiceCount += 1;
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

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
