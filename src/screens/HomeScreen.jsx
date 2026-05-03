import React, { useState } from "react";
import { T } from "../constants/theme";
import { CYCLE_PHASES, MOODS_BASIC, MOODS_EXTENDED, DISCHARGE_TYPES, DIGESTION, LIBIDO, PHYSICAL_SYMPTOMS, SCHEMAS, DOMAINS } from "../data";
import { getPhase, getTodayKey } from "../utils";

const DIARY_STEPS = ["Настроение", "Тело", "Схемы", "Заметки"];

const cycleColors = CYCLE_PHASES.flatMap(p => p.days.map(d => ({ day: d, color: p.color })));

const S = {
  card:       { background: T.card, borderRadius: 12, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}` },
  st:         { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "500" },
  textarea:   { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontFamily: T.font, fontSize: 14, color: T.text, resize: "none", boxSizing: "border-box", lineHeight: 1.6 },
  chip:       (a, color) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: `1px solid ${a ? color : T.border}`, background: a ? color + "14" : T.card, cursor: "pointer", fontSize: 12, marginRight: 4, marginBottom: 4, fontFamily: T.font, fontWeight: a ? "500" : "400" }),
  primaryBtn: (color) => ({ width: "100%", padding: "13px", background: color || T.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: "500" }),
  ghostBtn:   { width: "100%", padding: "12px", background: T.card, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: T.font },
  stepDot:    (active, done) => ({ width: 7, height: 7, borderRadius: "50%", background: done ? T.accent : active ? T.text : T.border, transition: "background 0.2s" }),
};

export default function HomeScreen({ cycle, diary, onGetAIRecommendations, onSchemaPopup }) {
  const {
    cycleDay, setCycleDay,
    periodActive, showPeriodConfirm, setShowPeriodConfirm,
    showFlowQuestion, setShowFlowQuestion,
    startPeriod, endPeriod,
  } = cycle;

  const {
    logs, diaryStep, setDiaryStep,
    selectedMoods, intensity, setIntensity,
    discharge, setDischarge,
    digestion, setDigestion,
    symptoms, libido, setLibido,
    symptomNotes, setSymptomNotes,
    activeSchemas, notes, setNotes,
    completedExercises,
    showExtendedMoods, setShowExtendedMoods,
    toggleMood, toggleSchema, toggleSymptom,
    saveDay, editToday, markExerciseDone,
  } = diary;

  const [phaseExpanded, setPhaseExpanded] = useState(false);
  const [saved, setSaved] = useState(false);

  const phase = getPhase(cycleDay);
  const todayLog = logs.find(l => l.date === getTodayKey());

  const handleSaveDay = () => {
    saveDay(cycleDay, phase.name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      {/* Шапка */}
      <div style={{ background: T.card, padding: "20px 16px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: "700", lineHeight: 1.2, letterSpacing: "-0.3px" }}>
              {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {new Date().toLocaleDateString("ru-RU", { weekday: "long" })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: phase.color + "18", border: `1px solid ${phase.color}40`, borderRadius: 6, padding: "5px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: phase.color }} />
            <div style={{ fontSize: 12, color: phase.color, fontWeight: "500" }}>{phase.name} · д.{cycleDay}</div>
          </div>
        </div>

        {/* Фаза */}
        <div style={{ background: phase.color + "10", border: `1px solid ${phase.color}30`, borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55 }}>{phase.mentalComment}</div>
        </div>

        {/* Полоска цикла */}
        <div style={{ display: "flex", gap: 2 }}>
          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => {
            const cc = cycleColors.find(x => x.day === d);
            return (
              <div key={d} onClick={() => setCycleDay(d)}
                style={{ flex: 1, height: d === cycleDay ? 5 : 3, borderRadius: 2, background: cc ? cc.color : T.border, opacity: d === cycleDay ? 1 : 0.4, cursor: "pointer", transition: "height 0.15s" }} />
            );
          })}
        </div>

        {/* Кнопка менструации */}
        <div style={{ marginTop: 12 }}>
          {periodActive && cycleDay <= 5 ? (
            <button onClick={endPeriod} style={{ ...S.ghostBtn, color: T.green, borderColor: T.green + "66" }}>✓ Месячные завершились</button>
          ) : showFlowQuestion ? (
            <div style={{ background: T.orange + "10", borderRadius: 10, padding: 12, border: `1px solid ${T.orange}44` }}>
              <div style={{ fontSize: 12, color: T.orange, marginBottom: 9 }}>Интенсивность выделений?</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                {[{ id: "light", e: "🌸", l: "Скудные" }, { id: "medium", e: "🩸", l: "Умеренные" }, { id: "heavy", e: "💧", l: "Обильные" }, { id: "very_heavy", e: "🌊", l: "Очень" }].map(f => (
                  <button key={f.id} onClick={() => startPeriod(f.id)}
                    style={{ flex: 1, padding: "7px 2px", borderRadius: 8, border: `1px solid ${T.orange}44`, background: T.orange + "08", cursor: "pointer", fontFamily: T.font, fontSize: 10, color: T.orange, textAlign: "center" }}>
                    <div>{f.e}</div><div style={{ marginTop: 2 }}>{f.l}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowFlowQuestion(false); setShowPeriodConfirm(false); }} style={{ ...S.ghostBtn, fontSize: 11, padding: "6px" }}>Отмена</button>
            </div>
          ) : showPeriodConfirm ? (
            <div style={{ background: T.orange + "10", borderRadius: 10, padding: 12, border: `1px solid ${T.orange}44` }}>
              <div style={{ fontSize: 12, color: T.orange, marginBottom: 9 }}>Начать новый цикл сегодня?</div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => { setShowPeriodConfirm(false); setShowFlowQuestion(true); }} style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: T.orange, color: "#fff", cursor: "pointer", fontFamily: T.font, fontSize: 12 }}>Да</button>
                <button onClick={() => setShowPeriodConfirm(false)} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", cursor: "pointer", fontFamily: T.font, fontSize: 12, color: T.muted }}>Отмена</button>
              </div>
            </div>
          ) : !periodActive && (
            <button onClick={() => setShowPeriodConfirm(true)} style={{ ...S.ghostBtn, color: T.orange, borderColor: T.orange + "66" }}>🩸 Начались месячные</button>
          )}
        </div>
      </div>

      {/* Дневник */}
      <div style={{ padding: "0 15px 90px" }}>
        {diaryStep === 4 && todayLog ? (
          <div style={{ ...S.card, textAlign: "center", background: T.green + "10", borderColor: T.green + "44", marginTop: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 15, marginBottom: 4 }}>День сохранён</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Молодец — ты отследила своё состояние</div>
            <button onClick={editToday} style={S.ghostBtn}>Редактировать</button>
          </div>
        ) : (
          <>
            {/* Индикатор шагов */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 16, marginTop: 12 }}>
              {DIARY_STEPS.map((label, i) => (
                <React.Fragment key={i}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }} onClick={() => setDiaryStep(i)}>
                    <div style={S.stepDot(diaryStep === i, diaryStep > i)} />
                    <div style={{ fontSize: 9, color: diaryStep === i ? T.text : T.muted }}>{label}</div>
                  </div>
                  {i < DIARY_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: diaryStep > i ? T.green : T.border, marginBottom: 12, maxWidth: 30 }} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Шаг 0 — Настроение */}
            {diaryStep === 0 && (
              <div style={S.card}>
                <p style={S.st}>Как ты сейчас? (выбери всё что есть)</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 8 }}>
                  {MOODS_BASIC.map(m => (
                    <button key={m.id} onClick={() => toggleMood(m.id)}
                      style={{ padding: "8px 2px", borderRadius: 10, border: `2px solid ${selectedMoods.includes(m.id) ? m.color : T.border}`, background: selectedMoods.includes(m.id) ? m.color + "22" : "transparent", cursor: "pointer", textAlign: "center", fontFamily: T.font }}>
                      <div style={{ fontSize: 19 }}>{m.emoji}</div>
                      <div style={{ fontSize: 9, color: T.purple, marginTop: 2 }}>{m.label}</div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowExtendedMoods(v => !v)}
                  style={{ width: "100%", padding: "6px", borderRadius: 8, border: `1px dashed ${T.border}`, background: "transparent", cursor: "pointer", fontFamily: T.font, fontSize: 11, color: T.muted, marginBottom: 8 }}>
                  {showExtendedMoods ? "▲ Скрыть полутона" : "▼ Полутона и оттенки"}
                </button>
                {showExtendedMoods && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 8 }}>
                    {MOODS_EXTENDED.map(m => (
                      <button key={m.id} onClick={() => toggleMood(m.id)}
                        style={{ padding: "8px 2px", borderRadius: 10, border: `2px solid ${selectedMoods.includes(m.id) ? m.color : T.border}`, background: selectedMoods.includes(m.id) ? m.color + "22" : "transparent", cursor: "pointer", textAlign: "center", fontFamily: T.font }}>
                        <div style={{ fontSize: 19 }}>{m.emoji}</div>
                        <div style={{ fontSize: 9, color: T.purple, marginTop: 2 }}>{m.label}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p style={{ ...S.st, marginTop: 8 }}>Интенсивность · {intensity}/10</p>
                <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: "100%", accentColor: T.accent, marginBottom: 4 }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted }}><span>Лёгко</span><span>Невыносимо</span></div>
                <button style={{ ...S.primaryBtn(), marginTop: 14 }} onClick={() => setDiaryStep(1)}>Далее →</button>
              </div>
            )}

            {/* Шаг 1 — Тело */}
            {diaryStep === 1 && (
              <div style={S.card}>
                <p style={S.st}>Тело сегодня</p>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Выделения</div>
                <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 10 }}>
                  {DISCHARGE_TYPES.map(d => <button key={d.id} style={S.chip(discharge === d.id, T.accent)} onClick={() => setDischarge(discharge === d.id ? null : d.id)}>{d.emoji} {d.label}</button>)}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Пищеварение</div>
                <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 10 }}>
                  {DIGESTION.map(d => <button key={d.id} style={S.chip(digestion === d.id, T.green)} onClick={() => setDigestion(digestion === d.id ? null : d.id)}>{d.emoji} {d.label}</button>)}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Либидо</div>
                <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 10 }}>
                  {LIBIDO.map(l => <button key={l.id} style={S.chip(libido === l.id, T.yellow)} onClick={() => setLibido(libido === l.id ? null : l.id)}>{l.emoji} {l.label}</button>)}
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>Симптомы</div>
                <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 12 }}>
                  {PHYSICAL_SYMPTOMS.map(s => <button key={s.id} style={S.chip(symptoms.includes(s.id), T.orange)} onClick={() => toggleSymptom(s.id)}>{s.emoji} {s.label}</button>)}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.ghostBtn, flex: 1 }} onClick={() => setDiaryStep(0)}>← Назад</button>
                  <button style={{ ...S.primaryBtn(), flex: 2 }} onClick={() => setDiaryStep(2)}>Далее →</button>
                </div>
              </div>
            )}

            {/* Шаг 2 — Схемы */}
            {diaryStep === 2 && (
              <div style={S.card}>
                <p style={S.st}>Активные схемы сегодня</p>
                {(() => {
                  const freq = {};
                  logs.flatMap(l => l.schemas || []).forEach(id => { freq[id] = (freq[id] || 0) + 1; });
                  const topIds = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
                  return topIds.length > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>Твои частые схемы</div>
                      {SCHEMAS.filter(s => topIds.includes(s.id)).map(schema => (
                        <div key={schema.id}
                          style={{ display: "flex", alignItems: "center", padding: "8px 10px", borderRadius: 8, border: `1px solid ${activeSchemas.includes(schema.id) ? T.accent : T.border}`, background: activeSchemas.includes(schema.id) ? T.accent + "15" : "transparent", marginBottom: 4, cursor: "pointer" }}
                          onClick={() => toggleSchema(schema.id)}
                          onDoubleClick={() => onSchemaPopup(schema)}>
                          <span style={{ marginRight: 8, fontSize: 14 }}>{schema.emoji}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12 }}>{schema.name}</div>
                            <div style={{ fontSize: 10, color: T.muted }}>{schema.desc}</div>
                          </div>
                          {activeSchemas.includes(schema.id) && <span style={{ color: T.accent }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
                <details style={{ marginBottom: 12 }}>
                  <summary style={{ fontSize: 12, color: T.muted, cursor: "pointer", marginBottom: 8 }}>Все 18 схем ▾</summary>
                  {DOMAINS.map(domain => (
                    <div key={domain}>
                      <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, marginTop: 8 }}>{domain}</div>
                      {SCHEMAS.filter(sc => sc.domain === domain).map(schema => (
                        <div key={schema.id}
                          style={{ display: "flex", alignItems: "center", padding: "7px 9px", borderRadius: 7, border: `1px solid ${activeSchemas.includes(schema.id) ? T.accent : T.border}`, background: activeSchemas.includes(schema.id) ? T.accent + "15" : "transparent", marginBottom: 3, cursor: "pointer" }}
                          onClick={() => toggleSchema(schema.id)}
                          onDoubleClick={() => onSchemaPopup(schema)}>
                          <span style={{ marginRight: 7, fontSize: 13 }}>{schema.emoji}</span>
                          <span style={{ fontSize: 11 }}>{schema.name}</span>
                          {activeSchemas.includes(schema.id) && <span style={{ marginLeft: "auto", color: T.accent }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </details>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.ghostBtn, flex: 1 }} onClick={() => setDiaryStep(1)}>← Назад</button>
                  <button style={{ ...S.primaryBtn(), flex: 2 }} onClick={() => setDiaryStep(3)}>Далее →</button>
                </div>
              </div>
            )}

            {/* Шаг 3 — Заметки */}
            {diaryStep === 3 && (
              <div style={S.card}>
                <p style={S.st}>Заметки дня</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                  placeholder="Что происходит? Что заметила? Можно просто поток мыслей..."
                  style={{ ...S.textarea, marginBottom: 10 }} />
                {notes.trim().length > 20 && (
                  <button onClick={onGetAIRecommendations}
                    style={{ width: "100%", padding: "9px", borderRadius: 8, border: `1px solid ${T.accent}66`, background: T.accent + "10", color: T.accent, cursor: "pointer", fontFamily: T.font, fontSize: 12, marginBottom: 10 }}>
                    ✨ Получить рекомендации по заметке
                  </button>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.ghostBtn, flex: 1 }} onClick={() => setDiaryStep(2)}>← Назад</button>
                  <button style={{ ...S.primaryBtn(saved ? T.green : T.text), flex: 2 }} onClick={handleSaveDay}>
                    {saved ? "✓ Сохранено" : "Сохранить день"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Медкарточка фазы */}
        <div style={{ ...S.card, borderLeft: `3px solid ${phase.color}`, cursor: "pointer" }} onClick={() => setPhaseExpanded(e => !e)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ ...S.st, color: phase.color, margin: 0 }}>Что происходит в теле</p>
            <span style={{ fontSize: 11, color: T.muted, transition: "transform 0.2s", display: "inline-block", transform: phaseExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
          </div>
          {!phaseExpanded && <p style={{ fontSize: 12, color: T.muted, margin: "6px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>{phase.tip}</p>}
          {phaseExpanded && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, color: T.purple, lineHeight: 1.7, margin: "0 0 8px" }}>{phase.gynComment}</p>
              <div style={{ fontSize: 10, color: phase.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Психологически</div>
              <p style={{ fontSize: 12, color: T.purple, lineHeight: 1.7, margin: 0 }}>{phase.mentalComment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
