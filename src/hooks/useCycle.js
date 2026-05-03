import { useState, useEffect } from "react";
import { KEYS } from "../constants/storage-keys";
import { load, save } from "../utils";
import { getTodayKey, parseLocalDate } from "../utils";

export function useCycle() {
  const [cycleDay, setCycleDayRaw]       = useState(() => load(KEYS.CYCLE_DAY, 14));
  const [periodStartDate, setPeriodStartDateRaw] = useState(() => load(KEYS.PERIOD_START_DATE, null));
  const [periodActive, setPeriodActiveRaw]       = useState(() => load(KEYS.PERIOD_ACTIVE, false));
  const [periodHistory, setPeriodHistoryRaw]     = useState(() => load(KEYS.PERIOD_HISTORY, []));

  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [showFlowQuestion,  setShowFlowQuestion]  = useState(false);

  // Единственная точка персистирования — useEffect следит за каждым полем
  useEffect(() => { save(KEYS.CYCLE_DAY, cycleDay); }, [cycleDay]);
  useEffect(() => { save(KEYS.PERIOD_START_DATE, periodStartDate); }, [periodStartDate]);
  useEffect(() => { save(KEYS.PERIOD_ACTIVE, periodActive); }, [periodActive]);
  useEffect(() => { save(KEYS.PERIOD_HISTORY, periodHistory); }, [periodHistory]);

  // Пересчёт текущего дня цикла от даты начала при монтировании
  useEffect(() => {
    if (!periodStartDate) return;
    const today = parseLocalDate(getTodayKey());
    const start = parseLocalDate(periodStartDate);
    const diff = Math.floor((today - start) / 86400000) + 1;
    const day = Math.min(Math.max(diff, 1), 28);
    setCycleDayRaw(day);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Автозавершение менструации на 6-й день
  useEffect(() => {
    if (periodActive && cycleDay >= 6) setPeriodActiveRaw(false);
  }, [cycleDay, periodActive]);

  const setCycleDay = (day) => setCycleDayRaw(day);

  const startPeriod = (flowIntensity) => {
    const today = getTodayKey();
    const cycleLength = periodStartDate
      ? Math.floor((parseLocalDate(today) - parseLocalDate(periodStartDate)) / 86400000)
      : null;

    setPeriodHistoryRaw(prev => [{ date: today, flowIntensity, cycleLength }, ...prev]);
    setPeriodStartDateRaw(today);
    setCycleDayRaw(1);
    setPeriodActiveRaw(true);
    setShowPeriodConfirm(false);
    setShowFlowQuestion(false);
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
  };
}
