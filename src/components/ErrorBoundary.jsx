import React from "react";
import { T } from "../constants/theme";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🌧️</div>
          <div style={{ fontSize: 18, marginBottom: 8, color: T.text }}>Что-то пошло не так</div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 24 }}>
            Данные в безопасности. Попробуй обновить страницу.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "12px 24px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: T.font }}>
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }
}
