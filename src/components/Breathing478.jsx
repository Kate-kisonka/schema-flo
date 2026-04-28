import React, { useState, useEffect } from "react";

export default function Breathing478() {
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(0);
  const [round, setRound] = useState(0);
  const totalRounds = 4;
  const steps = [
    { label: "Готова?", duration: 0, color: "#8B7355", hint: "" },
    { label: "Вдох", duration: 4, color: "#7EC8B0", hint: "через нос, медленно" },
    { label: "Задержка", duration: 7, color: "#E9C46A", hint: "не дышать" },
    { label: "Выдох", duration: 8, color: "#74B3CE", hint: "через рот, со звуком" },
  ];
  const cur = steps[step];

  useEffect(() => {
    if (step === 0) return;
    if (count > 0) { const t = setTimeout(() => setCount(c=>c-1), 1000); return () => clearTimeout(t); }
    if (step < 3) { const ns = step+1; setStep(ns); setCount(steps[ns].duration); }
    else if (round+1 < totalRounds) { setRound(r=>r+1); setStep(1); setCount(steps[1].duration); }
    else { setStep(0); setRound(0); }
  }, [step, count]);

  const start = () => { setStep(1); setCount(steps[1].duration); setRound(0); };
  const stop = () => { setStep(0); setCount(0); setRound(0); };
  const scale = step === 1 ? 1.35 : step === 3 ? 0.8 : 1;
  const progress = step > 0 ? ((steps[step].duration - count) / steps[step].duration) * 100 : 0;
  const r = 48, circ = 2 * Math.PI * r;

  return (
    <div style={{ textAlign: "center", marginTop: 18 }}>
      {step > 0 && <div style={{ fontSize: 10, color: "#8B7355", marginBottom: 7 }}>Цикл {round+1} из {totalRounds}</div>}
      <div style={{ position: "relative", width: 110, height: 110, margin: "0 auto 14px" }}>
        <svg width="110" height="110" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
          <circle cx="55" cy="55" r={r} fill="none" stroke={cur.color+"22"} strokeWidth="4" />
          {step > 0 && <circle cx="55" cy="55" r={r} fill="none" stroke={cur.color} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={circ*(1-progress/100)}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }} />}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", transform: `scale(${scale})`, transition: "transform 1s ease" }}>
          {step > 0 && <div style={{ fontSize: 24, fontWeight: "bold", color: cur.color, lineHeight: 1 }}>{count}</div>}
          <div style={{ fontSize: step>0?10:11, color: "#5C4A32", marginTop: step>0?2:0 }}>{cur.label}</div>
        </div>
      </div>
      {step > 0 && <div style={{ fontSize: 11, color: "#8B7355", marginBottom: 11, fontStyle: "italic" }}>{cur.hint}</div>}
      <button onClick={step===0?start:stop} style={{ padding: "8px 22px", borderRadius: 16, border: "1px solid #E8E0D5", background: step>0?"#E76F51":"#2C2416", color: "#F5F0EB", cursor: "pointer", fontFamily: "'Georgia',serif", fontSize: 13 }}>
        {step > 0 ? "Стоп" : "Начать"}
      </button>
      {step===0&&round===0&&<div style={{fontSize:10,color:"#8B7355",marginTop:7}}>4 цикла · ~1.5 минуты</div>}
      {step===0&&round>0&&<div style={{fontSize:13,color:"#7EC8B0",marginTop:8}}>✓ Готово! Как ты?</div>}
    </div>
  );
}
