import React from "react";
import { T } from "../constants/theme.js";

export default function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: T.bg,
        fontFamily: T.font,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }}>🌙</div>
        <p style={{ fontSize: 14, color: T.muted, margin: 0 }}>Загружаем твои данные…</p>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.92); }
        }
      `}</style>
    </div>
  );
}
