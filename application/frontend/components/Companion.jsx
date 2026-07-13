import React from "react";
import { T } from "../constants/theme.js";

// ── Орб-компаньон «Свет» ─────────────────────────────────────────────
// Перламутровая живая капля: дышит, морфит форму, переливается.
// Вся анимация — CSS-класс .sf-orb (index.css); при prefers-reduced-motion
// глобальный предохранитель останавливает движение, орб остаётся каплей.
// size — диаметр в px. Декоративен для скринридеров (aria-hidden).
export function Orb({ size = 64, style }) {
  return (
    <div
      className="sf-orb"
      aria-hidden="true"
      style={{ width: size, height: size, ...style }}
    />
  );
}

// Орб + реплика «голосом» (антиква, курсив). phrase берётся из companion.js
// на месте вызова — компонент только отображает, ротацией не управляет.
export function CompanionSay({ phrase, size = 44, style }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        background: T.accentWash,
        borderRadius: T.radius.md,
        padding: "14px 16px",
        ...style,
      }}
    >
      <Orb size={size} />
      <p
        style={{
          margin: 0,
          fontFamily: T.fontSerif,
          fontStyle: "italic",
          fontSize: 15,
          lineHeight: 1.5,
          color: T.text,
        }}
      >
        {phrase}
      </p>
    </div>
  );
}
