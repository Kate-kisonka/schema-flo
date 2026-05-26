import React, { useState, useEffect } from "react";
import { T } from "./constants/theme";
import { getTodayKey } from "./utils";
import { migrateFromLocalStorage } from "./services/migrate";
import { useCycle } from "./hooks/useCycle";
import { useDiary } from "./hooks/useDiary";
import { useSilence } from "./hooks/useSilence";
import { useHistory } from "./hooks/useHistory";
import { useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import NavBar from "./components/NavBar";
import SchemaPopup from "./components/SchemaPopup";
import HomeScreen from "./screens/HomeScreen";
import PracticesScreen from "./screens/PracticesScreen";
import HistoryScreen from "./screens/HistoryScreen";
import LogDetailScreen from "./screens/LogDetailScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState("home");
  const [selectedLog, setSelectedLog] = useState(null);
  const [schemaPopup, setSchemaPopup] = useState(null);
  const [authScreen, setAuthScreen] = useState("login"); // "login" | "register"

  const auth = useAuth();

  // Миграция запускается ПОСЛЕ подтверждения авторизации
  // migrateFromLocalStorage сама проверяет наличие токена и флага
  useEffect(() => {
    if (!auth.loading) {
      migrateFromLocalStorage().finally(() => setIsLoading(false));
    }
  }, [auth.loading]);

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
          onGoLogin={() => { auth.setError(null); setAuthScreen("login"); }}
          error={auth.error}
          setError={auth.setError}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={auth.login}
        onGoRegister={() => { auth.setError(null); setAuthScreen("register"); }}
        error={auth.error}
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
