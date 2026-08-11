import React from "react";
import { T } from "../constants/theme.js";
import ThemeToggle from "./ThemeToggle.jsx";

const ICONS = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  ),
  practices: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  hide: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="m2 2 20 20" />
    </svg>
  ),
  logout: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { id: "home",      label: "День"     },
  { id: "practices", label: "Практики" },
  { id: "history",   label: "История"  },
];

function NavButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} aria-label={label} aria-current={active ? "page" : undefined}
      style={{
        flex: 1, minHeight: 52, padding: "9px 2px 12px", border: "none", background: "none",
        fontSize: 9, color: active ? T.accent : T.muted, cursor: "pointer",
        fontFamily: T.font,
        borderTop: active ? `2px solid ${T.accent}` : "2px solid transparent",
        fontWeight: active ? "600" : "400", letterSpacing: "0.02em",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
      }}>
      {icon}
      <div>{label}</div>
    </button>
  );
}

export default function NavBar({ screen, onNavigate, onLogout, onHide }) {
  return (
    <div style={{
      display: "flex", borderTop: `1px solid ${T.border}`, background: T.card,
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430, zIndex: 20,
    }}>
      {NAV_ITEMS.map(item => (
        <NavButton key={item.id} icon={ICONS[item.id]} label={item.label}
          active={screen === item.id} onClick={() => onNavigate(item.id)} />
      ))}

      <ThemeToggle nav />

      {/* Быстрый выход: мгновенно закрывает чувствительный экран нейтральной обложкой */}
      <NavButton icon={ICONS.hide} label="Скрыть" onClick={onHide} />

      <NavButton icon={ICONS.logout} label="Выйти" onClick={onLogout} />
    </div>
  );
}
