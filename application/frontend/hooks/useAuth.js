import { useState, useEffect } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  getMe
} from "../services/authApi.js";

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

function readOAuthRedirect() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#auth=")) return null;

  const authParams = new URLSearchParams(decodeURIComponent(hash.slice("#auth=".length)));
  const token = authParams.get("token");
  const userRaw = authParams.get("user");
  if (!token || !userRaw) return null;

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }
  return { token, user };
}

function initializeAuthState() {
  if (typeof window === "undefined") {
    return { user: null, loading: false, tokenToValidate: null, oauthSession: null };
  }

  const oauthSession = readOAuthRedirect();
  if (oauthSession) {
    return { user: oauthSession.user, loading: false, tokenToValidate: null, oauthSession };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  return { user: null, loading: Boolean(token), tokenToValidate: token, oauthSession: null };
}

export function useAuth() {
  const [initialAuth] = useState(initializeAuthState);
  const [user, setUser]       = useState(initialAuth.user);
  const [loading, setLoading] = useState(initialAuth.loading);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (initialAuth.oauthSession) {
      saveAuthSession(initialAuth.oauthSession.token, initialAuth.oauthSession.user);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }

    const token = initialAuth.tokenToValidate;
    if (!token) return;

    getMe(token)
      .then(({ user }) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        setUser(user);
      })
      .catch(() => clearAuthSession())
      .finally(() => setLoading(false));
  }, [initialAuth]);

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
