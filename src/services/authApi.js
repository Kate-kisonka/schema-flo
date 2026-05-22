const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

export function register(email, password) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }).then(({ accessToken, user }) => ({ token: accessToken, user }));
  // Нормализуем accessToken → token, чтобы useAuth.js не менять
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
