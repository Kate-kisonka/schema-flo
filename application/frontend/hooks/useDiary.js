import { useState, useEffect, useCallback } from "react";
import { getTodayKey } from "../utils.js";
import { dbDiary } from "../services/db.js";

const draftKey = (userId) => `diary_draft:${userId}`;

// Черновик незавершённого ввода живёт в localStorage, чтобы страница
// пережила перезагрузку/закрытие вкладки. Привязан к сегодняшней дате —
// черновик за прошедший день в новый день не подставляется.
function loadDraft(userId) {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && draft.date === getTodayKey() ? draft : null;
  } catch {
    return null;
  }
}

function saveDraft(userId, draft) {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    // localStorage недоступен/переполнен — черновик просто не переживёт перезагрузку
  }
}

function clearDraft(userId) {
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    // ignore
  }
}

export function useDiary(userId) {
  const [initialDraft] = useState(() => loadDraft(userId));
  const [logs, setLogsRaw] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [diaryStep, setDiaryStep] = useState(() => {
    return typeof initialDraft?.step === "number" ? initialDraft.step : 0;
  });

  const [selectedMoods, setSelectedMoods] = useState(() => initialDraft?.moods || []);
  const [intensity, setIntensity] = useState(() => initialDraft?.intensity ?? 5);
  const [discharge, setDischarge] = useState(() => initialDraft?.discharge ?? null);
  const [digestion, setDigestion] = useState(() => initialDraft?.digestion ?? null);
  const [symptoms, setSymptoms] = useState(() => initialDraft?.symptoms || []);
  const [libido, setLibido] = useState(() => initialDraft?.libido ?? null);
  const [symptomNotes, setSymptomNotes] = useState(() => initialDraft?.symptomNotes || "");
  const [activeSchemas, setActiveSchemas] = useState(() => initialDraft?.schemas || []);
  const [notes, setNotes] = useState(() => initialDraft?.notes || "");
  const [completedExercises, setCompletedExercises] = useState(() => initialDraft?.exercises || []);
  const [showExtendedMoods, setShowExtendedMoods] = useState(false);

  const applyTodayLog = useCallback((todayLog) => {
    if (!todayLog) return;
    setSelectedMoods(todayLog.moods || []);
    setIntensity(todayLog.intensity || 5);
    setActiveSchemas(todayLog.schemas || []);
    setSymptoms(todayLog.symptoms || []);
    setDischarge(todayLog.discharge || null);
    setDigestion(todayLog.digestion || null);
    setLibido(todayLog.libido || null);
    setSymptomNotes(todayLog.symptomNotes || "");
    setNotes(todayLog.notes || "");
    setCompletedExercises(todayLog.exercises || []);
    setDiaryStep(4);
  }, []);

  const reloadLogs = useCallback(async () => {
    try {
      const allLogs = await dbDiary.getAll();
      const sorted = allLogs.sort((a, b) => b.date.localeCompare(a.date));
      setLogsRaw(sorted);
      applyTodayLog(sorted.find((l) => l.date === getTodayKey()));
      setLoadError(false);
      return sorted;
    } catch (err) {
      setLoadError(true);
      throw err;
    } finally {
      setLoaded(true);
    }
  }, [applyTodayLog]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote load owns these states
    reloadLogs().catch((err) => console.error("[diary] load failed:", err.message));
  }, [reloadLogs]);

  // Пока день не сохранён (шаг < 4) — зеркалим форму в черновик;
  // как только день сохранён (свой или подтянутый с сервера) — черновик не нужен
  useEffect(() => {
    if (diaryStep === 4) {
      clearDraft(userId);
      return;
    }
    saveDraft(userId, {
      date: getTodayKey(),
      step: diaryStep,
      moods: selectedMoods,
      intensity,
      discharge,
      digestion,
      symptoms,
      libido,
      symptomNotes,
      schemas: activeSchemas,
      notes,
      exercises: completedExercises,
    });
  }, [userId, diaryStep, selectedMoods, intensity, discharge, digestion, symptoms, libido, symptomNotes, activeSchemas, notes, completedExercises]);

  const toggleMood = (id) => setSelectedMoods((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleSchema = (id) => setActiveSchemas((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleSymptom = (id) => setSymptoms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const saveDay = async (cycleDay, phaseKey) => {
    const today = getTodayKey();
    const entry = {
      date: today,
      cycleDay,
      phase: phaseKey,
      moods: selectedMoods,
      intensity,
      schemas: activeSchemas,
      notes,
      discharge,
      digestion,
      symptoms,
      libido,
      symptomNotes,
      exercises: completedExercises,
    };
    try {
      await dbDiary.upsert(entry);
      setLogsRaw((prev) => [entry, ...prev.filter((l) => l.date !== today)]);
      setDiaryStep(4);
      return true;
    } catch (err) {
      console.error("[diary] save failed:", err.message);
      return false;
    }
  };

  const editToday = () => {
    const todayLog = logs.find((l) => l.date === getTodayKey());
    if (todayLog) {
      setSelectedMoods(todayLog.moods || []);
      setIntensity(todayLog.intensity || 5);
      setActiveSchemas(todayLog.schemas || []);
      setSymptoms(todayLog.symptoms || []);
      setDischarge(todayLog.discharge || null);
      setDigestion(todayLog.digestion || null);
      setLibido(todayLog.libido || null);
      setSymptomNotes(todayLog.symptomNotes || "");
      setNotes(todayLog.notes || "");
      setCompletedExercises(todayLog.exercises || []);
    }
    setDiaryStep(0);
  };

  const markExerciseDone = (id) =>
    setCompletedExercises((p) => [...new Set([...p, id])]);

  return {
    logs,
    loaded,
    loadError,
    setLogs: setLogsRaw,
    reloadLogs,
    diaryStep,
    setDiaryStep,
    selectedMoods,
    intensity,
    setIntensity,
    discharge,
    setDischarge,
    digestion,
    setDigestion,
    symptoms,
    libido,
    setLibido,
    symptomNotes,
    setSymptomNotes,
    activeSchemas,
    notes,
    setNotes,
    completedExercises,
    showExtendedMoods,
    setShowExtendedMoods,
    toggleMood,
    toggleSchema,
    toggleSymptom,
    saveDay,
    editToday,
    markExerciseDone,
  };
}
