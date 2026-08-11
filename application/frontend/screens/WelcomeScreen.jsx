import React, { useState } from "react";
import { T, wash } from "../constants/theme.js";
import { CompanionSay, Orb } from "../components/Companion.jsx";
import Icon from "../components/icons.jsx";

const STEPS = [
  {
    icon: "notebook",
    title: "Отмечай день",
    text: "Настроение, тело, схемы и заметки собираются в один тихий дневник.",
  },
  {
    icon: "trendUp",
    title: "Замечай узоры",
    text: "Со временем Schema Flo показывает, что повторяется в цикле и состояниях.",
  },
  {
    icon: "openHands",
    title: "Возвращайся мягче",
    text: "Свет помогает начать запись, выбрать практику или просто побыть рядом.",
  },
];

export default function WelcomeScreen({ onGoRegister, onGoLogin }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const continueFlow = () => {
    if (isLast) {
      onGoRegister();
      return;
    }
    setStep(step + 1);
  };

  return (
    <div
      className="screen-enter"
      style={{
        minHeight: "100vh",
        background: `radial-gradient(680px 420px at 95% -10%, ${wash(T.accent, 18)}, transparent 62%), radial-gradient(560px 380px at -12% 12%, ${wash(T.blue, 13)}, transparent 58%), ${T.bg}`,
        color: T.text,
        fontFamily: T.font,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "28px 20px 22px",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Orb size={34} />
          <div>
            <div style={{ fontFamily: T.fontSerif, fontSize: 19, fontWeight: 700 }}>Schema Flo</div>
            <div style={{ fontSize: 12, color: T.muted }}>дневник цикла и состояния</div>
          </div>
        </div>
        <button type="button" onClick={onGoLogin} style={quietButton}>
          Войти
        </button>
      </header>

      <main style={{ padding: "36px 0 22px" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <Orb size={112} />
        </div>

        <h1 style={{ fontFamily: T.fontSerif, fontSize: 34, lineHeight: 1.08, fontWeight: 700, textAlign: "center", margin: "0 0 12px" }}>
          Давай начнем спокойно
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: T.sub, textAlign: "center", margin: "0 auto 22px", maxWidth: 330 }}>
          Здесь не нужно все заполнять идеально. Достаточно заметить, как ты сейчас.
        </p>

        <CompanionSay
          phrase="Я проведу тебя: сначала покажу, что здесь есть, потом сохраним твой первый день."
          size={42}
          style={{ marginBottom: 18 }}
        />

        <section className="sf-glass sf-glass--soft" style={{ borderRadius: T.radius.md, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: T.radius.sm, background: wash(T.accent, 16), color: T.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={current.icon} size={21} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>
                {step + 1} / {STEPS.length}
              </div>
              <h2 style={{ fontSize: 18, margin: "0 0 5px", fontWeight: 700 }}>{current.title}</h2>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: T.sub, margin: 0 }}>{current.text}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
            {STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Шаг ${index + 1}`}
                onClick={() => setStep(index)}
                style={{ flex: 1, height: 5, border: "none", borderRadius: T.radius.pill, background: index === step ? T.accent : T.border, cursor: "pointer" }}
              />
            ))}
          </div>
        </section>
      </main>

      <footer style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button type="button" onClick={continueFlow} style={primaryButton}>
          {isLast ? "Создать аккаунт" : "Дальше"}
        </button>
        <button type="button" onClick={onGoLogin} style={secondaryButton}>
          У меня уже есть аккаунт
        </button>
      </footer>
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

const secondaryButton = {
  width: "100%",
  minHeight: 44,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm,
  background: T.card,
  color: T.sub,
  fontFamily: T.font,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const quietButton = {
  border: `1px solid ${T.border}`,
  borderRadius: T.radius.sm,
  background: wash(T.card, 82),
  color: T.sub,
  fontFamily: T.font,
  fontSize: 13,
  fontWeight: 600,
  padding: "8px 12px",
  cursor: "pointer",
};
