export const LEGACY_IMPORT_SOURCE = "schema-flo-legacy-local-storage";

const BACKUP_DIARY_CONFLICT = `ON CONFLICT (user_id, entry_date) DO UPDATE SET
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
  updated_at = now()`;

const BACKUP_CYCLE_CONFLICT = `ON CONFLICT (user_id, period_start_date) DO UPDATE SET
  cycle_length = EXCLUDED.cycle_length,
  notes = EXCLUDED.notes`;

const SILENCE_CONFLICT_TARGET = `ON CONFLICT (user_id, ((logged_at at time zone 'UTC')::date))
  WHERE practice_type = 'silence'`;

export function getImportConflictPolicy(source) {
  const isLegacyMigration = source === LEGACY_IMPORT_SOURCE;
  return {
    isLegacyMigration,
    diaryConflictClause: isLegacyMigration
      ? "ON CONFLICT (user_id, entry_date) DO NOTHING"
      : BACKUP_DIARY_CONFLICT,
    cycleConflictClause: isLegacyMigration
      ? "ON CONFLICT (user_id, period_start_date) DO NOTHING"
      : BACKUP_CYCLE_CONFLICT,
    practiceConflictClause: isLegacyMigration
      ? `${SILENCE_CONFLICT_TARGET} DO NOTHING`
      : `${SILENCE_CONFLICT_TARGET} DO UPDATE SET metadata = EXCLUDED.metadata`,
  };
}
