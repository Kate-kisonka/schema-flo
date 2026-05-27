const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem("accessToken") || "";
}

function saveSession(data) {
  localStorage.setItem(TOKEN_KEY, data.accessToken);
  localStorage.removeItem("accessToken");
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("accessToken");
  localStorage.removeItem(USER_KEY);
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
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    if (res.status === 401) clearSession();
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const authApi = {
  getStoredUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  isAuthenticated() {
    return Boolean(getToken());
  },
  async me() {
    const data = await api("/api/auth/me");
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  },
  async register(email, password) {
    return api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  async login(email, password) {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    return saveSession(data);
  },
  async verifyEmail(email, code) {
    const data = await api("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    return saveSession(data);
  },
  async resendCode(email) {
    return api("/api/auth/resend-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  logout() {
    clearSession();
  },
};

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
  async upsert(entry) {
    const all = await this.getAll();
    const existing = all.find((x) => x.date === entry.date);
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
      periodHistory: (history.items || []).map((x) => ({ date: x.period_start_date, cycleLength: x.cycle_length, flowIntensity: x.notes || "" })),
    };
  },
  async save(state) {
    return api("/api/state", {
      method: "PUT",
      body: JSON.stringify({
        cycleDay: state.cycleDay ?? null,
        periodStartDate: state.periodStartDate ?? null,
        periodActive: !!state.periodActive,
        silenceActive: false,
        silenceStartDate: null,
        silenceDays: 14,
      }),
    });
  },
};

export const dbPeriod = {
  async add(entry) {
    return api("/api/cycle", {
      method: "POST",
      body: JSON.stringify({ periodStartDate: entry.date, cycleLength: entry.cycleLength ?? null, notes: entry.flowIntensity || "" }),
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
  async save(state) {
    const existing = await api("/api/state").catch(() => null);
    return api("/api/state", {
      method: "PUT",
      body: JSON.stringify({
        cycleDay: existing?.cycle_day ?? 14,
        periodStartDate: existing?.period_start_date ?? null,
        periodActive: existing?.period_active ?? false,
        silenceActive: !!state.silenceActive,
        silenceStartDate: state.silenceStartDate ?? null,
        silenceDays: state.silenceDays ?? 14,
      }),
    });
  },
};

export const dbSilenceLogs = {
  async getAll() {
    const data = await api("/api/practices").catch(() => ({ items: [] }));
    return (data.items || [])
      .filter((x) => x.practice_type === "silence")
      .map((x) => ({ date: new Date(x.logged_at).toISOString().slice(0, 10), dayNum: null, needsChecked: [], morningNote: "", goodDone: "", goodTomorrow: "" }));
  },
  async upsert(entry) {
    return api("/api/practices", {
      method: "POST",
      body: JSON.stringify({ practiceType: "silence", loggedAt: `${entry.date}T00:00:00Z` }),
    });
  },
};

export const dbAISessions = {
  async getAll() { return []; },
  async upsert(session) { return session; },
};
