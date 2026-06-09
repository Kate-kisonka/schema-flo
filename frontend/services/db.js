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
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
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
    symptoms: item.symptoms || [],
    discharge: item.discharge ?? null,
    digestion: item.digestion ?? null,
    libido: item.libido ?? null,
    symptomNotes: item.symptom_notes || "",
    exercises: item.completed_exercise_ids || [],
  };
}

function toDiaryPayload(entry) {
  return {
    entryDate: entry.date,
    moodIds: entry.moods || [],
    activeSchemaIds: entry.schemas || [],
    intensity: entry.intensity ?? null,
    notes: entry.notes || "",
    cycleDay: entry.cycleDay ?? null,
    phaseKey: entry.phase || null,
    symptoms: entry.symptoms || [],
    discharge: entry.discharge ?? null,
    digestion: entry.digestion ?? null,
    libido: entry.libido ?? null,
    symptomNotes: entry.symptomNotes || "",
    completedExerciseIds: entry.exercises || [],
  };
}

export const dbDiary = {
  async getAll() {
    const data = await api("/api/diary?limit=500&offset=0");
    return (data.items || []).map(toDiaryClient);
  },

  async upsert(entry) {
    const data = await api(`/api/diary?date=${encodeURIComponent(entry.date)}`);
    const existing = (data.items || [])[0];
    const payload = toDiaryPayload(entry);

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

  async save(cycleState) {
    const existing = await api("/api/state").catch(() => null);
    return api("/api/state", {
      method: "PUT",
      body: JSON.stringify({
        cycleDay: cycleState.cycleDay ?? null,
        periodStartDate: cycleState.periodStartDate ?? null,
        periodActive: !!cycleState.periodActive,
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

  async save(silenceState) {
    const existing = await api("/api/state").catch(() => null);
    return api("/api/state", {
      method: "PUT",
      body: JSON.stringify({
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

function toSilenceClient(item) {
  const meta = item.metadata || {};
  return {
    date: new Date(item.logged_at).toISOString().slice(0, 10),
    dayNum: meta.dayNum ?? null,
    needsChecked: meta.needsChecked || [],
    morningNote: meta.morningNote || "",
    goodDone: meta.goodDone || "",
    goodTomorrow: meta.goodTomorrow || "",
  };
}

export const dbSilenceLogs = {
  async getAll() {
    const data = await api("/api/practices").catch(() => ({ items: [] }));
    return (data.items || [])
      .filter((x) => x.practice_type === "silence")
      .map(toSilenceClient);
  },

  async upsert(entry) {
    return api("/api/practices", {
      method: "POST",
      body: JSON.stringify({
        practiceType: "silence",
        loggedAt: `${entry.date}T00:00:00Z`,
        metadata: {
          dayNum: entry.dayNum ?? null,
          needsChecked: entry.needsChecked || [],
          morningNote: entry.morningNote || "",
          goodDone: entry.goodDone || "",
          goodTomorrow: entry.goodTomorrow || "",
        },
      }),
    });
  },
};

export async function importBackup({ logs = [], periodHistory = [], silenceLogs = [] }) {
  return api("/api/import/local", {
    method: "POST",
    body: JSON.stringify({ diary: logs, periodHistory, silenceLogs }),
  });
}
