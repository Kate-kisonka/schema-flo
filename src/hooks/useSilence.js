import { useState, useEffect } from "react";
import { KEYS } from "../constants/storage-keys";
import { load, save, getTodayKey, parseLocalDate } from "../utils";

export function useSilence() {
  const [silenceActive,    setSilenceActiveRaw]    = useState(() => load(KEYS.SILENCE_ACTIVE, false));
  const [silenceStartDate, setSilenceStartDateRaw] = useState(() => load(KEYS.SILENCE_START_DATE, null));
  const [silenceDays,      setSilenceDaysRaw]      = useState(() => load(KEYS.SILENCE_DAYS, 14));
  const [silenceLogs,      setSilenceLogsRaw]      = useState(() => load(KEYS.SILENCE_LOGS, []));

  const [needsChecked,  setNeedsChecked]  = useState([]);
  const [morningNote,   setMorningNote]   = useState("");
  const [goodDone,      setGoodDone]      = useState("");
  const [goodTomorrow,  setGoodTomorrow]  = useState("");

  useEffect(() => { save(KEYS.SILENCE_ACTIVE,    silenceActive); },    [silenceActive]);
  useEffect(() => { save(KEYS.SILENCE_START_DATE, silenceStartDate); }, [silenceStartDate]);
  useEffect(() => { save(KEYS.SILENCE_DAYS,       silenceDays); },      [silenceDays]);
  useEffect(() => { save(KEYS.SILENCE_LOGS,       silenceLogs); },      [silenceLogs]);

  // Предзаполнение из сегодняшнего лога тишины при монтировании
  useEffect(() => {
    const todayLog = silenceLogs.find(l => l.date === getTodayKey());
    if (todayLog) {
      setNeedsChecked(todayLog.needsChecked || []);
      setMorningNote(todayLog.morningNote || "");
      setGoodDone(todayLog.goodDone || "");
      setGoodTomorrow(todayLog.goodTomorrow || "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
