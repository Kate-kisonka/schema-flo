import React, { useState } from "react";
import { T } from "../constants/theme.js";

// ── Переключатель темы: авто → светлая → тёмная ──────────────────────
// Режим хранится в localStorage("sf-theme") и применяется атрибутом
// data-theme на <html>. «Авто» = атрибут снят, работает prefers-color-scheme.
// Начальное применение до рендера — инлайн-скрипт в index.html (без вспышки).

const MODES = ["auto", "light", "dark"];
const LABELS = { auto: "Тема: авто", light: "Тема: светлая", dark: "Тема: тёмная" };

function readMode() {
  try {
    const v = localStorage.getItem("sf-theme");
    return MODES.includes(v) ? v : "auto";
  } catch { return "auto"; }
}

function applyMode(mode) {
  const root = document.documentElement;
  if (mode === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  try {
    if (mode === "auto") localStorage.removeItem("sf-theme");
    else localStorage.setItem("sf-theme", mode);
  } catch { /* приватный режим */ }
}

const ICONS = {
  auto: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  light: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
    </svg>
  ),
  dark: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
};

export default function ThemeToggle() {
  const [mode, setMode] = useState(readMode);

  const cycle = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    applyMode(next);
    setMode(next);
  };

  return (
    <button
      onClick={cycle}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      style={{
        width: 44, height: 44,
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${T.border}`, borderRadius: T.radius.pill,
        background: T.raised, color: T.sub, cursor: "pointer",
        transition: `color ${T.motion.micro}, border-color ${T.motion.micro}`,
      }}
    >
      {ICONS[mode]}
    </button>
  );
}
