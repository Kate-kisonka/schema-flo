import { useState, useEffect } from "react";
import { load, save, getTodayKey } from "../utils";
import { dbDiary } from "../services/db";

export function useDiary() {
  const [logs, setLogsRaw] = useState([]);

  const [diaryStep, setDiaryStep] = useState(0);

  const [selectedMoods,     setSelectedMoods]     = useState([]);
  const [intensity,         setIntensity]         = useState(5);
  const [discharge,         setDischarge]         = useState(null);
  const [digestion,         setDigestion]         = useState(null);
  const [symptoms,          setSymptoms]          = useState([]);
  const [libido,            setLibido]            = useState(null);
  const [symptomNotes,      setSymptomNotes]      = useState("");
  const [activeSchemas,     setActiveSchemas]     = useState([]);
  const [notes,             setNotes]             = useState("");
  const [completedExercises, setCompletedExercises] = useState(() => load("completed_exercises", []));
  const [showExtendedMoods, setShowExtendedMoods] = useState(false);

  useEffect(() => { save("completed_exercises", completedExercises); }, [completedExercises]);

  useEffect(() => {
    dbDiary.getAll().then(allLogs => {
      const sorted = allLogs.sort((a, b) => b.date.localeCompare(a.date));
      setLogsRaw(sorted);
      const todayLog = sorted.find(l => l.date === getTodayKey());
      if (todayLog) {
        setSelectedMoods(todayLog.moods || []);
        setIntensity(todayLog.intensity || 5);
        setActiveSchemas(todayLog.schemas || []);
        setSymptoms(todayLog.symptoms || []);
        setDischarge(todayLog.discharge || null);
        setDigestion(todayLog.digestion || null);
        setLibido(todayLog.libido || null);
        setNotes(todayLog.notes || "");
        setDiaryStep(4);
      }
    });
  }, []);

  const toggleMood    = (id) => setSelectedMoods(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSchema  = (id) => setActiveSchemas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleSymptom = (id) => setSymptoms(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const saveDay = (cycleDay, phaseName) => {
    const today = getTodayKey();
    const entry = {
      date: today, cycleDay, phase: phaseName,
      moods: selectedMoods, intensity, schemas: activeSchemas, notes,
      discharge, digestion, symptoms, libido, symptomNotes,
      exercises: completedExercises,
    };
    setLogsRaw(prev => [entry, ...prev.filter(l => l.date !== today)]);
    dbDiary.upsert(entry);
    setDiaryStep(4);
  };

  const editToday = () => {
    const todayLog = logs.find(l => l.date === getTodayKey());
    if (todayLog) {
      setSelectedMoods(todayLog.moods || []);
      setIntensity(todayLog.intensity || 5);
      setActiveSchemas(todayLog.schemas || []);
      setSymptoms(todayLog.symptoms || []);
      setDischarge(todayLog.discharge || null);
      setDigestion(todayLog.digestion || null);
      setLibido(todayLog.libido || null);
      setNotes(todayLog.notes || "");
    }
    setDiaryStep(0);
  };

  const markExerciseDone = (id) =>
    setCompletedExercises(p => [...new Set([...p, id])]);

  return {
    logs, setLogs: setLogsRaw,
    diaryStep, setDiaryStep,
    selectedMoods, intensity, setIntensity,
    discharge, setDischarge,
    digestion, setDigestion,
    symptoms, libido, setLibido,
    symptomNotes, setSymptomNotes,
    activeSchemas,
    notes, setNotes,
    completedExercises,
    showExtendedMoods, setShowExtendedMoods,
    toggleMood, toggleSchema, toggleSymptom,
    saveDay, editToday, markExerciseDone,
  };
}
