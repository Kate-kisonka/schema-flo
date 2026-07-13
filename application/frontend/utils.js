import { CYCLE_PHASES } from "./data.js";

export function getPhase(day) {
  return CYCLE_PHASES.find(p => p.days.includes(day)) || CYCLE_PHASES[3];
}

// Локальная дата в формате YYYY-MM-DD (без UTC-смещения)
export function toDateKey(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getTodayKey() {
  return toDateKey(new Date());
}

// Старые записи хранят русское название фазы вместо ключа
export function normalizePhaseKey(value) {
  if (!value) return null;
  if (CYCLE_PHASES.some(p => p.key === value)) return value;
  return CYCLE_PHASES.find(p => p.name === value)?.key ?? value;
}

export function phaseLabel(value) {
  const key = normalizePhaseKey(value);
  return CYCLE_PHASES.find(p => p.key === key)?.name || "";
}

export function avgCycleLength(periodHistory) {
  const lens = (periodHistory || [])
    .filter(p => p.cycleLength && p.cycleLength > 15 && p.cycleLength < 50)
    .map(p => p.cycleLength);
  return lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : null;
}

// Парсим YYYY-MM-DD как локальную дату (не UTC midnight)
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(dateStr) {
  const date = parseLocalDate(dateStr);
  if (!date) return "";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function getDayOfWeek(dateStr) {
  const date = parseLocalDate(dateStr);
  if (!date) return "";
  return ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][date.getDay()];
}

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function buildCalendarDays(year, month, logs) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = [];
  const pad = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < pad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ d, dateStr, log: logs.find((l) => l.date === dateStr) || null });
  }
  return days;
}

export function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage недоступен или переполнен — молча пропускаем
  }
}
