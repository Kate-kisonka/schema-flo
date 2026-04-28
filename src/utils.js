import { CYCLE_PHASES } from "./data";

export function getPhase(day) {
  return CYCLE_PHASES.find(p => p.days.includes(day)) || CYCLE_PHASES[3];
}

export function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function getDayOfWeek(dateStr) {
  return ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][new Date(dateStr).getDay()];
}

export function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

export function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
