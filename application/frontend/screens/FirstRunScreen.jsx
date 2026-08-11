import React from "react";
import { T, wash } from "../constants/theme.js";
import { CompanionSay, Orb } from "../components/Companion.jsx";
import Icon from "../components/icons.jsx";

export default function FirstRunScreen({ onStart }) {
  return (
    <div
      className="screen-enter"
      style={{
        minHeight: "100vh",
        background: `radial-gradient(760px 460px at 90% -8%, ${wash(T.accent, 16)}, transparent 60%), radial-gradient(620px 420px at -12% 16%, ${wash(T.green, 12)}, transparent 58%), ${T.bg}`,
        color: T.text,
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "24px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
        <Orb size={104} />
      </div>

      <h1 style={{ fontFamily: T.fontSerif, fontSize: 31, lineHeight: 1.12, textAlign: "center", margin: "0 0 12px" }}>
        Сохраним первый день
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: T.sub, textAlign: "center", margin: "0 auto 22px", maxWidth: 330 }}>
        Начнем с минимума: настроение и интенсивность уже достаточно, чтобы дневник стал живым.
      </p>

      <CompanionSay
        phrase="Не нужно описывать все. Выбери пару отметок, а остальное можно оставить на потом."
        size={42}
        style={{ marginBottom: 16 }}
      />

      <div className="sf-glass sf-glass--soft" style={{ borderRadius: T.radius.md, padding: 16, marginBottom: 18 }}>
        {[
          ["faceNeutral", "Отметь, как ты сейчас"],
          ["tap", "Сдвинь интенсивность, если хочется"],
          ["check", "Сохрани день одной кнопкой"],
        ].map(([icon, text], index) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: index === 2 ? 0 : 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: T.radius.sm, background: wash(T.accent, 14), color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={icon} size={18} />
            </span>
            <span style={{ fontSize: 14, color: T.sub }}>{text}</span>
          </div>
        ))}
      </div>

      <button type="button" onClick={onStart} style={primaryButton}>
        Перейти к первой записи
      </button>
    </div>
  );
}

const primaryButton = {
  width: "100%",
  minHeight: 48,
  border: "none",
  borderRadius: T.radius.sm,
  background: T.accent,
  color: T.onAccent,
  fontFamily: T.font,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};
