import React, { useState } from "react";
import { T } from "../constants/theme";
import { authApi } from "../services/db";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${T.border2}`,
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 15,
  background: T.card,
  color: T.text,
  outline: "none",
};

const buttonStyle = {
  width: "100%",
  border: 0,
  borderRadius: 8,
  padding: "12px 14px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const submitCredentials = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isRegister) {
        await authApi.register(email, password);
        setStep("verify");
        setMessage("Мы отправили 6-значный код на почту. Введите его, чтобы завершить регистрацию.");
      } else {
        const user = await authApi.login(email, password);
        onAuthenticated(user);
      }
    } catch (err) {
      if (err.data?.verificationRequired) {
        setStep("verify");
        setMessage("Почта ещё не подтверждена. Мы отправили новый код.");
      } else {
        setError(err.message || "Не удалось выполнить действие.");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const user = await authApi.verifyEmail(email, code);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message || "Код не подошёл или устарел.");
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      await authApi.resendCode(email);
      setMessage("Новый код отправлен.");
    } catch (err) {
      setError(err.message || "Не удалось отправить код повторно.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setStep("credentials");
    setCode("");
    setError("");
    setMessage("");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font, display: "grid", placeItems: "center", padding: 20 }}>
      <main style={{ width: "100%", maxWidth: 390 }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0 }}>Schema Flo</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 30, lineHeight: 1.1 }}>{step === "verify" ? "Подтвердите почту" : isRegister ? "Создать аккаунт" : "Войти"}</h1>
        </div>

        <form onSubmit={step === "verify" ? submitCode : submitCredentials} style={{ display: "grid", gap: 12 }}>
          <input
            style={fieldStyle}
            type="email"
            autoComplete="email"
            placeholder="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={step === "verify" || loading}
            required
          />

          {step === "credentials" ? (
            <input
              style={fieldStyle}
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="пароль"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              disabled={loading}
              required
            />
          ) : (
            <input
              style={{ ...fieldStyle, textAlign: "center", fontSize: 22, letterSpacing: 0 }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              minLength={6}
              maxLength={6}
              disabled={loading}
              required
            />
          )}

          {error && <div style={{ color: T.red, fontSize: 13, lineHeight: 1.45 }}>{error}</div>}
          {message && <div style={{ color: T.sub, fontSize: 13, lineHeight: 1.45 }}>{message}</div>}

          <button
            style={{ ...buttonStyle, background: T.accent, color: "#fff", opacity: loading ? 0.7 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? "Подождите..." : step === "verify" ? "Подтвердить" : isRegister ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          {step === "verify" ? (
            <>
              <button type="button" onClick={() => setStep("credentials")} style={{ border: 0, background: "transparent", color: T.muted, cursor: "pointer", padding: 0 }}>
                Изменить email
              </button>
              <button type="button" onClick={resendCode} disabled={loading} style={{ border: 0, background: "transparent", color: T.accent, cursor: "pointer", padding: 0, fontWeight: 700 }}>
                Отправить ещё раз
              </button>
            </>
          ) : (
            <button type="button" onClick={switchMode} style={{ border: 0, background: "transparent", color: T.accent, cursor: "pointer", padding: 0, fontWeight: 700 }}>
              {isRegister ? "Уже есть аккаунт" : "Создать аккаунт"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
