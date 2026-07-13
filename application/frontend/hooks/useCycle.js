import { useState, useEffect, useCallback, useRef } from "react";
import { getTodayKey, toDateKey, parseLocalDate, avgCycleLength as calcAvgCycleLength } from "../utils.js";
import { dbCycle, dbPeriod } from "../services/db.js";

export function useCycle() {
  const [cycleDay, setCycleDayRaw]               = useState(14);
  const [periodStartDate, setPeriodStartDateRaw] = useState(null);
  const [periodActive, setPeriodActiveRaw]       = useState(false);
  const [periodHistory, setPeriodHistoryRaw]     = useState([]);
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [showFlowQuestion,  setShowFlowQuestion]  = useState(false);
  const [loaded, setLoaded] = useState(false);
  // true, когда /api/state не удалось загрузить (сеть/сервер) — в этом
  // случае cycleDay в состоянии может быть подставным, и UI не должен
  // показывать его как настоящий день цикла
  const [cycleLoadError, setCycleLoadError] = useState(false);
  const skipNextSave = useRef(false);

  const reloadCycle = useCallback(async () => {
    try {
      const state = await dbCycle.get();
      setCycleDayRaw(state.cycleDay ?? 14);
      setPeriodStartDateRaw(state.periodStartDate ?? null);
      setPeriodActiveRaw(state.periodActive ?? false);
      setPeriodHistoryRaw(state.periodHistory ?? []);
      setCycleLoadError(false);
      return state;
    } catch (err) {
      setCycleLoadError(true);
      throw err;
    } finally {
      skipNextSave.current = true;
      setLoaded(true);
    }
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
    setCycleDayRaw(Math.max(diff, 1));
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Автозавершение менструации на 6-й день
  useEffect(() => {
    if (periodActive && cycleDay >= 6) setPeriodActiveRaw(false);
  }, [cycleDay, periodActive]);

  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    dbCycle.save({ cycleDay, periodStartDate, periodActive });
  }, [cycleDay, periodStartDate, periodActive, loaded]);

  // Ручной выбор дня — это калибровка: сдвигаем дату начала цикла,
  // иначе пересчёт при следующем запуске вернёт старый день
  const setCycleDay = (day) => {
    setCycleDayRaw(day);
    const start = parseLocalDate(getTodayKey());
    start.setDate(start.getDate() - (day - 1));
    setPeriodStartDateRaw(toDateKey(start));
  };

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

  const avgCycleLength = () => calcAvgCycleLength(periodHistory);

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
    cycleLoadError,
  };
}
