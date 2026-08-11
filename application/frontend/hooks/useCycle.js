import { useState, useEffect, useCallback } from "react";
import { getTodayKey, toDateKey, parseLocalDate, avgCycleLength as calcAvgCycleLength } from "../utils.js";
import { dbCycle, dbPeriod } from "../services/db.js";

const DAY_MS = 86400000;

function normalizeCycleState(state) {
  const storedDay = state.cycleDay ?? 14;
  const periodStartDate = state.periodStartDate ?? null;
  const cycleDay = periodStartDate
    ? Math.max(Math.floor((parseLocalDate(getTodayKey()) - parseLocalDate(periodStartDate)) / DAY_MS) + 1, 1)
    : storedDay;

  return {
    cycleDay,
    periodStartDate,
    periodActive: Boolean(state.periodActive) && cycleDay < 6,
    periodHistory: state.periodHistory ?? [],
  };
}

export function useCycle() {
  const [cycleDay, setCycleDayRaw] = useState(14);
  const [periodStartDate, setPeriodStartDateRaw] = useState(null);
  const [periodActive, setPeriodActiveRaw] = useState(false);
  const [periodHistory, setPeriodHistoryRaw] = useState([]);
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [showFlowQuestion, setShowFlowQuestion] = useState(false);
  const [cycleLoadError, setCycleLoadError] = useState(false);

  const applyCycleState = useCallback((state) => {
    const normalized = normalizeCycleState(state);
    setCycleDayRaw(normalized.cycleDay);
    setPeriodStartDateRaw(normalized.periodStartDate);
    setPeriodActiveRaw(normalized.periodActive);
    setPeriodHistoryRaw(normalized.periodHistory);
    setCycleLoadError(false);

    if (normalized.cycleDay !== (state.cycleDay ?? 14) || normalized.periodActive !== Boolean(state.periodActive)) {
      dbCycle.save({
        cycleDay: normalized.cycleDay,
        periodStartDate: normalized.periodStartDate,
        periodActive: normalized.periodActive,
      });
    }

    return normalized;
  }, []);

  const reloadCycle = useCallback(async () => {
    try {
      const state = await dbCycle.get();
      return applyCycleState(state);
    } catch (err) {
      setCycleLoadError(true);
      throw err;
    }
  }, [applyCycleState]);

  useEffect(() => {
    let active = true;

    dbCycle.get()
      .then((state) => {
        if (active) applyCycleState(state);
      })
      .catch((err) => {
        if (!active) return;
        setCycleLoadError(true);
        console.error("[cycle] load failed:", err.message);
      });

    return () => {
      active = false;
    };
  }, [applyCycleState]);

  const setCycleDay = (day) => {
    const start = parseLocalDate(getTodayKey());
    start.setDate(start.getDate() - (day - 1));
    const nextPeriodStartDate = toDateKey(start);
    const nextPeriodActive = periodActive && day < 6;

    setCycleDayRaw(day);
    setPeriodStartDateRaw(nextPeriodStartDate);
    setPeriodActiveRaw(nextPeriodActive);
    dbCycle.save({ cycleDay: day, periodStartDate: nextPeriodStartDate, periodActive: nextPeriodActive });
  };

  const startPeriod = (flowIntensity) => {
    const today = getTodayKey();
    const cycleLength = periodStartDate
      ? Math.floor((parseLocalDate(today) - parseLocalDate(periodStartDate)) / DAY_MS)
      : null;
    const entry = { date: today, flowIntensity, cycleLength };

    setPeriodHistoryRaw(prev => [entry, ...prev]);
    setPeriodStartDateRaw(today);
    setCycleDayRaw(1);
    setPeriodActiveRaw(true);
    setShowPeriodConfirm(false);
    setShowFlowQuestion(false);
    dbCycle.save({ cycleDay: 1, periodStartDate: today, periodActive: true });
    dbPeriod.add(entry).catch((err) => console.error("[cycle] period save failed:", err.message));
  };

  const endPeriod = () => {
    setPeriodActiveRaw(false);
    dbCycle.save({ cycleDay, periodStartDate, periodActive: false });
  };

  const avgCycleLength = () => calcAvgCycleLength(periodHistory);

  return {
    cycleDay, setCycleDay,
    periodStartDate,
    periodActive,
    periodHistory,
    showPeriodConfirm, setShowPeriodConfirm,
    showFlowQuestion, setShowFlowQuestion,
    startPeriod,
    endPeriod,
    avgCycleLength,
    reloadCycle,
    cycleLoadError,
  };
}
