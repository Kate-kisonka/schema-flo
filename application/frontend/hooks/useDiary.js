import { useState, useEffect, useCallback } from "react";
import { getTodayKey } from "../utils.js";
import { dbDiary } from "../services/db.js";

export function useDiary() {
  const [logs, setLogsRaw] = useState([]);
  const [diaryStep, setDiaryStep] = useState(0);

  const [selectedMoods, setSelectedMoods] = useState([]);
  const [intensity, setIntensity] = useState(5);
  const [discharge, setDischarge] = useState(null);
  const [digestion, setDigestion] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [libido, setLibido] = useState(null);
  const [symptomNotes, setSymptomNotes] = useState("");
  const [activeSchemas, setActiveSchemas] = useState([]);
  const [notes, setNotes] = useState("");
  const [completedExercises, setCompletedExercises] = useState([]);
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

  const toggleMood = (id) => setSelectedMoods((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleSchema = (id) => setActiveSchemas((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleSymptom = (id) => setSymptoms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const saveDay = async (cycleDay, phaseName) => {
    const today = getTodayKey();
    const entry = {
      date: today,
      cycleDay,
      phase: phaseName,
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
    } catch (err) {
      console.error("[diary] save failed:", err.message);
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
