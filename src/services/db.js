import Dexie from "dexie";

const db = new Dexie("schema_flo");

db.version(1).stores({
  diary:      "date",        // ключ — дата "YYYY-MM-DD"
  cycle:      "id",          // одна запись с id=1
  period:     "++id, date",  // история менструаций
  silence:    "id",          // одна запись с id=1
  silenceLogs:"date",        // ключ — дата
  aiSessions: "id",          // AI-сессии (не используются, оставлены для migrate.js)
});

// --- Дневник ---
export const dbDiary = {
  getAll: () => db.diary.toArray(),
  upsert: (entry) => db.diary.put(entry),
};

// --- Цикл ---
export const dbCycle = {
  get:  () => db.cycle.get(1),
  save: (state) => db.cycle.put({ id: 1, ...state }),
};

// --- История периодов ---
export const dbPeriod = {
  getAll: () => db.period.toArray(),
  add:    (entry) => db.period.add(entry),
};

// --- Практика тишины ---
export const dbSilence = {
  get:  () => db.silence.get(1),
  save: (state) => db.silence.put({ id: 1, ...state }),
};

// --- Логи практики тишины ---
export const dbSilenceLogs = {
  getAll: () => db.silenceLogs.toArray(),
  upsert: (entry) => db.silenceLogs.put(entry),
};

// --- AI-сессии (не активны, нужны для совместимости migrate.js) ---
export const dbAISessions = {
  upsert: (session) => db.aiSessions.put(session),
};
