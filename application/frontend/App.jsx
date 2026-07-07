import React, { useState, useEffect } from "react";
import { T } from "./constants/theme.js";
import { getTodayKey } from "./utils.js";
import { migrateFromLocalStorage } from "./services/migrate.js";
import { useCycle } from "./hooks/useCycle.js";
import { useDiary } from "./hooks/useDiary.js";
import { useSilence } from "./hooks/useSilence.js";
import { useHistory } from "./hooks/useHistory.js";
import { useAuth } from "./hooks/useAuth.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import NavBar from "./components/NavBar.jsx";
import SchemaPopup from "./components/SchemaPopup.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import PracticesScreen from "./screens/PracticesScreen.jsx";
import HistoryScreen from "./screens/HistoryScreen.jsx";
import LogDetailScreen from "./screens/LogDetailScreen.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import RegisterScreen from "./screens/RegisterScreen.jsx";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState("home");
  const [selectedLog, setSelectedLog] = useState(null);
  const [schemaPopup, setSchemaPopup] = useState(null);
  const [authScreen, setAuthScreen] = useState("login"); // "login" | "register"
  const [authNotice, setAuthNotice] = useState(null);
  const auth = useAuth();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    if (!authError) return;
    const messages = {
      missing_google_code: "Google не вернул код авторизации. Попробуйте снова.",
      google_auth_failed: "Не удалось войти через Google. Попробуйте позже.",
    };
    setAuthNotice(messages[authError] || "Ошибка входа через Google");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Миграция запускается ПОСЛЕ подтверждения авторизации
  // migrateFromLocalStorage сама проверяет наличие токена и флага
  useEffect(() => {
    if (!auth.loading) {
      migrateFromLocalStorage(auth.user?.id).finally(() => setIsLoading(false));
    }
  }, [auth.loading, auth.user?.id]);

  const cycle = useCycle();
  const diary = useDiary();
  const silence = useSilence();
  const history = useHistory(diary.logs);

  const handleNavigate = (id) => {
    setScreen(id);
    setSelectedLog(null);
    if (id === "home") {
      const todayLog = diary.logs.find(l => l.date === getTodayKey());
      if (todayLog) diary.setDiaryStep(4);
    }
  };

  // Пока проверяем токен или мигрируем данные — показываем загрузку
  if (auth.loading || isLoading) return <LoadingScreen />;

  // Не авторизована — показываем экраны входа/регистрации
  if (!auth.user) {
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

  return (
    <ErrorBoundary>
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text }}>
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
        <NavBar screen={selectedLog ? null : screen} onNavigate={handleNavigate} onLogout={auth.logout} />
      </div>
    </ErrorBoundary>
  );
}
