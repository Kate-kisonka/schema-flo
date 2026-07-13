import { useState, useEffect, useCallback } from "react";
import { getTodayKey } from "../utils.js";
import { dbDiary } from "../services/db.js";

const DRAFT_KEY = "diary_draft";

// Черновик незавершённого ввода живёт в localStorage, чтобы страница
// пережила перезагрузку/закрытие вкладки. Привязан к сегодняшней дате —
// черновик за прошедший день в новый день не подставляется.
function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && draft.date === getTodayKey() ? draft : null;
  } catch {
    return null;
  }
}

function saveDraft(draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage недоступен/переполнен — черновик просто не переживёт перезагрузку
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function useDiary() {
  const [logs, setLogsRaw] = useState([]);
  const [diaryStep, setDiaryStep] = useState(() => {
    const draft = loadDraft();
    return typeof draft?.step === "number" ? draft.step : 0;
  });

  const [selectedMoods, setSelectedMoods] = useState(() => loadDraft()?.moods || []);
  const [intensity, setIntensity] = useState(() => loadDraft()?.intensity ?? 5);
  const [discharge, setDischarge] = useState(() => loadDraft()?.discharge ?? null);
  const [digestion, setDigestion] = useState(() => loadDraft()?.digestion ?? null);
  const [symptoms, setSymptoms] = useState(() => loadDraft()?.symptoms || []);
  const [libido, setLibido] = useState(() => loadDraft()?.libido ?? null);
  const [symptomNotes, setSymptomNotes] = useState(() => loadDraft()?.symptomNotes || "");
  const [activeSchemas, setActiveSchemas] = useState(() => loadDraft()?.schemas || []);
  const [notes, setNotes] = useState(() => loadDraft()?.notes || "");
  const [completedExercises, setCompletedExercises] = useState(() => loadDraft()?.exercises || []);
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
    const allLogs = await dbDiary.getAll();
    const sorted = allLogs.sort((a, b) => b.date.localeCompare(a.date));
    setLogsRaw(sorted);
    applyTodayLog(sorted.find((l) => l.date === getTodayKey()));
    return sorted;
  }, [applyTodayLog]);

  useEffect(() => {
    reloadLogs().catch((err) => console.error("[diary] load failed:", err.message));
  }, [reloadLogs]);

  // Пока день не сохранён (шаг < 4) — зеркалим форму в черновик;
  // как только день сохранён (свой или подтянутый с сервера) — черновик не нужен
  useEffect(() => {
    if (diaryStep === 4) {
      clearDraft();
      return;
    }
    saveDraft({
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
  }, [diaryStep, selectedMoods, intensity, discharge, digestion, symptoms, libido, symptomNotes, activeSchemas, notes, completedExercises]);

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
    setLogsRaw((prev) => [entry, ...prev.filter((l) => l.date !== today)]);
    try {
      await dbDiary.upsert(entry);
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
