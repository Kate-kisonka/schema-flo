import Dexie from "dexie";

export const db = new Dexie("schema-flo");
db.version(1).stores({
  diary_logs: "date, cycleDay, phase",
  period_history: "++id, date",
  cycle_state: "id",
  silence_state: "id",
  silence_logs: "date",
  ai_sessions: "id, date",
});

// Diary logs operations
export const dbDiary = {
  getAll: () => db.diary_logs.toArray(),
  getByDate: (date) => db.diary_logs.get(date),
  upsert: (entry) => db.diary_logs.put(entry),
  delete: (date) => db.diary_logs.delete(date),
};

// Cycle state operations (single document)
export const dbCycle = {
  get: () => db.cycle_state.get(1),
  save: (data) =>
    db.cycle_state.put({
      id: 1,
      cycleDay: data.cycleDay,
      periodStartDate: data.periodStartDate,
      periodActive: data.periodActive,
      periodHistory: data.periodHistory,
    }),
};

// Period history operations
export const dbPeriod = {
  getAll: () => db.period_history.toArray(),
  add: (entry) => db.period_history.add(entry),
  update: (id, data) => db.period_history.update(id, data),
};

// Silence state operations (single document)
export const dbSilence = {
  get: () => db.silence_state.get(1),
  save: (data) =>
    db.silence_state.put({
      id: 1,
      silenceActive: data.silenceActive,
      silenceStartDate: data.silenceStartDate,
      silenceDays: data.silenceDays,
    }),
};

// Silence logs operations
export const dbSilenceLogs = {
  getAll: () => db.silence_logs.toArray(),
  getByDate: (date) => db.silence_logs.get(date),
  upsert: (entry) => db.silence_logs.put(entry),
};

// AI sessions operations
export const dbAISessions = {
  getAll: () => db.ai_sessions.toArray(),
  getById: (id) => db.ai_sessions.get(id),
  upsert: (session) => db.ai_sessions.put(session),
  delete: (id) => db.ai_sessions.delete(id),
};
