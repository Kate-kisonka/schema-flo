import { useState, useEffect } from "react";
import { getTodayKey, parseLocalDate } from "../utils.js";
import { dbSilence, dbSilenceLogs } from "../services/db.js";

export function useSilence() {
  const [silenceActive,    setSilenceActiveRaw]    = useState(false);
  const [silenceStartDate, setSilenceStartDateRaw] = useState(null);
  const [silenceDays,      setSilenceDaysRaw]      = useState(14);
  const [silenceLogs,      setSilenceLogsRaw]      = useState([]);
  const [loaded,           setLoaded]              = useState(false);

  const [needsChecked,  setNeedsChecked]  = useState([]);
  const [morningNote,   setMorningNote]   = useState("");
  const [goodDone,      setGoodDone]      = useState("");
  const [goodTomorrow,  setGoodTomorrow]  = useState("");

  useEffect(() => {
    Promise.all([dbSilence.get(), dbSilenceLogs.getAll()]).then(([state, logs]) => {
      if (state) {
        setSilenceActiveRaw(state.silenceActive ?? false);
        setSilenceStartDateRaw(state.silenceStartDate ?? null);
        setSilenceDaysRaw(state.silenceDays ?? 14);
      }
      const sorted = logs.sort((a, b) => b.date.localeCompare(a.date));
      setSilenceLogsRaw(sorted);
      const todayLog = sorted.find(l => l.date === getTodayKey());
      if (todayLog) {
        setNeedsChecked(todayLog.needsChecked || []);
        setMorningNote(todayLog.morningNote || "");
        setGoodDone(todayLog.goodDone || "");
        setGoodTomorrow(todayLog.goodTomorrow || "");
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    dbSilence.save({ silenceActive, silenceStartDate, silenceDays });
  }, [silenceActive, silenceStartDate, silenceDays, loaded]);

  const silenceDayNum = () => {
    if (!silenceStartDate) return 0;
    const today = parseLocalDate(getTodayKey());
    const start = parseLocalDate(silenceStartDate);
    return Math.min(Math.floor((today - start) / 86400000) + 1, silenceDays);
  };

  const startSilence = () => {
    const today = getTodayKey();
    setSilenceStartDateRaw(today);
    setSilenceActiveRaw(true);
  };

  const saveSilenceDay = () => {
    const today = getTodayKey();
    const entry = {
      date: today,
      dayNum: silenceDayNum(),
      needsChecked, morningNote, goodDone, goodTomorrow,
    };
    setSilenceLogsRaw(prev => [entry, ...prev.filter(l => l.date !== today)]);
    dbSilenceLogs.upsert(entry);
  };

  const toggleNeed = (id) =>
    setNeedsChecked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const adjustDays = (delta) =>
    setSilenceDaysRaw(d => Math.max(14, d + delta));

  return {
    silenceActive,
    silenceStartDate,
    silenceDays, adjustDays,
    silenceLogs,
    needsChecked, toggleNeed,
    morningNote, setMorningNote,
    goodDone,    setGoodDone,
    goodTomorrow, setGoodTomorrow,
    silenceDayNum,
    startSilence,
    saveSilenceDay,
  };
}
