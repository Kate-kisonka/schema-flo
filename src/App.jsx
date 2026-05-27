import React, { useState, useEffect } from "react";
import { T } from "./constants/theme";
import { getPhase, getTodayKey } from "./utils";
import { migrateFromLocalStorage } from "./services/migrate";
import { authApi } from "./services/db";
import { useCycle } from "./hooks/useCycle";
import { useDiary } from "./hooks/useDiary";
import { useAI } from "./hooks/useAI";
import { useSilence } from "./hooks/useSilence";
import { useHistory } from "./hooks/useHistory";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import NavBar from "./components/NavBar";
import SchemaPopup from "./components/SchemaPopup";
import HomeScreen from "./screens/HomeScreen";
import PracticesScreen from "./screens/PracticesScreen";
import SupportScreen from "./screens/SupportScreen";
import HistoryScreen from "./screens/HistoryScreen";
import LogDetailScreen from "./screens/LogDetailScreen";
import AuthScreen from "./screens/AuthScreen";

export default function App() {
  const [authLoading, setAuthLoading] = useState(() => authApi.isAuthenticated());
  const [user, setUser] = useState(() => authApi.getStoredUser());

  useEffect(() => {
    if (!authApi.isAuthenticated()) return;

    authApi.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) return <LoadingScreen />;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  return <AuthedApp user={user} />;
}

function AuthedApp({ user }) {
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState("home");
  const [selectedLog, setSelectedLog] = useState(null);
  const [schemaPopup, setSchemaPopup] = useState(null);

  useEffect(() => {
    migrateFromLocalStorage(user.id).finally(() => setIsLoading(false));
  }, [user.id]);

  const cycle = useCycle();
  const diary = useDiary();
  const silence = useSilence();
  const history = useHistory(diary.logs);
  const phase = getPhase(cycle.cycleDay);

  const ai = useAI({
    cycleDay: cycle.cycleDay,
    phase,
    selectedMoods: diary.selectedMoods,
    activeSchemas: diary.activeSchemas,
    intensity: diary.intensity,
    notes: diary.notes,
  });

  const handleNavigate = (id) => {
    setScreen(id);
    setSelectedLog(null);
    if (id === "home") {
      const todayLog = diary.logs.find(l => l.date === getTodayKey());
      if (todayLog) diary.setDiaryStep(4);
    }
  };

  const handleGetAIRecommendations = async () => {
    setScreen("support");
    await ai.getAIRecommendations();
  };

  if (isLoading) return <LoadingScreen />;

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
                  onGetAIRecommendations={handleGetAIRecommendations}
                  onSchemaPopup={setSchemaPopup}
                />
              )}
              {screen === "practices" && (
                <PracticesScreen silence={silence} diary={diary} />
              )}
              {screen === "support" && (
                <SupportScreen ai={ai} />
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
        <NavBar screen={selectedLog ? null : screen} onNavigate={handleNavigate} />
      </div>
    </ErrorBoundary>
  );
}
