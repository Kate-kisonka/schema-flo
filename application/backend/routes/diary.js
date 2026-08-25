import express from "express";
import { isIsoDate, isUuid, toSafeInt } from "../lib/validation.js";

const DIARY_SELECT = `id, entry_date, mood_ids, active_schema_ids, intensity, notes,
  cycle_day, phase_key, symptoms, discharge, digestion, libido, symptom_notes,
  completed_exercise_ids, created_at, updated_at`;

const DIARY_TEXT_FIELDS = ["notes", "phaseKey", "discharge", "digestion", "libido", "symptomNotes"];

function parseJsonArray(value) {
  return Array.isArray(value) ? value : [];
}

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
  const safeIntensity = body.intensity !== undefined && body.intensity !== null
    ? toSafeInt(body.intensity, 1, 10)
    : undefined;

  return {
    moodIds: body.moodIds !== undefined ? JSON.stringify(parseJsonArray(body.moodIds)) : undefined,
    activeSchemaIds: body.activeSchemaIds !== undefined
      ? JSON.stringify(parseJsonArray(body.activeSchemaIds))
      : undefined,
    intensity: safeIntensity,
    notes: body.notes,
    cycleDay: body.cycleDay,
    phaseKey: body.phaseKey,
    symptoms: body.symptoms !== undefined ? JSON.stringify(parseJsonArray(body.symptoms)) : undefined,
    discharge: body.discharge,
    digestion: body.digestion,
    libido: body.libido,
    symptomNotes: body.symptomNotes,
    completedExerciseIds: body.completedExerciseIds !== undefined
      ? JSON.stringify(parseJsonArray(body.completedExerciseIds))
      : undefined,
  };
}

export function createDiaryRouter({ auth, query }) {
  const router = express.Router();

  router.get("/", auth, async (req, res) => {
    if (req.query.limit !== undefined && !Number.isFinite(Number(req.query.limit))) {
      return res.status(400).json({ error: "limit должен быть числом" });
    }
    if (req.query.offset !== undefined && !Number.isFinite(Number(req.query.offset))) {
      return res.status(400).json({ error: "offset должен быть числом" });
    }
    const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 500);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const date = req.query.date;

    try {
      // Фильтр по конкретной дате — нужен для эффективного upsert без N+1
      const result = date && isIsoDate(date)
        ? await query(
          `SELECT ${DIARY_SELECT} FROM diary_entries WHERE user_id = $1 AND entry_date = $2`,
          [req.user.id, date]
        )
        : await query(
          `SELECT ${DIARY_SELECT} FROM diary_entries WHERE user_id = $1 ORDER BY entry_date DESC LIMIT $2 OFFSET $3`,
          [req.user.id, limit, offset]
        );
      res.json({ items: result.rows });
    } catch (err) {
      console.error("diary GET error:", err.message);
      res.status(500).json({ error: "Не удалось загрузить записи" });
    }
  });

  router.post("/", auth, async (req, res) => {
    const { entryDate } = req.body;
    if (entryDate && !isIsoDate(entryDate)) {
      return res.status(400).json({ error: "entryDate должен быть в формате YYYY-MM-DD" });
    }
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

  router.patch("/:id", auth, async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: "Некорректный id записи" });
    const { entryDate } = req.body;
    if (entryDate && !isIsoDate(entryDate)) {
      return res.status(400).json({ error: "entryDate должен быть в формате YYYY-MM-DD" });
    }

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
          id,
          req.user.id,
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

  router.delete("/:id", auth, async (req, res) => {
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

  return router;
}
