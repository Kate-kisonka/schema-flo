import React, { useId, useState } from "react";
import { T } from "../constants/theme.js";
import { Icon } from "./icons.jsx";
import LiquidOrb from "./LiquidOrb.jsx";

function activateWithKeyboard(event, onClick) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  onClick(event);
}

function delayFromId(id) {
  const hash = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return `-${(hash % 2200) / 100}s`;
}

// ── Орб-компаньон «Свет» ─────────────────────────────────────────────
// Живое WebGL-«жидкое стекло» (LiquidOrb.jsx): один фрагментный шейдер,
// палитра берётся из текущей темы приложения (day/dusk/night на <html>).
// Если WebGL недоступен — откат на старую CSS-каплю (.sf-orb, index.css);
// у неё своё стабильное псевдослучайное смещение фазы (--sf-orb-delay),
// чтобы несколько орбов на экране не двигались в такт.
// size — диаметр в px. Декоративен для скринридеров (aria-hidden на
// canvas всегда; role/aria-label — на обёртке, только если есть onClick).
export function Orb({ size = 64, style, onClick, state = "idle" }) {
  const id = useId();
  const [glOk, setGlOk] = useState(true);
  const delay = delayFromId(id);
  const commonProps = {
    "aria-hidden": onClick ? undefined : "true",
    role: onClick ? "button" : undefined,
    "aria-label": onClick ? "Поговорить со Светом" : undefined,
    tabIndex: onClick ? 0 : undefined,
    onClick,
    onKeyDown: onClick ? (event) => activateWithKeyboard(event, onClick) : undefined,
  };

  if (glOk) {
    return (
      <div
        {...commonProps}
        className="sf-orb-wrap"
        style={{ width: size, height: size, cursor: onClick ? "pointer" : undefined, ...style }}
      >
        <LiquidOrb state={state} onFailure={() => setGlOk(false)} />
      </div>
    );
  }

  return (
    <div
      {...commonProps}
      className="sf-orb"
      style={{
        width: size,
        height: size,
        cursor: onClick ? "pointer" : undefined,
        "--sf-orb-delay": delay,
        ...style,
      }}
    />
  );
}

// Орб + реплика «голосом» (антиква, курсив). phrase берётся из companion.js
// на месте вызова — компонент только отображает, ротацией не управляет.
// onClick (опционален) открывает чат — тогда реплика получает стеклянную
// поверхность, tap-отклик и иконку-пузырь как сигнал кликабельности.
export function CompanionSay({ phrase, size = 56, style, onClick, state = "idle" }) {
  const clickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      className={clickable ? "sf-glass sf-tappable" : undefined}
      role={clickable ? "button" : undefined}
      aria-label={clickable ? "Поговорить со Светом" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (event) => activateWithKeyboard(event, onClick) : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: clickable ? undefined : T.accentWash,
        borderRadius: T.radius.md,
        padding: "14px 16px",
        cursor: clickable ? "pointer" : undefined,
        ...style,
      }}
    >
      <Orb size={size} state={state} />
      <p
        style={{
          margin: 0,
          flex: 1,
          fontFamily: T.fontSerif,
          fontStyle: "italic",
          fontSize: 15,
          lineHeight: 1.5,
          color: T.text,
        }}
      >
        {phrase}
      </p>
      {clickable && (
        <Icon name="chat" size={18} style={{ color: T.accent, opacity: 0.75, flexShrink: 0 }} />
      )}
    </div>
  );
}
