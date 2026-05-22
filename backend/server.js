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

const ALLOWED_ORIGINS = ["http://localhost:5173", "https://schema-flo.vercel.app"];

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: "2mb" }));

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

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.toLowerCase().trim(), passwordHash]
    );
    const user = result.rows[0];
    res.status(201).json({ user, accessToken: signToken(user) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  try {
    const result = await query("SELECT id, email, password_hash FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    res.json({ user: { id: user.id, email: user.email }, accessToken: signToken(user) });
  } catch {
    res.status(500).json({ error: "Login failed" });
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
