import { useState, useEffect } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  getMe
} from "../services/authApi";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

function saveAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function consumeOAuthRedirect() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#auth=")) return null;

  const authParams = new URLSearchParams(decodeURIComponent(hash.slice("#auth=".length)));
  const token = authParams.get("token");
  const userRaw = authParams.get("user");
  if (!token || !userRaw) return null;

  const user = JSON.parse(userRaw);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  return { token, user };
}

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const oauthSession = consumeOAuthRedirect();
    if (oauthSession) {
      saveAuthSession(oauthSession.token, oauthSession.user);
      setUser(oauthSession.user);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    getMe(token)
      .then(({ user }) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setUser(user);
      })
      .catch(() => clearAuthSession())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    setError(null);
    const { token, user } = await apiLogin(email, password);
    saveAuthSession(token, user);
    setUser(user);
  };

  const register = async (email, password) => {
    setError(null);
    const { token, user } = await apiRegister(email, password);
    saveAuthSession(token, user);
    setUser(user);
  };

  const logout = () => {
    clearAuthSession();
    setUser(null);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return { user, loading, error, setError, login, register, logout, getToken };
}
