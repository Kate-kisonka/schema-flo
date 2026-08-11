import React, { useState, useEffect, useRef } from "react";
import { T, wash } from "../constants/theme.js";
import { Orb } from "./Companion.jsx";
import { companionSay } from "../constants/companion.js";

// Дыхание 4-7-8: компаньон «Свет» ведёт практику тремя синхронными каналами
// (анимация + звук — дуэт по умолчанию; текст — независимый третий канал).
// При prefers-reduced-motion канал анимации выключен по умолчанию —
// ритм держат звук (характер тона) и число. Прерывание — без стыда.

const PHASES = [
  { key: "inhale", label: "Вдох",     dur: 4, hint: "через нос, медленно",  scale: 1.32, tone: "up"   },
  { key: "hold",   label: "Задержка", dur: 7, hint: "мягко удержи",         scale: 1.32, tone: "hold" },
  { key: "exhale", label: "Выдох",    dur: 8, hint: "через рот, со звуком", scale: 0.80, tone: "down" },
];
const TOTAL_ROUNDS = 4;
const RING_R = 78;
const RING_CIRC = 2 * Math.PI * RING_R;
const CH_KEY = "sf-breath-channels";

function readChannels(reduced) {
  try {
    const saved = JSON.parse(localStorage.getItem(CH_KEY));
    if (saved && typeof saved === "object") {
      return { motion: !reduced && !!saved.motion, sound: !!saved.sound, text: !!saved.text };
    }
  } catch { /* нет сохранённого выбора */ }
  return { motion: !reduced, sound: true, text: true };
}

export default function Breathing478() {
  const reduced = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [channels, setChannels] = useState(() => readChannels(reduced));
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [round, setRound] = useState(0);
  const [finalPhrase, setFinalPhrase] = useState(null);
  const audioRef = useRef(null);
  const toneRef = useRef(null);
  const timerRef = useRef(null);

  const phase = PHASES[phaseIdx];

  const stopTone = () => {
    const tone = toneRef.current;
    toneRef.current = null;
    if (!tone) return;
    try {
      const now = tone.ctx.currentTime;
      tone.gain.gain.cancelScheduledValues(now);
      tone.gain.gain.setValueAtTime(tone.gain.gain.value, now);
      tone.gain.gain.linearRampToValueAtTime(0, now + 0.03);
      tone.osc.stop(now + 0.04);
    } catch {
      // The oscillator may already have ended naturally.
    }
  };

  const toggleChannel = (name) => {
    if (name === "sound" && channels.sound) stopTone();
    setChannels(prev => {
      const next = { ...prev, [name]: !prev[name] };
      try { localStorage.setItem(CH_KEY, JSON.stringify(next)); } catch { /* ок */ }
      return next;
    });
  };

  const playTone = async (kind, dur) => {
    if (!channels.sound) return;
    stopTone();
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioRef.current = audioRef.current || new Ctx();
      const ctx = audioRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime;
      osc.type = "sine";
      if (kind === "up")        { osc.frequency.setValueAtTime(196, t); osc.frequency.linearRampToValueAtTime(330, t + dur); }
      else if (kind === "down") { osc.frequency.setValueAtTime(330, t); osc.frequency.linearRampToValueAtTime(174, t + dur); }
      else                      { osc.frequency.setValueAtTime(261, t); }
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(kind === "hold" ? 0.07 : 0.18, t + 0.25);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      toneRef.current = { ctx, osc, gain };
      osc.onended = () => {
        if (toneRef.current?.osc === osc) toneRef.current = null;
      };
      osc.start(t); osc.stop(t + dur + 0.05);
    } catch { /* звук недоступен — остальные каналы ведут */ }
  };

  useEffect(() => {
    if (!running) return;
    timerRef.current = setTimeout(() => {
      if (count > 1) { setCount(c => c - 1); return; }
      const nextIdx = (phaseIdx + 1) % PHASES.length;
      if (nextIdx === 0) {
        if (round + 1 >= TOTAL_ROUNDS) {
          stopTone();
          setRunning(false);
          setFinalPhrase(companionSay("breath_done"));
          setRound(0); setPhaseIdx(0); setCount(0);
          return;
        }
        setRound(r => r + 1);
      }
      setPhaseIdx(nextIdx);
      setCount(PHASES[nextIdx].dur);
      playTone(PHASES[nextIdx].tone, PHASES[nextIdx].dur);
    }, 1000);
    return () => clearTimeout(timerRef.current);
  }, [running, count, phaseIdx, round]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setFinalPhrase(null);
    setRunning(true);
    setRound(0);
    setPhaseIdx(0);
    setCount(PHASES[0].dur);
    playTone(PHASES[0].tone, PHASES[0].dur);
  };

  const stop = () => {
    clearTimeout(timerRef.current);
    stopTone();
    setRunning(false);
    setFinalPhrase(companionSay("breath_stopped"));
    setRound(0); setPhaseIdx(0); setCount(0);
  };

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    const tone = toneRef.current;
    toneRef.current = null;
    try { tone?.osc.stop(); } catch { /* already stopped */ }
    audioRef.current?.close().catch(() => {});
  }, []);

  const anyChannel = channels.motion || channels.sound || channels.text;
  const canControl = running || anyChannel;
  const orbScale = running && channels.motion ? phase.scale : 1;
  const progress = running ? (phase.dur - count) / phase.dur : 0;

  const chipStyle = (on) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    minHeight: 36, padding: "8px 13px",
    borderRadius: T.radius.pill,
    border: `1px solid ${on ? T.accentSoft : T.border}`,
    background: on ? T.accentWash : T.card,
    color: on ? T.text : T.muted,
    fontFamily: T.font, fontSize: 12, fontWeight: 600, cursor: "pointer",
    transition: `all ${T.motion.micro}`,
  });

  return (
    <div style={{ textAlign: "center", marginTop: 18 }}>
      {running && (
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 7 }}>Цикл {round + 1} из {TOTAL_ROUNDS}</div>
      )}

      <div style={{ position: "relative", width: 176, height: 176, margin: "0 auto 12px" }}>
        <svg width="176" height="176" viewBox="0 0 176 176"
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle cx="88" cy="88" r={RING_R} fill="none" stroke={T.border} strokeWidth="3" />
          {running && (
            <circle cx="88" cy="88" r={RING_R} fill="none"
              stroke={T.accent} strokeWidth="3" strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={RING_CIRC * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          )}
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${orbScale})`,
          transition: channels.motion ? `transform ${phase.dur}s ${T.motion.ease}` : "none",
        }}>
          <Orb size={112} />
        </div>
        {running && channels.text && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{
              fontFamily: T.fontSerif, fontSize: 38, lineHeight: 1,
              color: T.onAccent, fontVariantNumeric: "tabular-nums",
              textShadow: "0 1px 10px rgba(20,16,26,0.45)",
            }}>
              {count}
            </span>
          </div>
        )}
      </div>

      <div aria-live="polite">
        {running ? (
          channels.text ? (
            <>
              <div style={{ fontSize: 15, color: T.text, marginBottom: 2 }}>
                {phase.label} · {count}
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 11, fontStyle: "italic" }}>{phase.hint}</div>
            </>
          ) : (
            <div aria-hidden="true" style={{ minHeight: 43, marginBottom: 11 }} />
          )
        ) : finalPhrase ? (
          <p style={{ fontFamily: T.fontSerif, fontStyle: "italic", fontSize: 14, color: T.text, margin: "0 0 11px", lineHeight: 1.5 }}>
            {finalPhrase}
          </p>
        ) : (
          <>
            <div style={{ fontSize: 15, color: T.text, marginBottom: 2 }}>Готова?</div>
            <div style={{ fontSize: 10, color: T.muted, marginBottom: 11 }}>4 цикла · ~1.5 минуты</div>
          </>
        )}
      </div>

      <button
        onClick={running ? stop : start}
        disabled={!canControl}
        style={{
          padding: "8px 22px", borderRadius: T.radius.pill,
          border: running ? `1px solid ${T.border}` : "none",
          background: running ? "transparent" : T.accent,
          color: running ? T.sub : T.onAccent,
          cursor: canControl ? "pointer" : "not-allowed",
          opacity: canControl ? 1 : 0.5,
          fontFamily: T.font, fontSize: 13, fontWeight: 500,
        }}
      >
        {running ? "Стоп" : finalPhrase ? "Ещё раз" : "Начать"}
      </button>

      <div role="group" aria-label="Каналы ведения практики"
        style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
        <button style={chipStyle(channels.motion)} aria-pressed={channels.motion} onClick={() => toggleChannel("motion")}>Анимация</button>
        <button style={chipStyle(channels.sound)} aria-pressed={channels.sound} onClick={() => toggleChannel("sound")}>Звук</button>
        <button style={chipStyle(channels.text)} aria-pressed={channels.text} onClick={() => toggleChannel("text")}>Текст</button>
      </div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 9, padding: "8px 11px", borderRadius: T.radius.sm, border: `1px dashed ${T.border}`, background: wash(T.card, 60), lineHeight: 1.5 }}>
        {!anyChannel
          ? "Все каналы выключены — включи хотя бы один, чтобы вести практику."
          : reduced && !channels.motion
            ? "Анимация выключена (reduced motion) — ритм ведут звук и число."
            : "Практика остаётся ясной при любом одном включённом канале."}
      </div>
    </div>
  );
}
