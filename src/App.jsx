import React, { useState, useEffect, useRef } from "react";
import {
  SCHEMAS, MOODS, MOODS_BASIC, MOODS_EXTENDED, CYCLE_PHASES, PHYSICAL_SYMPTOMS, DISCHARGE_TYPES,
  DIGESTION, LIBIDO, NEEDS, NEED_LEVELS, EXERCISES, QUICK_STATES, DOMAINS,
} from "./data";
import { getPhase, getTodayKey, formatDate, getDayOfWeek, load, save } from "./utils";
import Breathing478 from "./components/Breathing478";

// ─── THEME ─────────────────────────────────────────────────────────────────────

const T = {
  bg: "transparent",
  card: "#FFFFFF",
  border: "#EDE8F5",
  text: "#1A1028",
  muted: "#8B7AA0",
  accent: "#7C3AED",
  accent2: "#F97316",
  soft: "#F3EEFF",
  font: "'Inter', system-ui, -apple-system, sans-serif",
};

// ─── APP ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Navigation
  const [screen, setScreen] = useState("home");

  // Cycle
  const [cycleDay, setCycleDay] = useState(load("cycleDay", 14));
  const [periodStartDate, setPeriodStartDate] = useState(load("period_start_date", null));
  const [periodActive, setPeriodActive] = useState(load("period_active", false));
  const [periodHistory, setPeriodHistory] = useState(load("period_history", []));
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [showFlowQuestion, setShowFlowQuestion] = useState(false);

  // Daily diary — step-by-step
  const [diaryStep, setDiaryStep] = useState(0); // 0=mood 1=body 2=schemas 3=notes 4=done
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [intensity, setIntensity] = useState(5);
  const [discharge, setDischarge] = useState(null);
  const [digestion, setDigestion] = useState(null);
  const [symptoms, setSymptoms] = useState([]);
  const [libido, setLibido] = useState(null);
  const [symptomNotes, setSymptomNotes] = useState("");
  const [activeSchemas, setActiveSchemas] = useState([]);
  const [notes, setNotes] = useState("");
  const [completedExercises, setCompletedExercises] = useState([]);

  // Logs
  const [logs, setLogs] = useState(load("schema_logs", []));

  // AI / Support
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showQuickStates, setShowQuickStates] = useState(true);
  const [showExtendedMoods, setShowExtendedMoods] = useState(false);
  const [aiSessions, setAiSessions] = useState(load("ai_sessions", []));
  const [currentSession, setCurrentSession] = useState(null);
  const [phaseExpanded, setPhaseExpanded] = useState(false);
  const [schemaPopup, setSchemaPopup] = useState(null); // schema object to show in popup

  // Exercises
  const [activeExercise, setActiveExercise] = useState(null);
  const [exerciseTab, setExerciseTab] = useState("crisis");

  // Silence
  const [silenceActive, setSilenceActive] = useState(load("silence_active", false));
  const [silenceStartDate, setSilenceStartDate] = useState(load("silence_start_date", null));
  const [silenceDays, setSilenceDays] = useState(load("silence_days", 14));
  const [silenceLogs, setSilenceLogs] = useState(load("silence_logs", []));
  const [needsChecked, setNeedsChecked] = useState([]);
  const [morningNote, setMorningNote] = useState("");
  const [goodDone, setGoodDone] = useState("");
  const [goodTomorrow, setGoodTomorrow] = useState("");

  // History
  const [selectedLog, setSelectedLog] = useState(null);
  const [historyTab, setHistoryTab] = useState("list");

  const [supportTab, setSupportTab] = useState("chat");
  const [saved, setSaved] = useState(false);
  const messagesEndRef = useRef(null);
  const phase = getPhase(cycleDay);

  // Auto-calc cycle day every time app opens
  useEffect(() => {
    if (periodStartDate) {
      const diff = Math.floor((new Date(getTodayKey()) - new Date(periodStartDate)) / 86400000) + 1;
      const day = Math.min(Math.max(diff, 1), 28);
      setCycleDay(day); save("cycleDay", day);
    }
  }, []); // runs on mount - recalcs from stored periodStartDate

  // Auto-end period day 6
  useEffect(() => {
    if (periodActive && cycleDay >= 6) { setPeriodActive(false); save("period_active", false); }
  }, [cycleDay]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  // ── Period ────────────────────────────────────────────────────────────────

  const startPeriod = (flowIntensity) => {
    const today = getTodayKey();
    const cycleLength = periodStartDate ? Math.floor((new Date(today) - new Date(periodStartDate)) / 86400000) : null;
    const newHistory = [{ date: today, flowIntensity, cycleLength }, ...periodHistory];
    setPeriodHistory(newHistory); setPeriodStartDate(today);
    setCycleDay(1); setPeriodActive(true);
    setShowPeriodConfirm(false); setShowFlowQuestion(false);
    save("period_start_date", today); save("period_history", newHistory);
    save("cycleDay", 1); save("period_active", true);
  };

  const endPeriod = () => { setPeriodActive(false); save("period_active", false); };

  // ── Save day ──────────────────────────────────────────────────────────────

  const saveDay = () => {
    const entry = {
      date: getTodayKey(), cycleDay, phase: phase.name,
      moods: selectedMoods, intensity, schemas: activeSchemas, notes,
      discharge, digestion, symptoms, libido, symptomNotes,
      exercises: completedExercises,
    };
    const newLogs = [entry, ...logs.filter(l => l.date !== getTodayKey())];
    setLogs(newLogs); save("schema_logs", newLogs);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    setDiaryStep(4);
  };

  // ── Silence ───────────────────────────────────────────────────────────────

  const startSilence = () => {
    const today = getTodayKey();
    setSilenceStartDate(today); setSilenceActive(true);
    save("silence_start_date", today); save("silence_days", silenceDays); save("silence_active", true);
  };

  const saveSilenceDay = () => {
    const entry = { date: getTodayKey(), dayNum: silenceDayNum(), needsChecked, morningNote, goodDone, goodTomorrow };
    const newLogs = [entry, ...silenceLogs.filter(l => l.date !== getTodayKey())];
    setSilenceLogs(newLogs); save("silence_logs", newLogs);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const silenceDayNum = () => {
    if (!silenceStartDate) return 0;
    return Math.min(Math.floor((new Date(getTodayKey()) - new Date(silenceStartDate)) / 86400000) + 1, silenceDays);
  };

  // ── AI ────────────────────────────────────────────────────────────────────

  const saveAiSession = (messages) => {
    const sessionId = currentSession || Date.now().toString();
    const session = {
      id: sessionId,
      date: getTodayKey(),
      cycleDay,
      phase: phase.name,
      title: messages[0]?.content?.slice(0, 60) || "Сессия",
      messages,
    };
    setAiSessions(prev => {
      const updated = currentSession
        ? prev.map(s => s.id === currentSession ? session : s)
        : [session, ...prev];
      save("ai_sessions", updated);
      return updated;
    });
    setCurrentSession(sessionId);
  };

  const sendToAI = async (overrideInput) => {
    const text = overrideInput || aiInput;
    if (!text.trim()) return;
    setShowQuickStates(false);
    const userMsg = { role: "user", content: text };
    const newMessages = [...aiMessages, userMsg];
    setAiMessages(newMessages); setAiInput(""); setAiLoading(true);

    const ctx = `Ты — тёплый психологический ассистент, специализируешься на схема-терапии Янга и КПТ.
Контекст: день цикла ${cycleDay} (${phase.name}), схемы: ${activeSchemas.map(id=>SCHEMAS.find(s=>s.id===id)?.name).join(", ")||"не указаны"}, настроение: ${selectedMoods.map(id=>MOODS.find(m=>m.id===id)?.label).join(", ")||"не указано"}, интенсивность: ${intensity}/10.
Стиль: тёплый, без осуждения, конкретный. Сначала валидируй — потом предлагай. Отвечай на русском.`;

    try {
      const res = await fetch("https://schema-flo.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, context: ctx }),
      });
      const data = await res.json();
      const reply = data.reply || "Что-то пошло не так.";
      const finalMessages = [...newMessages, { role: "assistant", content: reply }];
      setAiMessages(finalMessages);
      saveAiSession(finalMessages);
    } catch {
      const errMessages = [...newMessages, { role: "assistant", content: "Не удалось подключиться." }];
      setAiMessages(errMessages);
    }
    setAiLoading(false);
  };

  const getAIRecommendations = async () => {
    const schemaNames = activeSchemas.map(id => SCHEMAS.find(s=>s.id===id)?.name).filter(Boolean).join(", ");
    const prompt = `На основании заметки предложи 2-3 конкретные техники (схема-терапия или КПТ). Для каждой: название + одна фраза почему подходит.

Заметка: "${notes}"
Схемы: ${schemaNames || "не указаны"}, Фаза: ${phase.name}, Настроение: ${selectedMoods.map(id=>MOODS.find(m=>m.id===id)?.label).join(", ")||"не указано"}

Отвечай коротко, без вступлений.`;
    setScreen("support"); setShowQuickStates(false);
    const userMsg = { role: "user", content: prompt };
    setAiMessages(prev => [...prev, userMsg]); setAiLoading(true);
    try {
      const ctx = "Ты психологический ассистент. Кратко и конкретно на русском.";
      const res = await fetch("https://schema-flo.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [userMsg], context: ctx }),
      });
      const data = await res.json();
      const reply = data.reply || "Не удалось получить рекомендации.";
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Не удалось подключиться." }]);
    }
    setAiLoading(false);
  };

  // ── Toggles ───────────────────────────────────────────────────────────────

  const toggleMood = (id) => setSelectedMoods(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleSchema = (id) => setActiveSchemas(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleSymptom = (id) => setSymptoms(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const toggleNeed = (id) => setNeedsChecked(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  // ── Styles ────────────────────────────────────────────────────────────────

  const S = {
    app: { minHeight: "100vh", background: T.bg, fontFamily: T.font, color: T.text },
    nav: { display: "flex", borderTop: `1px solid ${T.border}`, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 20 },
    navBtn: (a) => ({ flex: 1, padding: "10px 2px 14px", border: "none", background: "none", fontSize: 9, color: a ? T.accent : T.muted, cursor: "pointer", fontFamily: T.font, borderTop: a ? `2px solid ${T.accent}` : "2px solid transparent", fontWeight: a ? "600" : "400" }),
    content: { padding: "0 16px 100px" },
    card: { background: T.card, borderRadius: 20, padding: "16px", marginBottom: 12, border: `1px solid ${T.border}`, boxShadow: "0 2px 12px rgba(124,58,237,0.06), 0 1px 3px rgba(0,0,0,0.05)" },
    st: { fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "600" },
    textarea: { width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${T.border}`, background: "#FAFAFA", fontFamily: T.font, fontSize: 14, color: T.text, resize: "none", boxSizing: "border-box", lineHeight: 1.6 },
    chip: (a, color) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${a ? color : T.border}`, background: a ? color+"18" : "#FAFAFA", cursor: "pointer", fontSize: 12, marginRight: 5, marginBottom: 5, fontFamily: T.font, fontWeight: a ? "600" : "400" }),
    primaryBtn: (color) => ({ width: "100%", padding: "15px", background: color || `linear-gradient(135deg, #7C3AED 0%, #9F67F5 100%)`, color: "#fff", border: "none", borderRadius: 14, fontSize: 15, cursor: "pointer", fontFamily: T.font, fontWeight: "600", letterSpacing: "0.01em", boxShadow: color ? `0 4px 14px ${color}55` : "0 4px 20px rgba(124,58,237,0.4)" }),
    ghostBtn: { width: "100%", padding: "13px", background: T.card, color: T.muted, border: `1.5px solid ${T.border}`, borderRadius: 14, fontSize: 13, cursor: "pointer", fontFamily: T.font, fontWeight: "500" },
    stepDot: (active, done) => ({ width: 8, height: 8, borderRadius: "50%", background: done ? T.accent : active ? T.text : T.border, transition: "all 0.3s", boxShadow: (done || active) ? `0 0 8px ${T.accent}99` : "none" }),
  };

  const cycleColors = CYCLE_PHASES.flatMap(p => p.days.map(d => ({ day: d, color: p.color })));

  // ── RENDER HOME (step-by-step diary) ─────────────────────────────────────

  const DIARY_STEPS = ["Настроение", "Тело", "Схемы", "Заметки"];

  const renderHome = () => {
    const todayLog = logs.find(l => l.date === getTodayKey());

    return (
      <div>
        {/* Header */}
        <div style={{ background: `linear-gradient(160deg, ${phase.color}22 0%, transparent 100%)`, padding: "28px 16px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: "700", lineHeight: 1, letterSpacing: "-0.5px" }}>{new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4, fontWeight: "400" }}>{new Date().toLocaleDateString("ru-RU", { weekday: "long" })}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: phase.color+"22", border: `1px solid ${phase.color}55`, borderRadius: 20, padding: "5px 12px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: phase.color }} />
                <div style={{ fontSize: 12, color: phase.color, fontWeight: "600" }}>{phase.name}</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: "700", color: T.text, lineHeight: 1, marginTop: 6, letterSpacing: "-0.5px" }}>День {cycleDay}</div>
            </div>
          </div>

          {/* Phase bar */}
          <div style={{ background: phase.color+"15", borderLeft: `3px solid ${phase.color}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{phase.mentalComment}</div>
          </div>

          {/* Cycle strip */}
          <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
            {Array.from({length:28},(_,i)=>i+1).map(d => {
              const cc = cycleColors.find(x=>x.day===d);
              return <div key={d} onClick={() => { setCycleDay(d); save("cycleDay",d); }}
                style={{ flex:1, height: d===cycleDay?6:4, borderRadius:3, background: cc?cc.color:T.border, opacity: d===cycleDay?1:0.35, cursor:"pointer", transition:"all 0.2s" }} />;
            })}
          </div>

          {/* Period button */}
          {periodActive && cycleDay <= 5 ? (
            <button onClick={endPeriod} style={{ ...S.ghostBtn, marginBottom: 14, color: "#5C9E8A", borderColor: "#7EC8B066" }}>✓ Месячные завершились</button>
          ) : showFlowQuestion ? (
            <div style={{ background: "#E76F5110", borderRadius: 10, padding: 12, marginBottom: 14, border: "1px solid #E76F5144" }}>
              <div style={{ fontSize: 12, color: "#E76F51", marginBottom: 9 }}>Интенсивность выделений?</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                {[{id:"light",e:"🌸",l:"Скудные"},{id:"medium",e:"🩸",l:"Умеренные"},{id:"heavy",e:"💧",l:"Обильные"},{id:"very_heavy",e:"🌊",l:"Очень"}].map(f => (
                  <button key={f.id} onClick={() => startPeriod(f.id)}
                    style={{ flex:1, padding:"7px 2px", borderRadius:8, border:"1px solid #E76F5144", background:"#E76F5108", cursor:"pointer", fontFamily:T.font, fontSize:10, color:"#E76F51", textAlign:"center" }}>
                    <div>{f.e}</div><div style={{marginTop:2}}>{f.l}</div>
                  </button>
                ))}
              </div>
              <button onClick={()=>{setShowFlowQuestion(false);setShowPeriodConfirm(false);}} style={{...S.ghostBtn, fontSize:11, padding:"6px"}}>Отмена</button>
            </div>
          ) : showPeriodConfirm ? (
            <div style={{ background:"#E76F5110", borderRadius:10, padding:12, marginBottom:14, border:"1px solid #E76F5144" }}>
              <div style={{ fontSize:12, color:"#E76F51", marginBottom:9 }}>Начать новый цикл сегодня?</div>
              <div style={{ display:"flex", gap:7 }}>
                <button onClick={()=>{setShowPeriodConfirm(false);setShowFlowQuestion(true);}} style={{flex:1,padding:"7px",borderRadius:8,border:"none",background:"#E76F51",color:"#fff",cursor:"pointer",fontFamily:T.font,fontSize:12}}>Да</button>
                <button onClick={()=>setShowPeriodConfirm(false)} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.border}`,background:"none",cursor:"pointer",fontFamily:T.font,fontSize:12,color:T.muted}}>Отмена</button>
              </div>
            </div>
          ) : !periodActive && (
            <button onClick={()=>setShowPeriodConfirm(true)} style={{...S.ghostBtn, marginBottom:14, color:"#E76F51", borderColor:"#E76F5166"}}>🩸 Начались месячные</button>
          )}
        </div>

        {/* Step-by-step diary */}
        <div style={{ padding: "0 15px 90px" }}>
          {diaryStep === 4 && todayLog ? (
            // Done state
            <div style={{ ...S.card, textAlign:"center", background: "#7EC8B010", borderColor:"#7EC8B044" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>✓</div>
              <div style={{ fontSize:15, marginBottom:4 }}>День сохранён</div>
              <div style={{ fontSize:12, color:T.muted, marginBottom:14 }}>Молодец — ты отследила своё состояние</div>
              <button onClick={()=>{
                if (todayLog) {
                  setSelectedMoods(todayLog.moods || []);
                  setIntensity(todayLog.intensity || 5);
                  setActiveSchemas(todayLog.schemas || []);
                  setSymptoms(todayLog.symptoms || []);
                  setDischarge(todayLog.discharge || null);
                  setDigestion(todayLog.digestion || null);
                  setLibido(todayLog.libido || null);
                  setNotes(todayLog.notes || "");
                }
                setDiaryStep(0);
              }} style={{...S.ghostBtn}}>Редактировать</button>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, marginBottom:16 }}>
                {DIARY_STEPS.map((label,i) => (
                  <React.Fragment key={i}>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }} onClick={()=>setDiaryStep(i)}>
                      <div style={S.stepDot(diaryStep===i, diaryStep>i)} />
                      <div style={{ fontSize:9, color: diaryStep===i ? T.text : T.muted }}>{label}</div>
                    </div>
                    {i < DIARY_STEPS.length-1 && <div style={{ flex:1, height:1, background: diaryStep>i ? "#7EC8B0" : T.border, marginBottom:12, maxWidth:30 }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* Step 0 — Moods */}
              {diaryStep === 0 && (
                <div style={S.card}>
                  <p style={S.st}>Как ты сейчас? (выбери всё что есть)</p>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:8 }}>
                    {MOODS_BASIC.map(m => (
                      <button key={m.id} style={{ padding:"8px 2px", borderRadius:10, border:`2px solid ${selectedMoods.includes(m.id)?m.color:T.border}`, background:selectedMoods.includes(m.id)?m.color+"22":"transparent", cursor:"pointer", textAlign:"center", fontFamily:T.font }} onClick={()=>toggleMood(m.id)}>
                        <div style={{fontSize:19}}>{m.emoji}</div>
                        <div style={{fontSize:9,color:"#6B5A80",marginTop:2}}>{m.label}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={()=>setShowExtendedMoods(v=>!v)} style={{width:"100%",padding:"6px",borderRadius:8,border:`1px dashed ${T.border}`,background:"transparent",cursor:"pointer",fontFamily:T.font,fontSize:11,color:T.muted,marginBottom:8}}>
                    {showExtendedMoods ? "▲ Скрыть полутона" : "▼ Полутона и оттенки"}
                  </button>
                  {showExtendedMoods && (
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:8 }}>
                      {MOODS_EXTENDED.map(m => (
                        <button key={m.id} style={{ padding:"8px 2px", borderRadius:10, border:`2px solid ${selectedMoods.includes(m.id)?m.color:T.border}`, background:selectedMoods.includes(m.id)?m.color+"22":"transparent", cursor:"pointer", textAlign:"center", fontFamily:T.font }} onClick={()=>toggleMood(m.id)}>
                          <div style={{fontSize:19}}>{m.emoji}</div>
                          <div style={{fontSize:9,color:"#6B5A80",marginTop:2}}>{m.label}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div style={{marginBottom:6}}></div>
                  <p style={S.st}>Интенсивность · {intensity}/10</p>
                  <input type="range" min={1} max={10} value={intensity} onChange={e=>setIntensity(Number(e.target.value))} style={{width:"100%",accentColor:T.accent,marginBottom:4}} />
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted}}><span>Лёгко</span><span>Невыносимо</span></div>
                  <button style={{...S.primaryBtn(), marginTop:14}} onClick={()=>setDiaryStep(1)}>Далее →</button>
                </div>
              )}

              {/* Step 1 — Body */}
              {diaryStep === 1 && (
                <div style={S.card}>
                  <p style={S.st}>Тело сегодня</p>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Выделения</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:10}}>
                    {DISCHARGE_TYPES.map(d=><button key={d.id} style={S.chip(discharge===d.id,T.accent)} onClick={()=>setDischarge(discharge===d.id?null:d.id)}>{d.emoji} {d.label}</button>)}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Пищеварение</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:10}}>
                    {DIGESTION.map(d=><button key={d.id} style={S.chip(digestion===d.id,"#7EC8B0")} onClick={()=>setDigestion(digestion===d.id?null:d.id)}>{d.emoji} {d.label}</button>)}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Либидо</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:10}}>
                    {LIBIDO.map(l=><button key={l.id} style={S.chip(libido===l.id,"#E9C46A")} onClick={()=>setLibido(libido===l.id?null:l.id)}>{l.emoji} {l.label}</button>)}
                  </div>
                  <div style={{fontSize:10,color:T.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>Симптомы</div>
                  <div style={{display:"flex",flexWrap:"wrap",marginBottom:12}}>
                    {PHYSICAL_SYMPTOMS.map(s=><button key={s.id} style={S.chip(symptoms.includes(s.id),"#E76F51")} onClick={()=>toggleSymptom(s.id)}>{s.emoji} {s.label}</button>)}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...S.ghostBtn,flex:1}} onClick={()=>setDiaryStep(0)}>← Назад</button>
                    <button style={{...S.primaryBtn(),flex:2}} onClick={()=>setDiaryStep(2)}>Далее →</button>
                  </div>
                </div>
              )}

              {/* Step 2 — Schemas */}
              {diaryStep === 2 && (
                <div style={S.card}>
                  <p style={S.st}>Активные схемы сегодня</p>
                  {/* Frequent schemas first */}
                  {(() => {
                    const freq = {};
                    logs.flatMap(l=>l.schemas||[]).forEach(id=>{freq[id]=(freq[id]||0)+1;});
                    const topIds = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([id])=>id);
                    return topIds.length > 0 ? (
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:10,color:T.muted,marginBottom:6}}>Твои частые схемы</div>
                        {SCHEMAS.filter(s=>topIds.includes(s.id)).map(schema=>(
                          <div key={schema.id} style={{display:"flex",alignItems:"center",padding:"8px 10px",borderRadius:8,border:`1px solid ${activeSchemas.includes(schema.id)?T.accent:T.border}`,background:activeSchemas.includes(schema.id)?T.accent+"15":"transparent",marginBottom:4,cursor:"pointer"}} onClick={()=>toggleSchema(schema.id)} onDoubleClick={()=>setSchemaPopup(schema)}>
                            <span style={{marginRight:8,fontSize:14}}>{schema.emoji}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12}}>{schema.name}</div>
                              <div style={{fontSize:10,color:T.muted}}>{schema.desc}</div>
                            </div>
                            {activeSchemas.includes(schema.id)&&<span style={{color:T.accent}}>✓</span>}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  <details style={{marginBottom:12}}>
                    <summary style={{fontSize:12,color:T.muted,cursor:"pointer",marginBottom:8}}>Все 18 схем ▾ (нажми чтобы раскрыть)</summary>
                    {DOMAINS.map(domain=>(
                      <div key={domain}>
                        <div style={{fontSize:9,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4,marginTop:8}}>{domain}</div>
                        {SCHEMAS.filter(sc=>sc.domain===domain).map(schema=>(
                          <div key={schema.id} style={{display:"flex",alignItems:"center",padding:"7px 9px",borderRadius:7,border:`1px solid ${activeSchemas.includes(schema.id)?T.accent:T.border}`,background:activeSchemas.includes(schema.id)?T.accent+"15":"transparent",marginBottom:3,cursor:"pointer"}} onClick={()=>toggleSchema(schema.id)} onDoubleClick={()=>setSchemaPopup(schema)}>
                            <span style={{marginRight:7,fontSize:13}}>{schema.emoji}</span>
                            <span style={{fontSize:11}}>{schema.name}</span>
                            {activeSchemas.includes(schema.id)&&<span style={{marginLeft:"auto",color:T.accent}}>✓</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </details>
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...S.ghostBtn,flex:1}} onClick={()=>setDiaryStep(1)}>← Назад</button>
                    <button style={{...S.primaryBtn(),flex:2}} onClick={()=>setDiaryStep(3)}>Далее →</button>
                  </div>
                </div>
              )}

              {/* Step 3 — Notes */}
              {diaryStep === 3 && (
                <div style={S.card}>
                  <p style={S.st}>Заметки дня</p>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="Что происходит? Что заметила? Можно просто поток мыслей..." style={{...S.textarea, marginBottom:10}} />
                  {notes.trim().length > 20 && (
                    <button onClick={getAIRecommendations} style={{width:"100%",padding:"9px",borderRadius:8,border:`1px solid ${T.accent}66`,background:T.accent+"10",color:T.accent,cursor:"pointer",fontFamily:T.font,fontSize:12,marginBottom:10}}>
                      ✨ Получить рекомендации по заметке
                    </button>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button style={{...S.ghostBtn,flex:1}} onClick={()=>setDiaryStep(2)}>← Назад</button>
                    <button style={{...S.primaryBtn(saved?"#7EC8B0":T.text),flex:2}} onClick={saveDay}>{saved?"✓ Сохранено":"Сохранить день"}</button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Phase medical card - collapsible */}
          <div style={{...S.card, borderLeft:`3px solid ${phase.color}`, cursor:"pointer"}} onClick={()=>setPhaseExpanded(e=>!e)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <p style={{...S.st,color:phase.color,margin:0}}>Что происходит в теле</p>
              <span style={{fontSize:11,color:T.muted,transition:"transform 0.2s",display:"inline-block",transform:phaseExpanded?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
            </div>
            {!phaseExpanded && <p style={{fontSize:12,color:T.muted,margin:"6px 0 0",lineHeight:1.5,fontStyle:"italic"}}>{phase.tip}</p>}
            {phaseExpanded && (
              <div style={{marginTop:10}}>
                <p style={{fontSize:12,color:"#6B5A80",lineHeight:1.7,margin:"0 0 8px"}}>{phase.gynComment}</p>
                <div style={{fontSize:10,color:phase.color,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Психологически</div>
                <p style={{fontSize:12,color:"#6B5A80",lineHeight:1.7,margin:0}}>{phase.mentalComment}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER PRACTICES ──────────────────────────────────────────────────────

  const renderPractices = () => {
    const tabs = [
      { id: "crisis", label: "🆘 Кризис", color: "#E76F51" },
      { id: "schema", label: "🧸 Схема", color: T.accent },
      { id: "cbt", label: "🧠 КПТ", color: "#74B3CE" },
      { id: "silence", label: "🤫 Тишина", color: "#5C8A6B" },
    ];
    const currentColor = tabs.find(t=>t.id===exerciseTab)?.color || T.accent;

    if (activeExercise) {
      return (
        <div style={S.content}>
          <button onClick={()=>setActiveExercise(null)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",marginBottom:12,fontFamily:T.font,fontSize:13,padding:"16px 0 0"}}>← Назад</button>
          <div style={{...S.card, borderLeft:`3px solid ${currentColor}`}}>
            <div style={{fontSize:26,marginBottom:8}}>{activeExercise.icon}</div>
            <div style={{fontSize:18,marginBottom:5}}>{activeExercise.name}</div>
            <div style={{fontSize:11,color:T.muted,marginBottom:12}}>⏱ {activeExercise.duration}</div>
            <div style={{fontSize:13,lineHeight:1.7,marginBottom:16}}>{activeExercise.desc}</div>
            {activeExercise.id === "breathing_478" && <Breathing478 />}
            {activeExercise.id === "thought_record" && (
              <div>
                {["Ситуация","Автоматическая мысль","Эмоция (0–100%)","Альтернативная мысль","Результат"].map(label=>(
                  <div key={label} style={{marginBottom:9}}>
                    <div style={{fontSize:10,color:T.muted,marginBottom:3}}>{label}</div>
                    <textarea rows={2} style={S.textarea} placeholder="..." />
                  </div>
                ))}
              </div>
            )}
            {activeExercise.id === "inner_child" && <textarea rows={6} style={{...S.textarea,marginTop:4}} placeholder="Дорогая маленькая я..." />}
            {activeExercise.id === "healthy_adult" && <textarea rows={5} style={{...S.textarea,marginTop:4}} placeholder="Я слышу тебя..." />}
            {activeExercise.id === "needs_ex" && <textarea rows={4} style={{...S.textarea,marginTop:4}} placeholder="Прямо сейчас мне нужно..." />}
            <button onClick={()=>{setCompletedExercises(p=>[...new Set([...p,activeExercise.id])]);setActiveExercise(null);}} style={{...S.primaryBtn("#7EC8B0"),marginTop:16}}>✓ Выполнено</button>
          </div>
        </div>
      );
    }

    // Silence tab
    if (exerciseTab === "silence") {
      const dayNum = silenceDayNum();
      const progress = silenceDays > 0 ? (dayNum / silenceDays) * 100 : 0;
      return (
        <div style={S.content}>
          <div style={{padding:"16px 0 0"}}>
          <div style={{display:"flex",gap:3,marginBottom:14,background:T.card,padding:3,borderRadius:9,border:`1px solid ${T.border}`}}>
            {[{id:"crisis",label:"🆘 Кризис"},{id:"schema",label:"🧸 Схема"},{id:"cbt",label:"🧠 КПТ"},{id:"silence",label:"🤫 Тишина"}].map(t=><button key={t.id} style={{flex:1,padding:"7px 2px",border:"none",background:exerciseTab===t.id?T.text:"transparent",color:exerciseTab===t.id?T.bg:T.muted,borderRadius:7,cursor:"pointer",fontFamily:T.font,fontSize:10}} onClick={()=>setExerciseTab(t.id)}>{t.label}</button>)}
          </div>
          {!silenceActive ? (
            <>
              <div style={{...S.card,textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8}}>🤫</div>
                <div style={{fontSize:17,marginBottom:6}}>Практика #Тишины</div>
                <div style={{fontSize:12,color:T.muted,lineHeight:1.7,marginBottom:14}}>Ежедневная практика для перехода через кризис — чек-ап потребностей, движение, письменный монолог, два вопроса дня.</div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:T.muted,marginBottom:5}}>Длительность (дней)</div>
                  <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
                    <button onClick={()=>setSilenceDays(d=>Math.max(14,d-7))} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${T.border}`,background:"none",fontSize:16,cursor:"pointer"}}>−</button>
                    <div style={{fontSize:32}}>{silenceDays}</div>
                    <button onClick={()=>setSilenceDays(d=>d+7)} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${T.border}`,background:"none",fontSize:16,cursor:"pointer"}}>+</button>
                  </div>
                </div>
                <button onClick={startSilence} style={S.primaryBtn("#5C8A6B")}>Начать практику</button>
              </div>
              <div style={{...S.card,background:"#1A102808"}}>
                <p style={{...S.st,marginBottom:8}}>Как работает</p>
                {["Утром: чек-ап потребностей по пирамиде Маслоу","В течение дня: движение / танец в своём состоянии","После движения: записать мысли и чувства","Вечером: два вопроса дня"].map((text,i)=>(
                  <div key={i} style={{display:"flex",gap:9,marginBottom:9,alignItems:"flex-start"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:T.text,color:T.bg,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                    <div style={{fontSize:12,color:"#6B5A80",lineHeight:1.5}}>{text}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{...S.card,background:T.text,color:T.bg,marginTop:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:12,opacity:0.7}}>Практика тишины</div>
                  <div style={{fontSize:11,opacity:0.6}}>{dayNum} из {silenceDays}</div>
                </div>
                <div style={{fontSize:36,lineHeight:1,marginBottom:8}}>{dayNum}</div>
                <div style={{background:"rgba(255,255,255,0.15)",borderRadius:3,height:3,marginBottom:6}}>
                  <div style={{background:"#7EC8B0",height:3,borderRadius:3,width:progress+"%",transition:"width 0.5s"}} />
                </div>
                <div style={{fontSize:10,opacity:0.6}}>Начало: {formatDate(silenceStartDate)}</div>
              </div>
              <div style={S.card}>
                <p style={S.st}>🌅 Чек-ап потребностей (утро)</p>
                {NEED_LEVELS.map(level=>(
                  <div key={level.id} style={{marginBottom:10}}>
                    <div style={{fontSize:9,color:level.color,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:5,fontWeight:"bold"}}>{level.label}</div>
                    <div style={{display:"flex",flexWrap:"wrap"}}>
                      {NEEDS.filter(n=>n.level===level.id).map(need=>(
                        <button key={need.id} onClick={()=>toggleNeed(need.id)}
                          style={{display:"inline-flex",alignItems:"center",gap:3,padding:"5px 8px",borderRadius:14,border:`1px solid ${needsChecked.includes(need.id)?level.color:T.border}`,background:needsChecked.includes(need.id)?level.color+"22":"transparent",cursor:"pointer",fontFamily:T.font,fontSize:11,marginRight:4,marginBottom:4}}>
                          {need.emoji} {need.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <p style={S.st}>💃 После движения</p>
                <div style={{fontSize:11,color:T.muted,marginBottom:7,fontStyle:"italic"}}>Включи музыку которая отражает состояние. Подвигайся. Потом запиши.</div>
                <textarea value={morningNote} onChange={e=>setMorningNote(e.target.value)} rows={4} placeholder="Что живёт во мне сегодня..." style={S.textarea} />
              </div>
              <div style={S.card}>
                <p style={S.st}>🌙 Два вопроса вечера</p>
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Что хорошего / важного для себя я сделала сегодня?</div>
                <textarea value={goodDone} onChange={e=>setGoodDone(e.target.value)} rows={2} placeholder="..." style={{...S.textarea,marginBottom:10}} />
                <div style={{fontSize:11,color:T.muted,marginBottom:4}}>Что хорошего / важного хочу сделать завтра?</div>
                <textarea value={goodTomorrow} onChange={e=>setGoodTomorrow(e.target.value)} rows={2} placeholder="..." style={S.textarea} />
              </div>
              <button style={S.primaryBtn(saved?"#7EC8B0":"#5C8A6B")} onClick={saveSilenceDay}>{saved?"✓ Сохранено":"Сохранить день тишины"}</button>
            </>
          )}
          </div>
        </div>
      );
    }

    return (
      <div style={S.content}>
        <div style={{padding:"16px 0 0"}}>
          <div style={{display:"flex",gap:3,marginBottom:14,background:T.card,padding:3,borderRadius:9,border:`1px solid ${T.border}`}}>
            {tabs.map(t=><button key={t.id} style={{flex:1,padding:"7px 2px",border:"none",background:exerciseTab===t.id?T.text:"transparent",color:exerciseTab===t.id?T.bg:T.muted,borderRadius:7,cursor:"pointer",fontFamily:T.font,fontSize:10}} onClick={()=>setExerciseTab(t.id)}>{t.label}</button>)}
          </div>
          {exerciseTab==="crisis" && (
            <div style={{...S.card,background:"#E76F5108",borderColor:"#E76F5144",marginBottom:12}}>
              <p style={{margin:"0 0 4px",fontSize:13,color:"#E76F51"}}>Сейчас очень тяжело?</p>
              <p style={{margin:0,fontSize:12,color:"#6B5A80",lineHeight:1.5}}>Выбери любую технику. Та, что откликается — и есть нужная.</p>
            </div>
          )}
          {EXERCISES[exerciseTab]?.map(ex=>(
            <div key={ex.id} style={{background:T.card,border:`1px solid ${currentColor}44`,borderLeft:`3px solid ${completedExercises.includes(ex.id)?"#7EC8B0":currentColor}`,borderRadius:10,padding:13,marginBottom:8,cursor:"pointer"}} onClick={()=>setActiveExercise(ex)}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:22}}>{ex.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,marginBottom:2}}>{ex.name}</div>
                  <div style={{fontSize:10,color:T.muted}}>⏱ {ex.duration}</div>
                </div>
                {completedExercises.includes(ex.id)&&<span style={{color:"#7EC8B0",fontSize:14}}>✓</span>}
              </div>
              <div style={{fontSize:12,color:"#6B5A80",marginTop:8,lineHeight:1.5}}>{ex.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── RENDER SUPPORT ────────────────────────────────────────────────────────

  const renderSupport = () => (
    <div style={{ paddingBottom: 80 }}>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,background:T.card,position:"sticky",top:0,zIndex:5}}>
        {[{id:"chat",label:"💬 Чат"},{id:"history",label:"📖 Сессии"}].map(t=>(
          <button key={t.id} style={{flex:1,padding:"10px 2px",border:"none",background:"none",fontSize:12,color:supportTab===t.id?T.text:T.muted,borderBottom:supportTab===t.id?`2px solid ${T.text}`:"2px solid transparent",cursor:"pointer",fontFamily:T.font}} onClick={()=>setSupportTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {supportTab==="history" && (
        <div style={S.content}>
          <div style={{paddingTop:14}}>
            {aiSessions.length===0 ? (
              <div style={{textAlign:"center",padding:36,color:T.muted,fontStyle:"italic",fontSize:13}}>Пока нет сохранённых разговоров</div>
            ) : aiSessions.map(session=>(
              <div key={session.id} style={{...S.card,cursor:"pointer",borderLeft:`3px solid ${T.accent}`}} onClick={()=>{setAiMessages(session.messages);setCurrentSession(session.id);setSupportTab("chat");setShowQuickStates(false);}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{fontSize:10,color:T.muted}}>{formatDate(session.date)} · {session.phase}</div>
                  <div style={{fontSize:10,color:T.muted}}>День {session.cycleDay}</div>
                </div>
                <div style={{fontSize:13,color:T.text,lineHeight:1.5}}>{session.title}</div>
                <div style={{fontSize:10,color:T.muted,marginTop:5}}>{session.messages.length} сообщений</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {supportTab==="chat" && <div style={{ ...S.content }}>
        {showQuickStates && aiMessages.length === 0 && (
          <div style={{padding:"16px 0 0"}}>
            <div style={{...S.card,background:"#1A102808",borderColor:"#1A102820"}}>
              <p style={{margin:"0 0 5px",fontSize:14}}>Как я могу помочь?</p>
              <p style={{margin:0,fontSize:12,color:T.muted,lineHeight:1.6}}>Я знаю твоё состояние сегодня — день цикла, настроение, активные схемы.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
              {QUICK_STATES.map(qs=>(
                <button key={qs.id} onClick={()=>sendToAI(qs.prompt)}
                  style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:11,padding:"12px 10px",cursor:"pointer",fontFamily:T.font,textAlign:"center"}}>
                  <div style={{fontSize:22,marginBottom:5}}>{qs.emoji}</div>
                  <div style={{fontSize:12,color:T.text}}>{qs.label}</div>
                </button>
              ))}
            </div>
            <div style={{textAlign:"center",marginBottom:8}}>
              <button onClick={()=>setShowQuickStates(false)} style={{background:"none",border:"none",fontSize:12,color:T.muted,cursor:"pointer",fontFamily:T.font}}>или написать самой →</button>
            </div>
          </div>
        )}
        <div>
          {aiMessages.length === 0 && !showQuickStates && (
            <div style={{textAlign:"center",padding:"40px 20px",color:T.muted}}>
              <div style={{fontSize:28,marginBottom:8}}>🌿</div>
              <div style={{fontSize:13,fontStyle:"italic"}}>Напиши что сейчас происходит</div>
            </div>
          )}
          {aiMessages.map((msg,i)=>(
            <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:9,paddingTop:i===0?16:0}}>
              <div style={msg.role==="user"
                ?{background:T.text,color:T.bg,padding:"8px 12px",borderRadius:"13px 13px 3px 13px",maxWidth:"80%",fontSize:13,lineHeight:1.5}
                :{background:T.card,color:T.text,padding:"8px 12px",borderRadius:"13px 13px 13px 3px",maxWidth:"82%",fontSize:13,lineHeight:1.6,border:`1px solid ${T.border}`}}>
                {msg.content}
              </div>
            </div>
          ))}
          {aiLoading&&<div style={{display:"flex",paddingTop:8}}><div style={{background:T.card,padding:"8px 12px",borderRadius:"13px 13px 13px 3px",fontSize:13,color:T.muted,border:`1px solid ${T.border}`}}>печатает...</div></div>}
          <div ref={messagesEndRef} />
        </div>
      </div>}
      {supportTab==="chat" && <div style={{display:"flex",gap:7,position:"fixed",bottom:60,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,padding:"10px 15px",background:T.bg,borderTop:`1px solid ${T.border}`,boxSizing:"border-box"}}>
        {aiMessages.length>0&&<button onClick={()=>{setAiMessages([]);setCurrentSession(null);setShowQuickStates(true);}} style={{width:36,height:36,borderRadius:"50%",border:`1px solid ${T.border}`,background:"none",cursor:"pointer",fontSize:14,flexShrink:0}}>↩</button>}
        <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendToAI()} placeholder="Напиши что чувствуешь..." style={{flex:1,padding:"8px 12px",borderRadius:18,border:`1px solid ${T.border}`,background:T.card,fontFamily:T.font,fontSize:13,color:T.text,outline:"none"}} />
        <button style={{width:36,height:36,borderRadius:"50%",background:T.text,color:T.bg,border:"none",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={()=>sendToAI()}>↑</button>
      </div>}
    </div>
  );

  // ── RENDER HISTORY ────────────────────────────────────────────────────────

  const avgCycleLength = () => {
    const lens = periodHistory.filter(p=>p.cycleLength&&p.cycleLength>15&&p.cycleLength<50).map(p=>p.cycleLength);
    return lens.length ? Math.round(lens.reduce((a,b)=>a+b,0)/lens.length) : null;
  };

  // Smart insights generator
  const generateInsights = () => {
    const insights = [];
    if (logs.length < 3) return insights;
    const last14 = logs.slice(0,14);

    // Most intense phase
    const byPhase = {};
    logs.forEach(l => {
      const p = l.phase||"Лютеиновая";
      if (!byPhase[p]) byPhase[p] = [];
      byPhase[p].push(l.intensity||5);
    });
    const phaseAvgs = Object.entries(byPhase).map(([p,vals])=>({phase:p,avg:vals.reduce((a,b)=>a+b,0)/vals.length})).sort((a,b)=>b.avg-a.avg);
    if (phaseAvgs.length > 1) insights.push({ emoji:"🌙", text:`В ${phaseAvgs[0].phase} фазу интенсивность состояния выше всего (${phaseAvgs[0].avg.toFixed(1)}/10)` });

    // Most frequent mood
    const moodCount = {};
    last14.flatMap(l=>l.moods||[]).forEach(id=>{moodCount[id]=(moodCount[id]||0)+1;});
    const topMood = Object.entries(moodCount).sort((a,b)=>b[1]-a[1])[0];
    if (topMood) { const m=MOODS.find(x=>x.id===topMood[0]); if(m) insights.push({emoji:m.emoji,text:`Самое частое состояние за 14 дней — "${m.label}" (${topMood[1]} раз)`}); }

    // Most active schema
    const schCount = {};
    last14.flatMap(l=>l.schemas||[]).forEach(id=>{schCount[id]=(schCount[id]||0)+1;});
    const topSch = Object.entries(schCount).sort((a,b)=>b[1]-a[1])[0];
    if (topSch) { const sc=SCHEMAS.find(s=>s.id===topSch[0]); if(sc) insights.push({emoji:sc.emoji,text:`Схема "${sc.name}" активировалась чаще всего — ${topSch[1]} раз за 2 недели`}); }

    // Schema + phase correlation
    const lutLogs = logs.filter(l=>l.phase==="Лютеиновая"&&l.schemas?.length>0);
    if (lutLogs.length >= 2) {
      const lutSchemas = {};
      lutLogs.flatMap(l=>l.schemas).forEach(id=>{lutSchemas[id]=(lutSchemas[id]||0)+1;});
      const top = Object.entries(lutSchemas).sort((a,b)=>b[1]-a[1])[0];
      if (top) { const sc=SCHEMAS.find(s=>s.id===top[0]); if(sc) insights.push({emoji:"⚡",text:`В лютеиновую фазу схема "${sc.name}" активна в ${Math.round((top[1]/lutLogs.length)*100)}% дней`}); }
    }

    // Intensity trend
    if (last14.length >= 5) {
      const first = last14.slice(Math.floor(last14.length/2)).reduce((s,l)=>s+(l.intensity||5),0)/Math.ceil(last14.length/2);
      const recent = last14.slice(0,Math.floor(last14.length/2)).reduce((s,l)=>s+(l.intensity||5),0)/Math.floor(last14.length/2);
      if (recent < first - 0.5) insights.push({emoji:"📉",text:`Интенсивность состояния снижается — в последние дни в среднем ${recent.toFixed(1)}/10`});
      else if (recent > first + 0.5) insights.push({emoji:"📈",text:`Интенсивность нарастает — в последние дни в среднем ${recent.toFixed(1)}/10`});
    }

    return insights;
  };

  const getCalendarDays = () => {
    const today = new Date(), year = today.getFullYear(), month = today.getMonth();
    const firstDay = new Date(year,month,1).getDay();
    const daysInMonth = new Date(year,month+1,0).getDate();
    const days = [];
    for (let i=0;i<(firstDay===0?6:firstDay-1);i++) days.push(null);
    for (let d=1;d<=daysInMonth;d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      days.push({d,dateStr,log:logs.find(l=>l.date===dateStr)});
    }
    return days;
  };

  const last14 = logs.slice(0,14).reverse();
  const insights = generateInsights();

  if (selectedLog) {
    const log = selectedLog, lp = getPhase(log.cycleDay||1);
    return (
      <div style={S.app}>
        <div style={{padding:"0 15px",paddingBottom:80}}>
          <button onClick={()=>setSelectedLog(null)} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontFamily:T.font,fontSize:13,padding:"16px 0 10px"}}>← История</button>
          <div style={{...S.card,background:lp.color+"15",borderColor:lp.color+"44"}}>
            <div style={{fontSize:16,marginBottom:3}}>{getDayOfWeek(log.date)}, {formatDate(log.date)}</div>
            <div style={{fontSize:12,color:lp.color}}>День цикла {log.cycleDay} · {log.phase}</div>
          </div>
          <div style={{...S.card,borderLeft:`3px solid ${lp.color}`}}>
            <p style={S.st}>Медицинский контекст фазы</p>
            <p style={{fontSize:12,color:"#6B5A80",lineHeight:1.7,margin:0}}>{lp.gynComment}</p>
          </div>
          {log.moods?.length>0&&<div style={S.card}><p style={S.st}>Эмоции</p><div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>{log.moods.map(id=>{const m=MOODS.find(x=>x.id===id);return m?<span key={id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:14,background:m.color+"22",border:`1px solid ${m.color}`,fontSize:12}}>{m.emoji} {m.label}</span>:null;})}</div><div style={{fontSize:12,color:T.muted}}>Интенсивность: <b>{log.intensity}/10</b></div></div>}
          {log.schemas?.length>0&&<div style={S.card}><p style={S.st}>Активные схемы</p>{log.schemas.map(id=>{const sc=SCHEMAS.find(s=>s.id===id);return sc?<div key={id} style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:7}}><span style={{fontSize:14,marginTop:1}}>{sc.emoji}</span><div><div style={{fontSize:12}}>{sc.name}</div><div style={{fontSize:11,color:T.muted}}>{sc.desc}</div></div></div>:null;})}</div>}
          {(log.symptoms?.length>0||log.discharge||log.libido)&&<div style={S.card}><p style={S.st}>Тело</p>{log.discharge&&<div style={{fontSize:12,marginBottom:5}}>Выделения: {DISCHARGE_TYPES.find(d=>d.id===log.discharge)?.emoji} {DISCHARGE_TYPES.find(d=>d.id===log.discharge)?.label}</div>}{log.libido&&<div style={{fontSize:12,marginBottom:5}}>Либидо: {LIBIDO.find(l=>l.id===log.libido)?.emoji} {LIBIDO.find(l=>l.id===log.libido)?.label}</div>}{log.symptoms?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5}}>{log.symptoms.map(id=>{const s=PHYSICAL_SYMPTOMS.find(x=>x.id===id);return s?<span key={id} style={{fontSize:12}}>{s.emoji} {s.label}</span>:null;})}</div>}</div>}
          {log.exercises?.length>0&&<div style={S.card}><p style={S.st}>Практики дня</p>{log.exercises.map(id=>{const ex=[...EXERCISES.crisis,...EXERCISES.schema,...EXERCISES.cbt].find(e=>e.id===id);return ex?<div key={id} style={{fontSize:12,marginBottom:4}}>{ex.icon} {ex.name}</div>:null;})}</div>}
          {log.notes&&<div style={S.card}><p style={S.st}>Заметки</p><p style={{fontSize:13,color:"#6B5A80",lineHeight:1.7,margin:0,fontStyle:"italic"}}>{log.notes}</p></div>}
        </div>
      </div>
    );
  }

  const renderHistory = () => (
    <div style={S.content}>
      <div style={{padding:"16px 0 0"}}>
        <div style={{display:"flex",gap:3,marginBottom:10,background:T.card,padding:3,borderRadius:9,border:`1px solid ${T.border}`}}>
          {[{id:"list",label:"📋 Дни"},{id:"calendar",label:"📅 Кал."},{id:"charts",label:"📊 Графики"},{id:"insights",label:"💡 Инсайты"}].map(t=>(
            <button key={t.id} style={{flex:1,padding:"7px 2px",border:"none",background:historyTab===t.id?T.text:"transparent",color:historyTab===t.id?T.bg:T.muted,borderRadius:7,cursor:"pointer",fontFamily:T.font,fontSize:10}} onClick={()=>setHistoryTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          <button onClick={exportData} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,cursor:"pointer",fontFamily:T.font,fontSize:11,color:T.text}}>⬇ CSV</button>
          <button onClick={exportJson} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,cursor:"pointer",fontFamily:T.font,fontSize:11,color:T.text}}>⬇ JSON (бэкап)</button>
          <label style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${T.accent}`,background:T.card,cursor:"pointer",fontFamily:T.font,fontSize:11,color:T.accent,textAlign:"center"}}>
            ⬆ Восстановить
            <input type="file" accept=".json" onChange={importJson} style={{display:"none"}} />
          </label>
        </div>

        {historyTab==="list"&&(
          <div>
            {periodHistory.length>0&&(
              <div style={{...S.card,background:"#E76F5108",borderColor:"#E76F5144"}}>
                <p style={{...S.st,color:"#E76F51"}}>Статистика цикла</p>
                <div style={{display:"flex",gap:8}}>
                  {[{label:"средний цикл",val:avgCycleLength()?avgCycleLength()+"д":"—"},{label:"циклов записано",val:periodHistory.length},{...(periodHistory.filter(p=>p.cycleLength).length>=2?{label:"разброс",val:Math.min(...periodHistory.filter(p=>p.cycleLength).map(p=>p.cycleLength))+"–"+Math.max(...periodHistory.filter(p=>p.cycleLength).map(p=>p.cycleLength))+"д"}:{label:"",val:""})}].filter(x=>x.label).map((item,i)=>(
                    <div key={i} style={{flex:1,textAlign:"center",background:T.card,borderRadius:9,padding:"9px 4px",border:`1px solid ${T.border}`}}>
                      <div style={{fontSize:20,fontWeight:"bold",color:"#E76F51"}}>{item.val}</div>
                      <div style={{fontSize:9,color:T.muted,marginTop:2}}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {logs.length===0&&<div style={{textAlign:"center",padding:36,color:T.muted,fontStyle:"italic",fontSize:13}}>Пока нет записей</div>}
            {logs.map((log,i)=>{const lp=getPhase(log.cycleDay||1);return(
              <div key={i} style={{...S.card,borderLeft:`3px solid ${lp.color}`,cursor:"pointer"}} onClick={()=>setSelectedLog(log)}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{fontSize:13}}>{getDayOfWeek(log.date)}, {formatDate(log.date)}</div>
                  <div style={{fontSize:10,color:lp.color}}>День {log.cycleDay}</div>
                </div>
                {log.moods?.length>0&&<div style={{display:"flex",gap:4,marginBottom:4}}>{log.moods.slice(0,6).map(id=>{const m=MOODS.find(x=>x.id===id);return m?<span key={id} style={{fontSize:15}}>{m.emoji}</span>:null;})}</div>}
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div style={{fontSize:10,color:T.muted}}>Интенсивность: {log.intensity}/10</div>
                  <div style={{fontSize:10,color:T.muted}}>→</div>
                </div>
              </div>
            );})}
          </div>
        )}

        {historyTab==="calendar"&&(
          <div style={S.card}>
            <p style={{...S.st,marginBottom:10}}>{new Date().toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}</p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
              {["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=><div key={d} style={{textAlign:"center",fontSize:9,color:T.muted,padding:"3px 0"}}>{d}</div>)}
              {getCalendarDays().map((day,i)=>{
                if(!day)return<div key={i}/>;
                const lp=day.log?getPhase(day.log.cycleDay||1):null;
                const isToday=day.dateStr===getTodayKey();
                return(<div key={i} onClick={()=>day.log&&setSelectedLog(day.log)} style={{textAlign:"center",padding:"5px 1px",borderRadius:6,background:lp?lp.color+"33":isToday?"#1A102815":"transparent",border:isToday?`1px solid ${T.text}`:"1px solid transparent",cursor:day.log?"pointer":"default",fontSize:11}}>
                  {day.d}
                  {day.log?.moods?.length>0&&<div style={{fontSize:7,marginTop:1}}>{MOODS.find(m=>m.id===day.log.moods[0])?.emoji}</div>}
                </div>);
              })}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              {CYCLE_PHASES.map(p=><div key={p.name} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.muted}}><div style={{width:8,height:8,borderRadius:2,background:p.color}}/>{p.name}</div>)}
            </div>
          </div>
        )}

        {historyTab==="charts"&&(
          <div>
            {last14.length<2?<div style={{textAlign:"center",padding:36,color:T.muted,fontStyle:"italic",fontSize:13}}>Нужно минимум 2 записи</div>:(
              <>
                <div style={S.card}>
                  <p style={S.st}>Интенсивность (14 дней)</p>
                  <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
                    {last14.map((log,i)=>{const h=((log.intensity||5)/10)*70;const lp=getPhase(log.cycleDay||1);return(
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                        <div style={{width:"100%",background:lp.color,borderRadius:"3px 3px 0 0",height:h+"px",minHeight:3,opacity:0.7}}/>
                        <div style={{fontSize:8,color:T.muted,transform:"rotate(-45deg)",transformOrigin:"right",whiteSpace:"nowrap"}}>{log.date.slice(5)}</div>
                      </div>
                    );})}
                  </div>
                </div>
                <div style={S.card}>
                  <p style={S.st}>Частые эмоции</p>
                  {(()=>{const c={};last14.forEach(l=>l.moods?.forEach(id=>{c[id]=(c[id]||0)+1;}));const s=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6);const max=s[0]?.[1]||1;return s.map(([id,count])=>{const m=MOODS.find(x=>x.id===id);return m?(<div key={id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><span style={{fontSize:16,width:20}}>{m.emoji}</span><div style={{flex:1,background:T.border,borderRadius:3,height:7,overflow:"hidden"}}><div style={{width:`${(count/max)*100}%`,height:"100%",background:m.color,borderRadius:3}}/></div><span style={{fontSize:11,color:T.muted,width:20,textAlign:"right"}}>{count}</span></div>):null;})})()}
                </div>
                <div style={S.card}>
                  <p style={S.st}>Топ схем</p>
                  {(()=>{const c={};last14.forEach(l=>l.schemas?.forEach(id=>{c[id]=(c[id]||0)+1;}));const s=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5);if(!s.length)return<div style={{fontSize:12,color:T.muted}}>Схемы не отмечались</div>;const max=s[0]?.[1]||1;return s.map(([id,count])=>{const sc=SCHEMAS.find(x=>x.id===id);return sc?(<div key={id} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span>{sc.emoji} {sc.name}</span><span style={{color:T.muted}}>{count}×</span></div><div style={{background:T.border,borderRadius:3,height:5,overflow:"hidden"}}><div style={{width:`${(count/max)*100}%`,height:"100%",background:T.accent,borderRadius:3}}/></div></div>):null;})})()}
                </div>
                <div style={S.card}>
                  <p style={S.st}>Интенсивность по фазам</p>
                  {CYCLE_PHASES.map(cp=>{const pl=logs.filter(l=>cp.days.includes(l.cycleDay||1));if(!pl.length)return null;const avg=pl.reduce((s,l)=>s+(l.intensity||5),0)/pl.length;return(<div key={cp.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><div style={{width:8,height:8,borderRadius:2,background:cp.color,flexShrink:0}}/><div style={{fontSize:11,width:90,flexShrink:0}}>{cp.name}</div><div style={{flex:1,background:T.border,borderRadius:3,height:7,overflow:"hidden"}}><div style={{width:`${(avg/10)*100}%`,height:"100%",background:cp.color,borderRadius:3}}/></div><span style={{fontSize:11,color:T.muted}}>{avg.toFixed(1)}</span></div>);})}
                </div>
              </>
            )}
          </div>
        )}

        {historyTab==="insights"&&(
          <div>
            {insights.length===0?(
              <div style={{...S.card,textAlign:"center",padding:36}}>
                <div style={{fontSize:28,marginBottom:8}}>📊</div>
                <div style={{fontSize:13,color:T.muted}}>Нужно больше записей — минимум 3-5 дней</div>
              </div>
            ):insights.map((ins,i)=>(
              <div key={i} style={{...S.card,display:"flex",gap:12,alignItems:"flex-start",borderLeft:`3px solid ${T.accent}`}}>
                <div style={{fontSize:24,flexShrink:0}}>{ins.emoji}</div>
                <div style={{fontSize:13,color:"#6B5A80",lineHeight:1.6}}>{ins.text}</div>
              </div>
            ))}
            {logs.length>=5&&(
              <div style={{...S.card,background:"#1A102808"}}>
                <p style={{...S.st,marginBottom:8}}>Что это значит?</p>
                <p style={{fontSize:12,color:"#6B5A80",lineHeight:1.7,margin:0}}>
                  Паттерны помогают увидеть связь между циклом, схемами и состоянием. Поделись этими наблюдениями с терапевтом — это ценный материал для работы.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );


  const exportData = () => {
    const rows = ["Дата,День цикла,Фаза,Настроение,Интенсивность,Схемы,Выделения,Либидо,Симптомы,Заметки"];
    logs.forEach(l => {
      const moods = l.moods?.map(id=>MOODS.find(m=>m.id===id)?.label).filter(Boolean).join("|") || "";
      const schemas = l.schemas?.map(id=>SCHEMAS.find(s=>s.id===id)?.name).filter(Boolean).join("|") || "";
      const symptoms = l.symptoms?.map(id=>PHYSICAL_SYMPTOMS.find(s=>s.id===id)?.label).filter(Boolean).join("|") || "";
      const discharge = DISCHARGE_TYPES.find(d=>d.id===l.discharge)?.label || "";
      const libido = LIBIDO.find(x=>x.id===l.libido)?.label || "";
      const notes = (l.notes||"").replace(/,/g,";").replace(/\n/g," ");
      rows.push([l.date,l.cycleDay,l.phase,moods,l.intensity||"",schemas,discharge,libido,symptoms,notes].join(","));
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`schema-flo-${getTodayKey()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const data = {
      exported: getTodayKey(),
      logs, periodHistory, silenceLogs, aiSessions,
      cycleDay, periodStartDate, periodActive,
      silenceActive: load("silence_active", false),
      silenceStartDate: load("silence_start_date", null),
      silenceDays: load("silence_days", 0),
    };
    const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`schema-flo-backup-${getTodayKey()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.logs) save("schema_logs", data.logs);
        if (data.periodHistory) save("period_history", data.periodHistory);
        if (data.silenceLogs) save("silence_logs", data.silenceLogs);
        if (data.aiSessions) save("ai_sessions", data.aiSessions);
        if (data.cycleDay != null) save("cycleDay", data.cycleDay);
        if (data.periodStartDate) save("period_start_date", data.periodStartDate);
        if (data.periodActive != null) save("period_active", data.periodActive);
        if (data.silenceActive != null) save("silence_active", data.silenceActive);
        if (data.silenceStartDate) save("silence_start_date", data.silenceStartDate);
        if (data.silenceDays != null) save("silence_days", data.silenceDays);
        window.location.reload();
      } catch {
        alert("Ошибка: файл повреждён или неверный формат.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── ROOT ──────────────────────────────────────────────────────────────────

  const navItems = [
    { id: "home", icon: "🌙", label: "День" },
    { id: "practices", icon: "🌿", label: "Практики" },
    { id: "support", icon: "💬", label: "Поддержка" },
    { id: "history", icon: "📋", label: "История" },
  ];

  return (
    <div style={S.app}>
      <div key={screen} className="screen-enter">
      {screen === "home" && renderHome()}
      {screen === "practices" && renderPractices()}
      {screen === "support" && renderSupport()}
      {screen === "history" && renderHistory()}
      </div>
      {/* Schema popup */}
      {schemaPopup && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"flex-end"}} onClick={()=>setSchemaPopup(null)}>
          <div style={{background:T.card,borderRadius:"16px 16px 0 0",padding:24,width:"100%",maxWidth:430,margin:"0 auto",boxSizing:"border-box"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:32,marginBottom:8}}>{schemaPopup.emoji}</div>
            <div style={{fontSize:18,marginBottom:6}}>{schemaPopup.name}</div>
            <div style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{schemaPopup.domain}</div>
            <div style={{fontSize:13,color:"#6B5A80",lineHeight:1.7,marginBottom:14}}>{schemaPopup.desc}</div>
            <div style={{background:T.accent+"15",borderRadius:10,padding:12,marginBottom:16,border:`1px solid ${T.accent}44`}}>
              <div style={{fontSize:10,color:T.accent,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Как проявляется</div>
              <div style={{fontSize:12,color:"#6B5A80",lineHeight:1.6}}>
                {schemaPopup.id==="abandonment"&&"Ты цепляешься за отношения, боишься что тебя бросят, остро реагируешь на любые признаки ухода."}
                {schemaPopup.id==="mistrust"&&"Ты ждёшь обмана, трудно доверяешь даже близким, часто видишь скрытые мотивы."}
                {schemaPopup.id==="deprivation"&&"Чувство что тебя не понимают, не дают достаточно тепла — даже когда объективно всё хорошо."}
                {schemaPopup.id==="defectiveness"&&"Глубокое чувство стыда, что ты «не такая», что если кто-то узнает тебя настоящую — отвергнет."}
                {schemaPopup.id==="isolation"&&"Ощущение что ты принципиально другая, не вписываешься ни в какую группу."}
                {schemaPopup.id==="dependence"&&"Трудно принимать решения самостоятельно, постоянно нужна поддержка и одобрение."}
                {schemaPopup.id==="vulnerability"&&"Постоянная фоновая тревога что случится что-то плохое — болезнь, катастрофа, потеря."}
                {schemaPopup.id==="enmeshment"&&"Границы размыты с кем-то близким — ты живёшь его жизнью или чувствуешь что не имеешь своей."}
                {schemaPopup.id==="failure"&&"Убеждение что ты в итоге провалишься, что другие лучше, что твои достижения — случайность."}
                {schemaPopup.id==="entitlement"&&"Сложно принимать ограничения, раздражение когда правила распространяются на тебя."}
                {schemaPopup.id==="self_control"&&"Трудно сдерживать эмоции, откладываешь дела, действуешь импульсивно."}
                {schemaPopup.id==="subjugation"&&"Подавляешь свои желания ради других, боишься конфликта, говоришь «всё хорошо» когда плохо."}
                {schemaPopup.id==="self_sacrifice"&&"Ставишь чужие нужды выше своих, потом чувствуешь обиду и истощение."}
                {schemaPopup.id==="approval"&&"Постоянно нужно знать что тебя одобряют, трудно действовать без подтверждения извне."}
                {schemaPopup.id==="negativity"&&"Фокус автоматически идёт на плохое — угрозы, потери, то что может пойти не так."}
                {schemaPopup.id==="inhibition"&&"Подавляешь эмоции, спонтанность, боишься потерять контроль или выглядеть слабой."}
                {schemaPopup.id==="standards"&&"Постоянное давление делать лучше, критика себя за ошибки, никогда не достаточно хорошо."}
                {schemaPopup.id==="punitiveness"&&"Строгость к себе и другим за ошибки, трудно прощать, убеждение что наказание заслужено."}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{toggleSchema(schemaPopup.id);setSchemaPopup(null);}} style={{flex:1,padding:"10px",borderRadius:9,border:"none",background:activeSchemas.includes(schemaPopup.id)?T.muted:T.accent,color:T.bg,cursor:"pointer",fontFamily:T.font,fontSize:13}}>
                {activeSchemas.includes(schemaPopup.id)?"Убрать":"Отметить активной"}
              </button>
              <button onClick={()=>setSchemaPopup(null)} style={{width:44,padding:"10px",borderRadius:9,border:`1px solid ${T.border}`,background:"none",cursor:"pointer",fontFamily:T.font,fontSize:13}}>✕</button>
            </div>
          </div>
        </div>
      )}

      <div style={S.nav}>
        {navItems.map(item => (
          <button key={item.id} style={S.navBtn(screen===item.id)} onClick={()=>{setScreen(item.id);setSelectedLog(null);if(item.id==="practices"){setActiveExercise(null);}if(item.id==="home"){const tl=logs.find(l=>l.date===getTodayKey());if(tl)setDiaryStep(4);}}}>
            <div style={{fontSize:16}}>{item.icon}</div>
            <div style={{marginTop:1}}>{item.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

