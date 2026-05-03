import { dbDiary, dbCycle, dbPeriod, dbSilence, dbSilenceLogs, dbAISessions } from "./db";

// Helper to safely load from localStorage
function loadFromLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export async function migrateFromLocalStorage() {
  const migrated = localStorage.getItem("idb_migrated");
  if (migrated) return; // Already migrated

  // Migrate diary logs
  const logs = loadFromLS("schema_logs", []);
  if (logs.length > 0) {
    for (const log of logs) {
      await dbDiary.upsert(log);
    }
  }

  // Migrate cycle state
  const cycleDay = loadFromLS("cycleDay", 14);
  const periodStartDate = loadFromLS("period_start_date", null);
  const periodActive = loadFromLS("period_active", false);
  const periodHistory = loadFromLS("period_history", []);

  await dbCycle.save({
    cycleDay,
    periodStartDate,
    periodActive,
    periodHistory,
  });

  // Migrate period history
  if (periodHistory.length > 0) {
    for (const entry of periodHistory) {
      await dbPeriod.add(entry);
    }
  }

  // Migrate silence state
  const silenceActive = loadFromLS("silence_active", false);
  const silenceStartDate = loadFromLS("silence_start_date", null);
  const silenceDays = loadFromLS("silence_days", 14);

  await dbSilence.save({
    silenceActive,
    silenceStartDate,
    silenceDays,
  });

  // Migrate silence logs
  const silenceLogs = loadFromLS("silence_logs", []);
  if (silenceLogs.length > 0) {
    for (const log of silenceLogs) {
      await dbSilenceLogs.upsert(log);
    }
  }

  // Migrate AI sessions
  const aiSessions = loadFromLS("ai_sessions", []);
  if (aiSessions.length > 0) {
    for (const session of aiSessions) {
      await dbAISessions.upsert(session);
    }
  }

  // Mark migration as complete
  localStorage.setItem("idb_migrated", "1");
}
