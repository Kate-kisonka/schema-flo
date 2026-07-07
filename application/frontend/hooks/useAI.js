import { useState, useRef, useEffect } from "react";
import { getTodayKey } from "../utils.js";
import { sendAIMessage } from "../services/ai.js";
import { SCHEMAS, MOODS, QUICK_STATES } from "../data.js";
import { dbAISessions } from "../services/db.js";

export function useAI({ cycleDay, phase, selectedMoods, activeSchemas, intensity, notes }) {
  const [aiMessages,      setAiMessages]      = useState([]);
  const [aiInput,         setAiInput]         = useState("");
  const [aiLoading,       setAiLoading]       = useState(false);
  const [showQuickStates, setShowQuickStates] = useState(true);
  const [aiSessions,      setAiSessionsRaw]   = useState([]);
  const [currentSession,  setCurrentSession]  = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    dbAISessions.getAll().then(sessions => {
      setAiSessionsRaw(sessions.sort((a, b) => b.id.localeCompare(a.id)));
    });
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  const buildContext = () =>
    `Ты — тёплый психологический ассистент, специализируешься на схема-терапии Янга и КПТ.
Контекст: день цикла ${cycleDay} (${phase.name}), схемы: ${activeSchemas.map(id => SCHEMAS.find(s => s.id === id)?.name).filter(Boolean).join(", ") || "не указаны"}, настроение: ${selectedMoods.map(id => MOODS.find(m => m.id === id)?.label).filter(Boolean).join(", ") || "не указано"}, интенсивность: ${intensity}/10.
Стиль: тёплый, без осуждения, конкретный. Сначала валидируй — потом предлагай. Отвечай на русском.`;

  const saveSession = (messages) => {
    const sessionId = currentSession || Date.now().toString();
    const session = {
      id: sessionId,
      date: getTodayKey(),
      cycleDay,
      phase: phase.name,
      title: messages[0]?.content?.slice(0, 60) || "Сессия",
      messages,
    };
    setAiSessionsRaw(prev =>
      currentSession
        ? prev.map(s => s.id === currentSession ? session : s)
        : [session, ...prev]
    );
    setCurrentSession(sessionId);
    dbAISessions.upsert(session);
  };

  const sendToAI = async (overrideInput) => {
    const text = overrideInput || aiInput;
    if (!text.trim()) return;

    setShowQuickStates(false);
    const userMsg = { role: "user", content: text };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setAiInput("");
    setAiLoading(true);

    try {
      const reply = await sendAIMessage(newMessages, buildContext());
      const finalMessages = [...newMessages, { role: "assistant", content: reply }];
      setAiMessages(finalMessages);
      saveSession(finalMessages);
    } catch {
      const errMessages = [...newMessages, { role: "assistant", content: "Не удалось подключиться." }];
      setAiMessages(errMessages);
      saveSession(errMessages);
    } finally {
      setAiLoading(false);
    }
  };

  const getAIRecommendations = async () => {
    const schemaNames = activeSchemas.map(id => SCHEMAS.find(s => s.id === id)?.name).filter(Boolean).join(", ");
    const prompt = `На основании заметки предложи 2-3 конкретные техники (схема-терапия или КПТ). Для каждой: название + одна фраза почему подходит.

Заметка: "${notes}"
Схемы: ${schemaNames || "не указаны"}, Фаза: ${phase.name}, Настроение: ${selectedMoods.map(id => MOODS.find(m => m.id === id)?.label).filter(Boolean).join(", ") || "не указано"}

Отвечай коротко, без вступлений.`;

    setShowQuickStates(false);
    const userMsg = { role: "user", content: prompt };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages);
    setAiLoading(true);

    try {
      const reply = await sendAIMessage([userMsg], "Ты психологический ассистент. Кратко и конкретно на русском.");
      const finalMessages = [...newMessages, { role: "assistant", content: reply }];
      setAiMessages(finalMessages);
      saveSession(finalMessages);
    } catch {
      const errMessages = [...newMessages, { role: "assistant", content: "Не удалось получить рекомендации." }];
      setAiMessages(errMessages);
      saveSession(errMessages);
    } finally {
      setAiLoading(false);
    }
  };

  const resetChat = () => {
    setAiMessages([]);
    setCurrentSession(null);
    setShowQuickStates(true);
  };

  const loadSession = (session) => {
    setAiMessages(session.messages);
    setCurrentSession(session.id);
    setShowQuickStates(false);
  };

  return {
    aiMessages, aiInput, setAiInput,
    aiLoading, showQuickStates, setShowQuickStates,
    aiSessions, messagesEndRef,
    sendToAI, getAIRecommendations,
    resetChat, loadSession,
    quickStates: QUICK_STATES,
  };
}
