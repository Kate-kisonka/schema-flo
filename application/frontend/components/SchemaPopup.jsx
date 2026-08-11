import React from "react";
import { T, wash } from "../constants/theme.js";
import Icon from "./icons.jsx";

export default function SchemaPopup({ schema, isActive, onToggle, onClose }) {
  if (!schema) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 100, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}>
      <div
        style={{ background: T.card, borderRadius: "16px 16px 0 0", padding: 24, width: "100%", maxWidth: 430, margin: "0 auto", boxSizing: "border-box" }}
        onClick={e => e.stopPropagation()}>

        <div style={{ marginBottom: 8, color: T.accent }}>
          <Icon name={schema.icon} size={32} strokeWidth={1.5} />
        </div>
        <div style={{ fontSize: 18, marginBottom: 6 }}>{schema.name}</div>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{schema.domain}</div>
        <div style={{ fontSize: 13, color: T.purple, lineHeight: 1.7, marginBottom: 14 }}>{schema.desc}</div>

        <div style={{ background: wash(T.accent, 15), borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${wash(T.accent, 44)}` }}>
          <div style={{ fontSize: 10, color: T.accent, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Как проявляется</div>
          <div style={{ fontSize: 12, color: T.purple, lineHeight: 1.6 }}>{schema.manifestation}</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { onToggle(schema.id); onClose(); }}
            style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: isActive ? T.muted : T.accent, color: T.onAccent, cursor: "pointer", fontFamily: T.font, fontSize: 13 }}>
            {isActive ? "Убрать" : "Отметить активной"}
          </button>
          <button onClick={onClose} aria-label="Закрыть"
            style={{ width: 44, padding: "10px", borderRadius: 9, border: `1px solid ${T.border}`, background: "none", cursor: "pointer", fontFamily: T.font, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", color: T.text }}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
