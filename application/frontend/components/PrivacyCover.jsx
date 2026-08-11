import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const coverRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const cover = coverRef.current;
    if (!cover) return;

    const previousActiveElement = document.activeElement;
    const isolatedElements = new Map();

    const isolateElement = (element) => {
      if (element === cover || element.contains(cover) || isolatedElements.has(element)) return;
      isolatedElements.set(element, {
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden"),
      });
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    };

    Array.from(document.body.children).forEach(isolateElement);

    const bodyObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) isolateElement(node);
        });
      });
    });
    bodyObserver.observe(document.body, { childList: true });
    cover.focus();

    return () => {
      bodyObserver.disconnect();
      isolatedElements.forEach((previous, element) => {
        element.inert = previous.inert;
        if (previous.ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", previous.ariaHidden);
      });
      if (previousActiveElement instanceof HTMLElement && previousActiveElement.isConnected) {
        previousActiveElement.focus();
      }
    };
  }, [active]);

  if (!active) return null;

  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const date = now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "long" });

  return createPortal(
    <button
      ref={coverRef}
      onClick={onReveal}
      aria-label="Вернуться в приложение"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
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
    </button>,
    document.body
  );
}
