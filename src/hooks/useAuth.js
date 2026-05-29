import { useState, useEffect } from "react";
import { login as apiLogin, register as apiRegister, getMe } from "../services/authApi";

const TOKEN_KEY = "auth_token";

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // При загрузке — проверяем сохранённый токен через /api/auth/me
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    getMe(token)
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem(TOKEN_KEY)) // токен протух — удаляем
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    setError(null);
    // authApi нормализует { accessToken } → { token }
    const { token, user } = await apiLogin(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
  };

  const register = async (email, password) => {
    setError(null);
    const { token, user } = await apiRegister(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return { user, loading, error, setError, login, register, logout, getToken };
}
