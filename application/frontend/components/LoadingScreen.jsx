import React from "react";

const T = {
  bg: "#F4F4F5",
  card: "#FFFFFF",
  text: "#111118",
  accent: "#5E6AD2",
  font: "'Inter', system-ui, -apple-system, sans-serif",
};

export default function LoadingScreen() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: T.bg,
        fontFamily: T.font,
      }}
    >
      <div
        style={{
          backgroundColor: T.card,
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "48px",
            marginBottom: "16px",
            animation: "spin 1s linear infinite",
          }}
        >
          ⏳
        </div>
        <p
          style={{
            fontSize: "16px",
            color: T.text,
            margin: "0 0 8px 0",
          }}
        >
          Loading your data...
        </p>
        <p
          style={{
            fontSize: "14px",
            color: "#71717A",
            margin: "0",
          }}
        >
          Preparing IndexedDB
        </p>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
