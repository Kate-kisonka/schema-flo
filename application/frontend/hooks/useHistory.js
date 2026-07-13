import { useMemo } from "react";
import { SCHEMAS, MOODS, CYCLE_PHASES } from "../data.js";
import { normalizePhaseKey, phaseLabel } from "../utils.js";

export function useHistory(logs) {
  const last14 = useMemo(() => logs.slice(0, 14).reverse(), [logs]);

  const insights = useMemo(() => {
    const result = [];
    if (logs.length < 3) return result;
    const recent = logs.slice(0, 14);

    // Самая интенсивная фаза
    const byPhase = {};
    logs.forEach(l => {
      const p = normalizePhaseKey(l.phase) || "luteal";
      if (!byPhase[p]) byPhase[p] = [];
      byPhase[p].push(l.intensity || 5);
    });
    const phaseAvgs = Object.entries(byPhase)
      .map(([p, vals]) => ({ phase: p, avg: vals.reduce((a, b) => a + b, 0) / vals.length }))
      .sort((a, b) => b.avg - a.avg);
    if (phaseAvgs.length > 1)
      result.push({ emoji: "🌙", text: `Фаза «${phaseLabel(phaseAvgs[0].phase)}» — интенсивность выше всего (${phaseAvgs[0].avg.toFixed(1)}/10)` });

    // Самое частое настроение
    const moodCount = {};
    recent.flatMap(l => l.moods || []).forEach(id => { moodCount[id] = (moodCount[id] || 0) + 1; });
    const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];
    if (topMood) {
      const m = MOODS.find(x => x.id === topMood[0]);
      if (m) result.push({ emoji: m.emoji, text: `Самое частое состояние за 14 дней — "${m.label}" (${topMood[1]} раз)` });
    }

    // Самая активная схема
    const schCount = {};
    recent.flatMap(l => l.schemas || []).forEach(id => { schCount[id] = (schCount[id] || 0) + 1; });
    const topSch = Object.entries(schCount).sort((a, b) => b[1] - a[1])[0];
    if (topSch) {
      const sc = SCHEMAS.find(s => s.id === topSch[0]);
      if (sc) result.push({ emoji: sc.emoji, text: `Схема "${sc.name}" активировалась чаще всего — ${topSch[1]} раз за 2 недели` });
    }

    // Корреляция схемы с лютеиновой фазой
    const lutLogs = logs.filter(l => normalizePhaseKey(l.phase) === "luteal" && l.schemas?.length > 0);
    if (lutLogs.length >= 2) {
      const lutSchemas = {};
      lutLogs.flatMap(l => l.schemas).forEach(id => { lutSchemas[id] = (lutSchemas[id] || 0) + 1; });
      const top = Object.entries(lutSchemas).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        const sc = SCHEMAS.find(s => s.id === top[0]);
        if (sc) result.push({ emoji: "⚡", text: `В лютеиновую фазу схема "${sc.name}" активна в ${Math.round((top[1] / lutLogs.length) * 100)}% дней` });
      }
    }

    // Тренд интенсивности
    if (recent.length >= 5) {
      const half = Math.floor(recent.length / 2);
      const older = recent.slice(half).reduce((s, l) => s + (l.intensity || 5), 0) / (recent.length - half);
      const newer = recent.slice(0, half).reduce((s, l) => s + (l.intensity || 5), 0) / half;
      if (newer < older - 0.5) result.push({ emoji: "📉", text: `Интенсивность снижается — в последние дни в среднем ${newer.toFixed(1)}/10` });
      else if (newer > older + 0.5) result.push({ emoji: "📈", text: `Интенсивность нарастает — в последние дни в среднем ${newer.toFixed(1)}/10` });
    }

    return result;
  }, [logs]);

  const cyclePhaseStats = useMemo(() =>
    CYCLE_PHASES.map(cp => {
      const phaseLogs = logs.filter(l => cp.days.includes(l.cycleDay || 1));
      if (!phaseLogs.length) return null;
      const avg = phaseLogs.reduce((s, l) => s + (l.intensity || 5), 0) / phaseLogs.length;
      return { ...cp, avg };
    }).filter(Boolean),
  [logs]);

  return { last14, insights, cyclePhaseStats };
}
