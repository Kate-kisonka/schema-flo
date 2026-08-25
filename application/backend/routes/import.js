import express from "express";
import { getImportConflictPolicy } from "../legacyImportPolicy.js";

export function createImportRouter({ auth, pool }) {
  const router = express.Router();

  router.post("/local", auth, async (req, res) => {
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

  return router;
}
