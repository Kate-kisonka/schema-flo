import express from "express";
import { isIsoDate, toSafeInt } from "../lib/validation.js";

export function createTrackingRouter({ auth, query }) {
  const router = express.Router();

  router.get("/cycle", auth, async (req, res) => {
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

  router.post("/cycle", auth, async (req, res) => {
    const { periodStartDate, cycleLength = null, notes = "" } = req.body;
    if (!periodStartDate) return res.status(400).json({ error: "periodStartDate обязателен" });
    if (!isIsoDate(periodStartDate)) {
      return res.status(400).json({ error: "periodStartDate должен быть в формате YYYY-MM-DD" });
    }

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

  router.get("/practices", auth, async (req, res) => {
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

  router.post("/practices", auth, async (req, res) => {
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

  router.get("/state", auth, async (req, res) => {
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

  router.put("/state", auth, async (req, res) => {
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
    const safeSilenceDays = silenceDays !== null && silenceDays !== undefined
      ? toSafeInt(silenceDays, 1, 365)
      : null;
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

  return router;
}
