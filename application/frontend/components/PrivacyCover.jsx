import React, { useEffect, useState } from "react";
import { T } from "../constants/theme.js";

// ── Приватность как механика, не декларация ──────────────────────────
// Нейтральная обложка-«часы» поверх приложения:
//  1) быстрый выход — кнопка «Скрыть» в нижней навигации мгновенно
//     закрывает чувствительный экран нейтральным содержимым;
//  2) авто-маскировка — при уходе приложения в фон (переключение задач,
//     блокировка) обложка включается сама, чтобы превью в списке задач
//     не показывало данные о психике и цикле.
// Возврат — по касанию. Данных на обложке нет, только время.

export default function PrivacyCover({ active, onReveal }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [active]);

  if (!active) return null;

  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });

  return (
    <button
      onClick={onReveal}
      aria-label="Вернуться в приложение"
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        width: "100%", border: "none", cursor: "pointer",
        background: T.heroBg, color: T.onHero,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        fontFamily: T.font,
      }}
    >
      <div style={{ fontFamily: T.fontSerif, fontSize: 56, lineHeight: 1, letterSpacing: "-0.01em" }}>
        {time}
      </div>
      <div style={{ fontSize: 14, opacity: 0.75 }}>{date}</div>
      <div style={{ fontSize: 12, opacity: 0.55, marginTop: 24 }}>
        Нажми, чтобы вернуться
      </div>
    </button>
  );
}
