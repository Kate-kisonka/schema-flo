import React, { useState } from "react";
import { T } from "../constants/theme";
import { getGoogleAuthUrl } from "../services/authApi";

export default function LoginScreen({ onLogin, onVerifyEmail, onResendCode, onGoRegister, error, setError }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode]         = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      if (err.data?.verificationRequired) {
        setNeedsCode(true);
        setError("Введите код подтверждения из письма");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onVerifyEmail(email.trim(), code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setLoading(true);
    try {
      await onResendCode(email.trim());
      setError("Новый код отправлен");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: T.bg, fontFamily: T.font,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌙</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>
            Schema Flow
          </h1>
          <p style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>
            Войди в свой аккаунт
          </p>
        </div>

        <form onSubmit={needsCode ? handleVerify : handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={needsCode}
            required
            style={inputStyle}
          />
          {needsCode ? (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Код из письма"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              minLength={6}
              maxLength={6}
              style={inputStyle}
            />
          ) : (
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
          )}

          {error && (
            <p style={{ color: T.red, fontSize: 13, margin: 0, textAlign: "center" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...btnStyle,
              background: loading ? T.muted : T.accent,
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Подождите…" : needsCode ? "Подтвердить email" : "Войти"}
          </button>
        </form>

        {needsCode && (
          <button onClick={handleResend} disabled={loading} style={{ ...linkStyle, display: "block", margin: "14px auto 0" }}>
            Отправить код ещё раз
          </button>
        )}

        {!needsCode && (
          <button onClick={() => { window.location.href = getGoogleAuthUrl(); }} style={{ ...btnStyle, background: T.text, marginTop: 12 }}>
            Войти через Google
          </button>
        )}

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: T.muted }}>
          Нет аккаунта?{" "}
          <button onClick={onGoRegister} style={linkStyle}>
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", fontSize: 15,
  border: `1px solid ${T.border2}`, borderRadius: 10,
  background: T.card, color: T.text, fontFamily: T.font,
  outline: "none", boxSizing: "border-box",
};

const btnStyle = {
  width: "100%", padding: "13px", fontSize: 15, fontWeight: 600,
  color: "#fff", border: "none", borderRadius: 10, fontFamily: T.font,
  transition: "background 0.2s",
};

const linkStyle = {
  background: "none", border: "none", color: T.accent,
  fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: T.font,
  padding: 0,
};
