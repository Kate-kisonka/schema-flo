import React, { useState } from "react";
import { T } from "./constants/theme";
import { getPhase, getTodayKey } from "./utils";

import { useCycle }   from "./hooks/useCycle";
import { useDiary }   from "./hooks/useDiary";
import { useAI }      from "./hooks/useAI";
import { useSilence } from "./hooks/useSilence";
import { useHistory } from "./hooks/useHistory";

import ErrorBoundary   from "./components/ErrorBoundary";
import NavBar          from "./components/NavBar";
import SchemaPopup     from "./components/SchemaPopup";

import HomeScreen      from "./screens/HomeScreen";
import PracticesScreen from "./screens/PracticesScreen";
import SupportScreen   from "./screens/SupportScreen";
import HistoryScreen   from "./screens/HistoryScreen";
import LogDetailScreen from "./screens/LogDetailScreen";

export default function App() {
  const [screen,      setScreen]      = useState("home");
  const [selectedLog, setSelectedLog] = useState(null);
  const [schemaPopup, setSchemaPopup] = useState(null);

  const cycle   = useCycle();
  const diary   = useDiary();
  const silence = useSilence();
  const history = useHistory(diary.logs);

  const phase = getPhase(cycle.cycleDay);

  const ai = useAI({
    cycleDay:      cycle.cycleDay,
    phase,
    selectedMoods: diary.selectedMoods,
    activeSchemas: diary.activeSchemas,
    intensity:     diary.intensity,
    notes:         diary.notes,
  });

  const handleNavigate = (id) => {
    setScreen(id);
    setSelectedLog(null);
    if (id === "practices") return;
    if (id === "home") {
      const todayLog = diary.logs.find(l => l.date === getTodayKey());
      if (todayLog) diary.setDiaryStep(4);
    }
  };

  const handleGetAIRecommendations = async () => {
    setScreen("support");
    await ai.getAIRecommendations();
  };

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
                <PracticesScreen
                  silence={silence}
                  diary={diary}
                />
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
