import React, { useState, useEffect } from "react";
import { T, wash } from "./constants/theme.js";
import { getTodayKey } from "./utils.js";
import {
  importConfirmedLegacyData,
  inspectLegacyMigration,
  skipLegacyImport,
} from "./services/migrate.js";
import { useCycle } from "./hooks/useCycle.js";
import { useDiary } from "./hooks/useDiary.js";
import { useSilence } from "./hooks/useSilence.js";
import { useHistory } from "./hooks/useHistory.js";
import { useAuth } from "./hooks/useAuth.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import NavBar from "./components/NavBar.jsx";
import SchemaPopup from "./components/SchemaPopup.jsx";
import PrivacyCover from "./components/PrivacyCover.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PracticesScreen from "./screens/PracticesScreen.jsx";
import HistoryScreen from "./screens/HistoryScreen.jsx";
import LogDetailScreen from "./screens/LogDetailScreen.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import RegisterScreen from "./screens/RegisterScreen.jsx";
import WelcomeScreen from "./screens/WelcomeScreen.jsx";
import FirstRunScreen from "./screens/FirstRunScreen.jsx";

// Монтируется только после авторизации (см. key={user.id} ниже):
// хуки данных стартуют уже с токеном, а при выходе или смене
// пользователя размонтируются — чужие данные не остаются в памяти
const firstRunKey = (userId) => `sf-first-run:${userId}`;
const authErrorMessages = {
  missing_google_code: "Google не вернул код авторизации. Попробуйте снова.",
  google_auth_failed: "Не удалось войти через Google. Попробуйте позже.",
};

function readInitialAuthState() {
  const authError = new URLSearchParams(window.location.search).get("authError");
  return {
    authError,
    screen: authError ? "login" : "welcome",
    notice: authError ? authErrorMessages[authError] || "Ошибка входа через Google" : null,
  };
}

function BlockingError({ title, message, onRetry, onLogout }) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      // The parent keeps the blocking error visible until a retry succeeds.
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420, background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius?.md || 20, padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 10px" }}>{title}</h1>
        <p style={{ color: T.sub, lineHeight: 1.55, margin: "0 0 20px" }}>{message}</p>
        <button type="button" onClick={handleRetry} disabled={retrying} style={{ width: "100%", minHeight: 46, border: "none", borderRadius: 12, background: T.accent, color: T.onAccent || "#fff", fontFamily: T.font, fontWeight: 700, cursor: retrying ? "wait" : "pointer" }}>
          {retrying ? "Повторяем..." : "Попробовать снова"}
        </button>
        {onLogout && (
          <button type="button" onClick={onLogout} style={{ marginTop: 10, border: "none", background: "transparent", color: T.sub, fontFamily: T.font, cursor: "pointer" }}>
            Выйти из аккаунта
          </button>
        )}
      </div>
    </div>
  );
}

function MigrationDecision({ user, state, working, onImport, onSkip, onLogout }) {
  const identity = user.email || `ID ${user.id}`;
  const summary = state.summary || {};
  const ownerMismatch = state.status === "owner-mismatch";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: T.font, display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480, background: T.card, border: `1px solid ${T.border}`, borderRadius: T.radius?.md || 20, padding: 24 }}>
        <h1 style={{ fontSize: 22, margin: "0 0 10px" }}>
          {ownerMismatch ? "Локальные данные принадлежат другому аккаунту" : "Чьи это локальные данные?"}
        </h1>
        <p style={{ color: T.sub, lineHeight: 1.55, margin: "0 0 16px" }}>
          {ownerMismatch
            ? "Эти записи уже были закреплены за другим аккаунтом. Импортировать их в текущий аккаунт нельзя."
            : "На этом устройстве найдены записи старой версии Schema Flo. Они ещё не связаны с аккаунтом и не будут импортированы без твоего подтверждения."}
        </p>
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Текущий аккаунт</div>
          <div style={{ fontWeight: 700, overflowWrap: "anywhere" }}>{identity}</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>ID: {user.id}</div>
        </div>
        {!ownerMismatch && (
          <div style={{ color: T.sub, fontSize: 14, lineHeight: 1.5, margin: "0 0 18px" }}>
            <p style={{ margin: 0 }}>
              Найдено: дней — {summary.diary || 0}, циклов — {summary.cycles || 0}, практик — {summary.practices || 0}
              {summary.hasLegacyDraft ? ", а также старый черновик" : ""}.
            </p>
            {summary.hasCorruptData && (
              <p style={{ color: T.red, margin: "8px 0 0" }}>Часть локальных данных повреждена. Их нельзя импортировать, но можно безопасно удалить кнопкой «Не импортировать».</p>
            )}
          </div>
        )}
        {!ownerMismatch && !summary.hasCorruptData && (
          <button type="button" onClick={onImport} disabled={working} style={{ width: "100%", minHeight: 48, border: "none", borderRadius: 12, background: T.accent, color: T.onAccent || "#fff", fontFamily: T.font, fontWeight: 700, cursor: working ? "wait" : "pointer" }}>
            {working ? "Импортируем..." : "Это мои данные — импортировать"}
          </button>
        )}
        <button type="button" onClick={onSkip} disabled={working} style={{ width: "100%", minHeight: 46, marginTop: 10, border: `1px solid ${T.border}`, borderRadius: 12, background: T.card, color: T.sub, fontFamily: T.font, fontWeight: 600, cursor: working ? "wait" : "pointer" }}>
          {ownerMismatch ? "Продолжить без импорта" : "Не импортировать"}
        </button>
        <button type="button" onClick={onLogout} disabled={working} style={{ width: "100%", marginTop: 12, border: "none", background: "transparent", color: T.muted, fontFamily: T.font, cursor: working ? "wait" : "pointer" }}>
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
}

function MainApp({ user, onLogout }) {
  const [screen, setScreen] = useState("home");
  const [selectedLog, setSelectedLog] = useState(null);
  const [schemaPopup, setSchemaPopup] = useState(null);
  const [privacyCovered, setPrivacyCovered] = useState(false);
  const [firstRunDismissed, setFirstRunDismissed] = useState(() => {
    try {
      return localStorage.getItem(firstRunKey(user.id)) === "done";
    } catch {
      return false;
    }
  });

  const cycle = useCycle();
  const diary = useDiary(user.id);
  const silence = useSilence();
  const history = useHistory(diary.logs);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") setPrivacyCovered(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleNavigate = (id) => {
    setScreen(id);
    setSelectedLog(null);
    if (id === "home") {
      const todayLog = diary.logs.find(l => l.date === getTodayKey());
      if (todayLog) diary.setDiaryStep(4);
    }
  };

  const finishFirstRun = () => {
    try {
      localStorage.setItem(firstRunKey(user.id), "done");
    } catch {
      // The current session can continue even when persistence is unavailable.
    }
    setFirstRunDismissed(true);
    setScreen("home");
    setSelectedLog(null);
    diary.setDiaryStep(0);
  };

  if (!diary.loaded) return <LoadingScreen />;

  if (diary.loadError) {
    return (
      <BlockingError
        title="Не удалось загрузить дневник"
        message="Мы не показываем пустой дневник, пока не убедимся, что записи загружены. Проверь соединение и попробуй снова."
        onRetry={diary.reloadLogs}
        onLogout={onLogout}
      />
    );
  }

  const showFirstRun = diary.logs.length === 0 && !firstRunDismissed;

  if (showFirstRun) {
    return (
      <ErrorBoundary>
        <FirstRunScreen onStart={finishFirstRun} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: `radial-gradient(900px 520px at 92% -6%, ${wash(T.accent, 12)}, transparent 60%), radial-gradient(760px 520px at -6% 8%, ${wash(T.blue, 10)}, transparent 55%), radial-gradient(720px 540px at 106% 96%, ${wash(T.pink, 10)}, transparent 55%), ${T.bg}`, fontFamily: T.font, color: T.text }}>
        <div className="screen-enter">
          {selectedLog ? (
            <LogDetailScreen log={selectedLog} onBack={() => setSelectedLog(null)} />
          ) : (
            <>
              {screen === "home" && (
                <HomeScreen
                  cycle={cycle}
                  diary={diary}
                  onSchemaPopup={setSchemaPopup}
                />
              )}
              {screen === "practices" && (
                <PracticesScreen silence={silence} diary={diary} />
              )}
              {screen === "history" && (
                <HistoryScreen
                  logs={diary.logs}
                  periodHistory={cycle.periodHistory}
                  history={history}
                  onSelectLog={setSelectedLog}
                  onImportComplete={async () => {
                    await Promise.all([diary.reloadLogs(), cycle.reloadCycle()]);
                  }}
                />
              )}
            </>
          )}
        </div>
        <SchemaPopup
          schema={schemaPopup}
          isActive={diary.activeSchemas.includes(schemaPopup?.id)}
          onToggle={diary.toggleSchema}
          onClose={() => setSchemaPopup(null)}
        />
        <NavBar
          screen={selectedLog ? null : screen}
          onNavigate={handleNavigate}
          onLogout={onLogout}
          onHide={() => setPrivacyCovered(true)}
        />
        <PrivacyCover active={privacyCovered} onReveal={() => setPrivacyCovered(false)} />
      </div>
    </ErrorBoundary>
  );
}

function AuthenticatedApp({ user, onLogout }) {
  const [attempt, setAttempt] = useState(0);
  const [migrationState, setMigrationState] = useState({ status: "checking" });
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.resolve()
      .then(() => inspectLegacyMigration(user.id))
      .then((state) => {
        if (active) setMigrationState(state);
      })
      .catch((error) => {
        if (active) setMigrationState({ status: "error", message: error.message });
      });

    return () => {
      active = false;
    };
  }, [attempt, user.id]);

  const retryMigration = () => {
    setMigrationState({ status: "checking" });
    setAttempt((current) => current + 1);
  };

  const resolveMigration = async (action) => {
    setWorking(true);
    try {
      const state = await action(user.id);
      setMigrationState(state);
    } catch (error) {
      setMigrationState({ status: "error", message: error.message });
    } finally {
      setWorking(false);
    }
  };

  if (migrationState.status === "checking") return <LoadingScreen />;

  if (["needs-confirmation", "owner-mismatch"].includes(migrationState.status)) {
    return (
      <MigrationDecision
        user={user}
        state={migrationState}
        working={working}
        onImport={() => resolveMigration(importConfirmedLegacyData)}
        onSkip={() => resolveMigration(skipLegacyImport)}
        onLogout={onLogout}
      />
    );
  }

  if (migrationState.status === "error") {
    return (
      <BlockingError
        title="Не удалось подготовить данные"
        message={migrationState.message || "Решение по локальным данным не завершено, поэтому приложение остаётся закрытым. Проверь соединение и повтори попытку."}
        onRetry={retryMigration}
        onLogout={onLogout}
      />
    );
  }

  return <MainApp user={user} onLogout={onLogout} />;
}

export default function App() {
  const [initialAuthState] = useState(readInitialAuthState);
  const [authScreen, setAuthScreen] = useState(initialAuthState.screen); // "welcome" | "login" | "register"
  const [authNotice, setAuthNotice] = useState(initialAuthState.notice);
  const auth = useAuth();

  useEffect(() => {
    if (!initialAuthState.authError) return;
    window.history.replaceState(null, "", window.location.pathname);
  }, [initialAuthState.authError]);

  if (auth.loading) return <LoadingScreen />;

  // Не авторизована — показываем экраны входа/регистрации
  if (!auth.user) {
    if (authScreen === "welcome") {
      return (
        <WelcomeScreen
          onGoRegister={() => { auth.setError(null); setAuthNotice(null); setAuthScreen("register"); }}
          onGoLogin={() => { auth.setError(null); setAuthNotice(null); setAuthScreen("login"); }}
        />
      );
    }
    if (authScreen === "register") {
      return (
        <RegisterScreen
          onRegister={auth.register}
          onGoLogin={() => { auth.setError(null); setAuthNotice(null); setAuthScreen("login"); }}
          error={auth.error || authNotice}
          setError={auth.setError}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={auth.login}
        onGoRegister={() => { auth.setError(null); setAuthNotice(null); setAuthScreen("register"); }}
        error={auth.error || authNotice}
        setError={auth.setError}
      />
    );
  }

  return <AuthenticatedApp key={auth.user.id} user={auth.user} onLogout={auth.logout} />;
}
