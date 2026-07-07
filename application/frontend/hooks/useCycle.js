import { useState, useEffect, useCallback } from "react";
import { getTodayKey, parseLocalDate } from "../utils.js";
import { dbCycle, dbPeriod } from "../services/db.js";

export function useCycle() {
  const [cycleDay, setCycleDayRaw]               = useState(14);
  const [periodStartDate, setPeriodStartDateRaw] = useState(null);
  const [periodActive, setPeriodActiveRaw]       = useState(false);
  const [periodHistory, setPeriodHistoryRaw]     = useState([]);
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [showFlowQuestion,  setShowFlowQuestion]  = useState(false);
  const [loaded, setLoaded] = useState(false);

  const reloadCycle = useCallback(async () => {
    const state = await dbCycle.get();
    if (state) {
      setCycleDayRaw(state.cycleDay ?? 14);
      setPeriodStartDateRaw(state.periodStartDate ?? null);
      setPeriodActiveRaw(state.periodActive ?? false);
      setPeriodHistoryRaw(state.periodHistory ?? []);
    }
    setLoaded(true);
    return state;
  }, []);

  useEffect(() => {
    reloadCycle().catch((err) => console.error("[cycle] load failed:", err.message));
  }, [reloadCycle]);

  // Пересчёт текущего дня цикла от даты начала после загрузки
  useEffect(() => {
    if (!loaded || !periodStartDate) return;
    const today = parseLocalDate(getTodayKey());
    const start = parseLocalDate(periodStartDate);
    const diff = Math.floor((today - start) / 86400000) + 1;
    setCycleDayRaw(Math.min(Math.max(diff, 1), 28));
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Автозавершение менструации на 6-й день
  useEffect(() => {
    if (periodActive && cycleDay >= 6) setPeriodActiveRaw(false);
  }, [cycleDay, periodActive]);

  useEffect(() => {
    if (!loaded) return;
    dbCycle.save({ cycleDay, periodStartDate, periodActive });
  }, [cycleDay, periodStartDate, periodActive, loaded]);

  const setCycleDay = (day) => setCycleDayRaw(day);

  const startPeriod = (flowIntensity) => {
    const today = getTodayKey();
    const cycleLength = periodStartDate
      ? Math.floor((parseLocalDate(today) - parseLocalDate(periodStartDate)) / 86400000)
      : null;
    const entry = { date: today, flowIntensity, cycleLength };
    setPeriodHistoryRaw(prev => [entry, ...prev]);
    setPeriodStartDateRaw(today);
    setCycleDayRaw(1);
    setPeriodActiveRaw(true);
    setShowPeriodConfirm(false);
    setShowFlowQuestion(false);
    dbPeriod.add(entry).catch((err) => console.error("[cycle] period save failed:", err.message));
  };

  const endPeriod = () => setPeriodActiveRaw(false);

  const avgCycleLength = () => {
    const lens = periodHistory
      .filter(p => p.cycleLength && p.cycleLength > 15 && p.cycleLength < 50)
      .map(p => p.cycleLength);
    return lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : null;
  };

  return {
    cycleDay, setCycleDay,
    periodStartDate,
    periodActive,
    periodHistory,
    showPeriodConfirm, setShowPeriodConfirm,
    showFlowQuestion,  setShowFlowQuestion,
    startPeriod,
    endPeriod,
    avgCycleLength,
    reloadCycle,
  };
}
