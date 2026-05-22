const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

function toDiaryClient(item) {
  return {
    id: item.id,
    date: item.entry_date,
    moods: item.mood_ids || [],
    schemas: item.active_schema_ids || [],
    intensity: item.intensity,
    notes: item.notes || "",
    cycleDay: item.cycle_day,
    phase: item.phase_key,
  };
}

export const dbDiary = {
  async getAll() {
    const data = await api("/api/diary?limit=500&offset=0");
    return (data.items || []).map(toDiaryClient);
  },

  // Используем GET /api/diary?date=... вместо загрузки всех записей (фикс N+1)
  async upsert(entry) {
    const data = await api(`/api/diary?date=${encodeURIComponent(entry.date)}`);
    const existing = (data.items || [])[0];

    const payload = {
      entryDate: entry.date,
      moodIds: entry.moods || [],
      activeSchemaIds: entry.schemas || [],
      intensity: entry.intensity ?? null,
      notes: entry.notes || "",
      cycleDay: entry.cycleDay ?? null,
      phaseKey: entry.phase || null,
    };

    if (existing?.id) {
      return api(`/api/diary/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    }
    return api("/api/diary", { method: "POST", body: JSON.stringify(payload) });
  },
};

export const dbCycle = {
  async get() {
    const [state, history] = await Promise.all([
      api("/api/state").catch(() => null),
      api("/api/cycle").catch(() => ({ items: [] })),
    ]);
    return {
      cycleDay: state?.cycle_day ?? 14,
      periodStartDate: state?.period_start_date ?? null,
      periodActive: state?.period_active ?? false,
      periodHistory: (history.items || []).map((x) => ({
        date: x.period_start_date,
        cycleLength: x.cycle_length,
        flowIntensity: x.notes || "",
      })),
    };
  },

  // Фикс: не затираем silence-данные — читаем текущее состояние перед записью
  async save(cycleState) {
    const existing = await api("/api/state").catch(() => null);
    return api("/api/state", {
      method: "PUT",
      body: JSON.stringify({
        cycleDay: cycleState.cycleDay ?? null,
        periodStartDate: cycleState.periodStartDate ?? null,
        periodActive: !!cycleState.periodActive,
        // Сохраняем silence-данные как были
        silenceActive: existing?.silence_active ?? false,
        silenceStartDate: existing?.silence_start_date ?? null,
        silenceDays: existing?.silence_days ?? 14,
      }),
    });
  },
};

export const dbPeriod = {
  async add(entry) {
    return api("/api/cycle", {
      method: "POST",
      body: JSON.stringify({
        periodStartDate: entry.date,
        cycleLength: entry.cycleLength ?? null,
        notes: entry.flowIntensity || "",
      }),
    });
  },
};

export const dbSilence = {
  async get() {
    const state = await api("/api/state").catch(() => null);
    return {
      silenceActive: state?.silence_active ?? false,
      silenceStartDate: state?.silence_start_date ?? null,
      silenceDays: state?.silence_days ?? 14,
    };
  },

  // Фикс: не затираем cycle-данные — читаем текущее состояние перед записью
  async save(silenceState) {
    const existing = await api("/api/state").catch(() => null);
    return api("/api/state", {
      method: "PUT",
      body: JSON.stringify({
        // Сохраняем cycle-данные как были
        cycleDay: existing?.cycle_day ?? null,
        periodStartDate: existing?.period_start_date ?? null,
        periodActive: existing?.period_active ?? false,
        silenceActive: !!silenceState.silenceActive,
        silenceStartDate: silenceState.silenceStartDate ?? null,
        silenceDays: silenceState.silenceDays ?? 14,
      }),
    });
  },
};

export const dbSilenceLogs = {
  async getAll() {
    const data = await api("/api/practices").catch(() => ({ items: [] }));
    return (data.items || [])
      .filter((x) => x.practice_type === "silence")
      .map((x) => ({
        date: new Date(x.logged_at).toISOString().slice(0, 10),
        // Поля ниже не хранятся в БД — заглушки для совместимости с UI
        dayNum: null,
        needsChecked: [],
        morningNote: "",
        goodDone: "",
        goodTomorrow: "",
      }));
  },

  async upsert(entry) {
    return api("/api/practices", {
      method: "POST",
      body: JSON.stringify({ practiceType: "silence", loggedAt: `${entry.date}T00:00:00Z` }),
    });
  },
};

// AI-сессии больше не используются, оставлены для совместимости с migrate.js
export const dbAISessions = {
  async getAll() { return []; },
  async upsert(session) { return session; },
};
