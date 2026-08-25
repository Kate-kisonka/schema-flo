const API = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "Ошибка сервера");
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function getGoogleAuthUrl() {
  return `${API}/api/auth/google`;
}

export function register(email, password) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(({ accessToken, user }) => ({ token: accessToken, user }));
}

export function login(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(({ accessToken, user }) => ({ token: accessToken, user }));
}

export function getMe(token) {
  return request("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}
