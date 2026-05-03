import React from "react";
import { T } from "../constants/theme";

const NAV_ITEMS = [
  { id: "home",      icon: "🌙", label: "День"      },
  { id: "practices", icon: "🌿", label: "Практики"  },
  { id: "support",   icon: "💬", label: "Поддержка" },
  { id: "history",   icon: "📋", label: "История"   },
];

export default function NavBar({ screen, onNavigate }) {
  return (
    <div style={{
      display: "flex", borderTop: `1px solid ${T.border}`, background: T.card,
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430, zIndex: 20,
    }}>
      {NAV_ITEMS.map(item => {
        const active = screen === item.id;
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            style={{
              flex: 1, padding: "10px 2px 14px", border: "none", background: "none",
              fontSize: 9, color: active ? T.accent : T.muted, cursor: "pointer",
              fontFamily: T.font,
              borderTop: active ? `2px solid ${T.accent}` : "2px solid transparent",
              fontWeight: active ? "600" : "400", letterSpacing: "0.02em",
            }}>
            <div style={{ fontSize: 16 }}>{item.icon}</div>
            <div style={{ marginTop: 1 }}>{item.label}</div>
          </button>
        );
      })}
    </div>
  );
}
