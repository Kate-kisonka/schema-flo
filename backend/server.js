import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool, query } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

const ALLOWED_ORIGINS = ["http://localhost:5173", "https://schema-flo.vercel.app"];
const CODE_TTL_MINUTES = 10;

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "2mb" }));

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function createVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashVerificationCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function sendVerificationEmail(email, code) {
  if (process.env.RESEND_API_KEY) {
    const from = process.env.EMAIL_FROM || "Schema Flo <noreply@schema-flo.app>";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Код входа в Schema Flo",
        text: `Ваш код подтверждения Schema Flo: ${code}. Он действует ${CODE_TTL_MINUTES} минут.`,
      }),
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(`Email provider failed: ${response.status} ${message}`);
    }
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[auth] verification code for ${email}: ${code}`);
    return;
  }

  throw new Error("Email provider is not configured");
}

async function saveAndSendVerificationCode(userId, email) {
  const code = createVerificationCode();
  await query(
    `INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' minutes')::interval)`,
    [userId, hashVerificationCode(code), CODE_TTL_MINUTES]
  );
  await sendVerificationEmail(email, code);
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

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "15m" });
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


app.get("/health", async (_req, res) => {
  try {
    await query("SELECT NOW()");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  if (password.length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });
  const normalizedEmail = normalizeEmail(email);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [normalizedEmail, passwordHash]
    );
    const user = result.rows[0];
    await saveAndSendVerificationCode(user.id, user.email);
    res.status(201).json({ user, verificationRequired: true });
  } catch (err) {
    if (err.code === "23505") {
      const existing = await query(
        "SELECT id, email, password_hash, email_verified_at FROM users WHERE lower(email) = $1",
        [normalizedEmail]
      );
      const user = existing.rows[0];
      if (user && !user.email_verified_at && await bcrypt.compare(password, user.password_hash)) {
        await saveAndSendVerificationCode(user.id, user.email);
        return res.json({ user: { id: user.id, email: user.email }, verificationRequired: true });
      }
      return res.status(409).json({ error: "Email already exists" });
    }
    console.error("[auth] registration failed", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/resend-code", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: "email is required" });

  try {
    const result = await query("SELECT id, email, email_verified_at FROM users WHERE lower(email) = $1", [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.email_verified_at) return res.status(409).json({ error: "Email already verified" });

    await saveAndSendVerificationCode(user.id, user.email);
    res.json({ verificationRequired: true });
  } catch (err) {
    console.error("[auth] resend code failed", err);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

app.post("/api/auth/verify-email", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ error: "email and 6-digit code are required" });

  const client = await pool.connect();
  try {
    await client.query("begin");
    const userResult = await client.query(
      "SELECT id, email FROM users WHERE lower(email) = $1 FOR UPDATE",
      [email]
    );
    const user = userResult.rows[0];
    if (!user) {
      await client.query("rollback");
      return res.status(404).json({ error: "User not found" });
    }

    const codeResult = await client.query(
      `SELECT id FROM email_verification_codes
       WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, hashVerificationCode(code)]
    );
    if (codeResult.rowCount === 0) {
      await client.query("rollback");
      return res.status(401).json({ error: "Invalid or expired code" });
    }

    await client.query("UPDATE email_verification_codes SET used_at = now() WHERE id = $1", [codeResult.rows[0].id]);
    await client.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1", [user.id]);
    await client.query("commit");

    res.json({ user: { id: user.id, email: user.email }, accessToken: signToken(user) });
  } catch (err) {
    await client.query("rollback");
    console.error("[auth] verify email failed", err);
    res.status(500).json({ error: "Email verification failed" });
  } finally {
    client.release();
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  const normalizedEmail = normalizeEmail(email);

  try {
    const result = await query("SELECT id, email, password_hash, email_verified_at FROM users WHERE lower(email) = $1", [normalizedEmail]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.email_verified_at) {
      await saveAndSendVerificationCode(user.id, user.email);
      return res.status(403).json({ error: "Email verification required", verificationRequired: true });
    }

    res.json({ user: { id: user.id, email: user.email }, accessToken: signToken(user) });
  } catch (err) {
    console.error("[auth] login failed", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/api/auth/me", auth, async (req, res) => {
  try {
    const result = await query("SELECT id, email, email_verified_at FROM users WHERE id = $1", [req.user.id]);
    const user = result.rows[0];
    if (!user || !user.email_verified_at) return res.status(401).json({ error: "Unauthorized" });
    res.json({ user: { id: user.id, email: user.email } });
  } catch {
    res.status(500).json({ error: "Failed to load user" });
  }
});

app.get("/api/diary", auth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  try {
    const result = await query(
      `SELECT id, entry_date, mood_ids, active_schema_ids, intensity, notes, cycle_day, phase_key, created_at, updated_at
       FROM diary_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({ items: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to load diary entries" });
  }
});

app.post("/api/diary", auth, async (req, res) => {
  const { entryDate, moodIds = [], activeSchemaIds = [], intensity = null, notes = "", cycleDay = null, phaseKey = null } = req.body;
  if (entryDate && !isIsoDate(entryDate)) return res.status(400).json({ error: "entryDate must be YYYY-MM-DD" });
  if (!Array.isArray(moodIds) || !Array.isArray(activeSchemaIds)) return res.status(400).json({ error: "moodIds and activeSchemaIds must be arrays" });
  const safeIntensity = toSafeInt(intensity, 1, 10);
  if (intensity !== null && safeIntensity === null) return res.status(400).json({ error: "intensity must be integer 1..10" });
  try {
    const result = await query(
      `INSERT INTO diary_entries (user_id, entry_date, mood_ids, active_schema_ids, intensity, notes, cycle_day, phase_key)
       VALUES ($1, COALESCE($2, current_date), $3::jsonb, $4::jsonb, $5, $6, $7, $8)
       RETURNING id, entry_date, mood_ids, active_schema_ids, intensity, notes, cycle_day, phase_key, created_at, updated_at`,
      [req.user.id, entryDate || null, JSON.stringify(moodIds), JSON.stringify(activeSchemaIds), safeIntensity, notes, cycleDay, phaseKey]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to create diary entry" });
  }
});

app.patch("/api/diary/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { moodIds, activeSchemaIds, intensity, notes, cycleDay, phaseKey, entryDate } = req.body;
  try {
    const result = await query(
      `UPDATE diary_entries
       SET entry_date = COALESCE($3, entry_date),
           mood_ids = COALESCE($4::jsonb, mood_ids),
           active_schema_ids = COALESCE($5::jsonb, active_schema_ids),
           intensity = COALESCE($6, intensity),
           notes = COALESCE($7, notes),
           cycle_day = COALESCE($8, cycle_day),
           phase_key = COALESCE($9, phase_key)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id, entryDate ?? null, moodIds ? JSON.stringify(moodIds) : null, activeSchemaIds ? JSON.stringify(activeSchemaIds) : null, intensity ?? null, notes ?? null, cycleDay ?? null, phaseKey ?? null]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Diary entry not found" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to update diary entry" });
  }
});

app.delete("/api/diary/:id", auth, async (req, res) => {
  try {
    const result = await query("DELETE FROM diary_entries WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "Diary entry not found" });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete diary entry" });
  }
});

app.get("/api/cycle", auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, period_start_date, cycle_length, notes, created_at
       FROM cycle_entries WHERE user_id = $1 ORDER BY period_start_date DESC`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to load cycle entries" });
  }
});

app.post("/api/cycle", auth, async (req, res) => {
  const { periodStartDate, cycleLength = null, notes = "" } = req.body;
  if (!periodStartDate) return res.status(400).json({ error: "periodStartDate is required" });
  if (!isIsoDate(periodStartDate)) return res.status(400).json({ error: "periodStartDate must be YYYY-MM-DD" });
  try {
    const result = await query(
      `INSERT INTO cycle_entries (user_id, period_start_date, cycle_length, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, periodStartDate, cycleLength, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to create cycle entry" });
  }
});

app.post("/api/practices", auth, async (req, res) => {
  const { practiceType, durationSec = null, loggedAt = null } = req.body;
  if (!practiceType) return res.status(400).json({ error: "practiceType is required" });
  try {
    const result = await query(
      `INSERT INTO practice_logs (user_id, practice_type, duration_sec, logged_at)
       VALUES ($1, $2, $3, COALESCE($4, now())) RETURNING *`,
      [req.user.id, practiceType, durationSec, loggedAt]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to create practice log" });
  }
});

app.get("/api/practices", auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, practice_type, duration_sec, logged_at FROM practice_logs WHERE user_id = $1 ORDER BY logged_at DESC`,
      [req.user.id]
    );
    res.json({ items: result.rows });
  } catch {
    res.status(500).json({ error: "Failed to load practice logs" });
  }
});

app.get("/api/state", auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT cycle_day, period_start_date, period_active, silence_active, silence_start_date, silence_days
       FROM user_states WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch {
    res.status(500).json({ error: "Failed to load state" });
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
      `INSERT INTO user_states (user_id, cycle_day, period_start_date, period_active, silence_active, silence_start_date, silence_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id)
       DO UPDATE SET cycle_day = EXCLUDED.cycle_day,
                     period_start_date = EXCLUDED.period_start_date,
                     period_active = EXCLUDED.period_active,
                     silence_active = EXCLUDED.silence_active,
                     silence_start_date = EXCLUDED.silence_start_date,
                     silence_days = EXCLUDED.silence_days
       RETURNING cycle_day, period_start_date, period_active, silence_active, silence_start_date, silence_days`,
      [req.user.id, cycleDay, periodStartDate, periodActive, silenceActive, silenceStartDate, silenceDays]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to save state" });
  }
});

app.post("/api/import/local", auth, async (req, res) => {
  const { diary = [], periodHistory = [], silenceLogs = [] } = req.body;
  if (!Array.isArray(diary) || !Array.isArray(periodHistory) || !Array.isArray(silenceLogs)) {
    return res.status(400).json({ error: "diary, periodHistory and silenceLogs must be arrays" });
  }
  const client = await pool.connect();
  try {
    await client.query("begin");

    let diaryCount = 0;
    for (const item of diary) {
      await client.query(
        `INSERT INTO diary_entries (user_id, entry_date, mood_ids, active_schema_ids, intensity, notes, cycle_day, phase_key)
         VALUES ($1, COALESCE($2, current_date), $3::jsonb, $4::jsonb, $5, $6, $7, $8)`,
        [req.user.id, item.date ?? null, JSON.stringify(item.moods ?? []), JSON.stringify(item.schemas ?? []), item.intensity ?? null, item.notes ?? "", item.cycleDay ?? null, item.phase ?? null]
      );
      diaryCount += 1;
    }

    let cycleCount = 0;
    for (const item of periodHistory) {
      await client.query(
        `INSERT INTO cycle_entries (user_id, period_start_date, cycle_length, notes)
         VALUES ($1, $2, $3, $4)`,
        [req.user.id, item.date, item.cycleLength ?? null, item.flowIntensity ?? ""]
      );
      cycleCount += 1;
    }

    let practiceCount = 0;
    for (const item of silenceLogs) {
      await client.query(
        `INSERT INTO practice_logs (user_id, practice_type, duration_sec, logged_at)
         VALUES ($1, 'silence', NULL, COALESCE($2::timestamptz, now()))`,
        [req.user.id, item.date ? `${item.date}T00:00:00Z` : null]
      );
      practiceCount += 1;
    }

    await client.query("commit");
    res.json({ imported: { diary: diaryCount, cycle: cycleCount, practices: practiceCount } });
  } catch {
    await client.query("rollback");
    res.status(500).json({ error: "Import failed" });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
