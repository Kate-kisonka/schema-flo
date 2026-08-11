import React, { useState } from "react";
import { T } from "../constants/theme.js";

// ── Переключатель темы: день → сумерки → ночь ───────────────────────
// Режим хранится в localStorage("sf-theme") и применяется атрибутом
// data-theme на <html> (day|dusk|night). Без системного «авто» — тема
// всегда выбрана явно. Начальное применение до рендера — инлайн-скрипт
// в index.html (без вспышки).

const MODES = ["day", "dusk", "night"];
const LABELS = { day: "Тема: день", dusk: "Тема: сумерки", night: "Тема: ночь" };

function readMode() {
  try {
    const v = localStorage.getItem("sf-theme");
    return MODES.includes(v) ? v : "day";
  } catch { return "day"; }
}

function applyMode(mode) {
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  try {
    localStorage.setItem("sf-theme", mode);
  } catch { /* приватный режим */ }
}

export default function ThemeToggle({ nav = false }) {
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
        width: nav ? "auto" : 44,
        height: nav ? "auto" : 44,
        flex: nav ? 1 : undefined,
        minHeight: nav ? 52 : undefined,
        padding: nav ? "9px 2px 12px" : 0,
        display: "flex",
        flexDirection: nav ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: nav ? 3 : 0,
        border: nav ? "none" : `1px solid ${T.border}`,
        borderTop: nav ? "2px solid transparent" : undefined,
        borderRadius: nav ? 0 : T.radius.pill,
        background: nav ? "none" : T.raised,
        color: T.muted,
        cursor: "pointer",
        fontFamily: T.font,
        transition: `color ${T.motion.micro}, border-color ${T.motion.micro}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {MODES.map(m => (
          <div
            key={m}
            aria-hidden="true"
            style={{
              width: m === mode ? 7 : 5,
              height: m === mode ? 7 : 5,
              borderRadius: "50%",
              background: m === mode ? T.accent : "transparent",
              border: m === mode ? "none" : `1px solid ${T.border2}`,
              transition: `all ${T.motion.micro}`,
            }}
          />
        ))}
      </div>
      {nav && <span style={{ fontSize: 9, fontWeight: 400 }}>Тема</span>}
    </button>
  );
}
