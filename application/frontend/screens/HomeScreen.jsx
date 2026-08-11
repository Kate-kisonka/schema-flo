import React, { useState } from "react";
import { T, wash } from "../constants/theme.js";
import { CYCLE_PHASES, MOODS_BASIC, MOODS_EXTENDED, DISCHARGE_TYPES, DIGESTION, LIBIDO, PHYSICAL_SYMPTOMS, SCHEMAS, DOMAINS } from "../data.js";
import { getPhase, getTodayKey } from "../utils.js";
import { CompanionSay, Orb } from "../components/Companion.jsx";
import CompanionChat from "../components/CompanionChat.jsx";
import { companionGreet, companionSay } from "../constants/companion.js";
import Icon from "../components/icons.jsx";

const DIARY_STEPS = ["Настроение", "Тело", "Схемы", "Заметки"];

const cycleColors = CYCLE_PHASES.flatMap(p => p.days.map(d => ({ day: d, color: p.color })));

// Тяжёлые состояния — для выбора ветки реплики компаньона после сохранения
const HEAVY_MOODS = new Set([
  "sad", "fear", "terror", "sorrow", "grief", "overwhelmed",
  "numb", "loneliness", "hurt", "shame", "guilt", "longing",
]);

const S = {
  card:        { background: T.card, borderRadius: T.radius.md, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}`, boxShadow: T.shadow.e1 },
  cardQuiet:   { background: T.card, borderRadius: T.radius.md, padding: "14px 16px", marginBottom: 8, border: `1px solid ${T.border}` },
  st:         { fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "500" },
  groupLabel: { fontSize: 12, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" },
  groupWrap:  (isLast) => ({ marginBottom: isLast ? 12 : 16, paddingBottom: isLast ? 0 : 14, borderBottom: isLast ? "none" : `1px solid ${T.border}` }),
  textarea:   { width: "100%", padding: "10px 12px", borderRadius: T.radius.sm, border: `1px solid ${T.border}`, background: T.bg, fontFamily: T.font, fontSize: 14, color: T.text, resize: "none", boxSizing: "border-box", lineHeight: 1.6 },
  chip:       (a, color) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: a ? "4px 9px" : "5px 10px", borderRadius: 6, border: `${a ? 2 : 1}px solid ${a ? color : T.border}`, background: a ? wash(color, 14) : T.card, cursor: "pointer", fontSize: 13, marginRight: 4, marginBottom: 4, fontFamily: T.font, fontWeight: a ? "600" : "400" }),
  primaryBtn: (color) => ({ width: "100%", padding: "13px", background: color || T.accent, color: T.onAccent, border: "none", borderRadius: T.radius.sm, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: "500" }),
  ghostBtn:   { width: "100%", padding: "12px", background: T.card, color: T.sub, border: `1px solid ${T.border}`, borderRadius: T.radius.sm, fontSize: 13, cursor: "pointer", fontFamily: T.font },
  linkBtn:    { width: "100%", padding: "8px", background: "transparent", color: T.muted, border: "none", cursor: "pointer", fontFamily: T.font, fontSize: 12, textDecoration: "underline" },
  stepDot:    (active, done) => ({ width: 10, height: 10, borderRadius: "50%", background: done ? T.accent : active ? T.text : T.border, transition: "background 0.2s" }),
  stepBtn:    { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", minWidth: 44, minHeight: 44, padding: "4px 6px", background: "none", border: "none", fontFamily: T.font },
};

export default function HomeScreen({ cycle, diary, onSchemaPopup }) {
  const {
    cycleDay, setCycleDay,
    periodActive, showPeriodConfirm, setShowPeriodConfirm,
    showFlowQuestion, setShowFlowQuestion,
    startPeriod, endPeriod,
    cycleLoadError,
  } = cycle;

  const {
    logs, diaryStep, setDiaryStep,
    selectedMoods, intensity, setIntensity,
    discharge, setDischarge,
    digestion, setDigestion,
    symptoms, libido, setLibido,
    activeSchemas, notes, setNotes,
    showExtendedMoods, setShowExtendedMoods,
    toggleMood, toggleSchema, toggleSymptom,
    saveDay, editToday,
  } = diary;

  const phase = getPhase(cycleDay);
  const todayLog = logs.find(l => l.date === getTodayKey());

  const [phaseExpanded, setPhaseExpanded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savedPhrase, setSavedPhrase] = useState(() => {
    if (diaryStep !== 4 || !todayLog) return null;
    const heavy = (todayLog.moods || []).some(id => HEAVY_MOODS.has(id));
    return companionSay(heavy ? "save_day_heavy" : "save_day");
  });
  const [chatOpen, setChatOpen] = useState(false);

  // Приветствие компаньона — раз за визит, с учётом фазы и повторного захода
  const [greeting] = useState(() => companionGreet(phase.name, Boolean(todayLog)));
  // Заглушка для «частых схем», пока в истории нет данных — подбирается один
  // раз при монтировании, а не на каждый рендер (иначе фраза скакала бы
  // при каждом наборе текста в заметках, и ротация в localStorage портилась бы)
  const [emptySchemasPhrase] = useState(() => companionSay("empty_schemas"));

  const handleSaveDay = async () => {
    setSaveError(false);
    const ok = await saveDay(cycleDay, phase.key);
    if (!ok) {
      setSaveError(true);
      return;
    }
    if (!savedPhrase) {
      const heavy = selectedMoods.some(id => HEAVY_MOODS.has(id));
      setSavedPhrase(companionSay(heavy ? "save_day_heavy" : "save_day"));
    }
  };

  const handleCycleScaleKeyDown = (event) => {
    const nextDayByKey = {
      ArrowLeft: cycleDay - 1,
      ArrowDown: cycleDay - 1,
      ArrowRight: cycleDay + 1,
      ArrowUp: cycleDay + 1,
      PageDown: cycleDay - 7,
      PageUp: cycleDay + 7,
      Home: 1,
      End: 28,
    };
    if (!(event.key in nextDayByKey)) return;
    event.preventDefault();
    setCycleDay(Math.min(28, Math.max(1, nextDayByKey[event.key])));
  };

  return (
    <div>
      {/* Шапка */}
      <div style={{ background: T.card, padding: "20px 16px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: T.fontSerif, fontSize: 22, fontWeight: "700", lineHeight: 1.2, letterSpacing: "-0.3px" }}>
              {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
              {new Date().toLocaleDateString("ru-RU", { weekday: "long" })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {cycleLoadError ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: wash(T.muted, 18), border: `1px solid ${wash(T.muted, 40)}`, borderRadius: 6, padding: "5px 10px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.muted }} />
                <div style={{ fontSize: 12, color: T.muted, fontWeight: "500" }}>Данные не загрузились</div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: wash(phase.color, 18), border: `1px solid ${wash(phase.color, 40)}`, borderRadius: 6, padding: "5px 10px" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: phase.color }} />
                <div style={{ fontSize: 12, color: phase.color, fontWeight: "500" }}>{phase.name} · д.{cycleDay}</div>
              </div>
            )}
          </div>
        </div>

        {/* Компаньон встречает днём */}
        {cycleLoadError ? (
          <div style={{ background: wash(T.muted, 10), border: `1px solid ${wash(T.muted, 30)}`, borderRadius: T.radius.sm, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.55 }}>Не удалось загрузить данные о цикле — проверь соединение и обнови страницу. День цикла ниже показан приблизительно.</div>
          </div>
        ) : (
          <CompanionSay phrase={greeting} style={{ marginBottom: 12 }} onClick={() => setChatOpen(true)} />
        )}

        {/* Полоска цикла */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="День менструального цикла"
          aria-valuemin={1}
          aria-valuemax={28}
          aria-valuenow={cycleDay}
          aria-valuetext={`День цикла ${cycleDay}`}
          onKeyDown={handleCycleScaleKeyDown}
          style={{ display: "flex", gap: 2 }}
        >
          {Array.from({ length: 28 }, (_, i) => i + 1).map(d => {
            const cc = cycleColors.find(x => x.day === d);
            return (
              <div key={d} aria-hidden="true" onClick={() => setCycleDay(d)}
                style={{ flex: 1, height: d === cycleDay ? 5 : 3, borderRadius: 2, background: cc ? cc.color : T.border, opacity: d === cycleDay ? 1 : 0.4, cursor: "pointer", transition: "height 0.15s" }} />
            );
          })}
        </div>

        {/* Кнопка менструации */}
        <div style={{ marginTop: 12 }}>
          {periodActive && cycleDay <= 5 ? (
            <button onClick={endPeriod} style={{ ...S.ghostBtn, color: T.green, borderColor: wash(T.green, 40), display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="check" size={14} /> Месячные завершились
            </button>
          ) : showFlowQuestion ? (
            <div style={{ background: wash(T.orange, 10), borderRadius: T.radius.sm, padding: 12, border: `1px solid ${wash(T.orange, 40)}` }}>
              <div style={{ fontSize: 12, color: T.orange, marginBottom: 9 }}>Интенсивность выделений?</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8, alignItems: "flex-end" }}>
                {[
                  { id: "light",      icon: "flower",    l: "Скудные",   wash: 6,  weight: 1 },
                  { id: "medium",     icon: "bloodDrop", l: "Умеренные", wash: 12, weight: 1 },
                  { id: "heavy",      icon: "droplet",   l: "Обильные",  wash: 18, weight: 1.5 },
                  { id: "very_heavy", icon: "wave",       l: "Очень",     wash: 26, weight: 2 },
                ].map(f => (
                  <button key={f.id} onClick={() => startPeriod(f.id)}
                    style={{ flex: 1, padding: `${7 + f.weight}px 2px`, borderRadius: T.radius.sm, border: `${f.weight}px solid ${wash(T.orange, 40)}`, background: wash(T.orange, f.wash), cursor: "pointer", fontFamily: T.font, fontSize: 11, color: T.orange, textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}><Icon name={f.icon} size={16} /></div><div style={{ marginTop: 2 }}>{f.l}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowFlowQuestion(false); setShowPeriodConfirm(false); }} style={{ ...S.ghostBtn, fontSize: 11, padding: "6px" }}>Отмена</button>
            </div>
          ) : showPeriodConfirm ? (
            <div style={{ background: wash(T.orange, 10), borderRadius: T.radius.sm, padding: 12, border: `1px solid ${wash(T.orange, 40)}` }}>
              <div style={{ fontSize: 12, color: T.orange, marginBottom: 9 }}>Начать новый цикл сегодня?</div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => { setShowPeriodConfirm(false); setShowFlowQuestion(true); }} style={{ flex: 1, padding: "7px", borderRadius: T.radius.sm, border: "none", background: T.orange, color: T.onAccent, cursor: "pointer", fontFamily: T.font, fontSize: 12 }}>Да</button>
                <button onClick={() => setShowPeriodConfirm(false)} style={{ flex: 1, padding: "7px", borderRadius: T.radius.sm, border: `1px solid ${T.border}`, background: "none", cursor: "pointer", fontFamily: T.font, fontSize: 12, color: T.muted }}>Отмена</button>
              </div>
            </div>
          ) : !periodActive && (
            <button onClick={() => setShowPeriodConfirm(true)} style={{ ...S.ghostBtn, color: T.orange, borderColor: wash(T.orange, 40), display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="bloodDrop" size={14} /> Начались месячные
            </button>
          )}
        </div>
      </div>

      {/* Дневник */}
      <div style={{ padding: "0 15px 90px" }}>
        {diaryStep === 4 && todayLog ? (
          <div className="sf-glass" style={{ borderRadius: T.radius.md, padding: "22px 20px", marginBottom: 8, textAlign: "center", marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
              <Orb size={68} />
            </div>
            <div style={{ fontFamily: T.fontSerif, fontSize: 16, marginBottom: 4 }}>День сохранён</div>
            {savedPhrase && (
              <p style={{ fontFamily: T.fontSerif, fontStyle: "italic", fontSize: 13, color: T.sub, margin: "0 0 14px", lineHeight: 1.5 }}>
                {savedPhrase}
              </p>
            )}
            <button onClick={editToday} style={S.ghostBtn}>Редактировать</button>
          </div>
        ) : (
          <>
            {/* Индикатор шагов */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
              {DIARY_STEPS.map((label, i) => (
                <React.Fragment key={i}>
                  <button type="button" style={S.stepBtn} onClick={() => setDiaryStep(i)} aria-label={`Шаг: ${label}`} aria-current={diaryStep === i ? "step" : undefined}>
                    <div style={S.stepDot(diaryStep === i, diaryStep > i)} />
                    <div style={{ fontSize: 12, color: diaryStep === i ? T.text : T.muted, fontWeight: diaryStep === i ? "600" : "400" }}>{label}</div>
                  </button>
                  {i < DIARY_STEPS.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: diaryStep > i ? T.green : T.border, marginBottom: 12, maxWidth: 30 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: T.muted, fontStyle: "italic", margin: "2px 0 16px" }}>
              Настроение — уже достаточно. Остальное — по желанию.
            </p>

            {/* Шаг 0 — Настроение */}
            {diaryStep === 0 && (
              <div style={S.card}>
                <p style={S.st}>Как ты сейчас? (выбери всё что есть)</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 8 }}>
                  {MOODS_BASIC.map(m => {
                    const active = selectedMoods.includes(m.id);
                    return (
                      <button key={m.id} onClick={() => toggleMood(m.id)}
                        style={{ padding: active ? "7px 1px" : "8px 2px", borderRadius: T.radius.sm, border: `${active ? 2 : 1}px solid ${active ? m.color : T.border}`, background: active ? wash(m.color, 22) : "transparent", cursor: "pointer", textAlign: "center", fontFamily: T.font }}>
                        <div style={{ display: "flex", justifyContent: "center", color: m.color }}><Icon name={m.icon} size={19} strokeWidth={1.6} /></div>
                        <div style={{ fontSize: 11, color: T.purple, marginTop: 2, fontWeight: active ? "600" : "400" }}>{m.label}</div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowExtendedMoods(v => !v)}
                  style={{ width: "100%", padding: "6px", borderRadius: T.radius.sm, border: `1px dashed ${T.border}`, background: "transparent", cursor: "pointer", fontFamily: T.font, fontSize: 11, color: T.muted, marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <Icon name={showExtendedMoods ? "chevronUp" : "chevronDown"} size={12} />
                  {showExtendedMoods ? "Скрыть полутона" : "Полутона и оттенки"}
                </button>
                <div className="sf-collapse" data-open={showExtendedMoods ? "true" : "false"}>
                  <div className="sf-collapse-inner">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 8 }}>
                      {MOODS_EXTENDED.map(m => {
                        const active = selectedMoods.includes(m.id);
                        return (
                          <button key={m.id} onClick={() => toggleMood(m.id)}
                            style={{ padding: active ? "7px 1px" : "8px 2px", borderRadius: T.radius.sm, border: `${active ? 2 : 1}px solid ${active ? m.color : T.border}`, background: active ? wash(m.color, 22) : "transparent", cursor: "pointer", textAlign: "center", fontFamily: T.font }}>
                            <div style={{ display: "flex", justifyContent: "center", color: m.color }}><Icon name={m.icon} size={19} strokeWidth={1.6} /></div>
                            <div style={{ fontSize: 12, color: T.purple, marginTop: 2, fontWeight: active ? "600" : "400" }}>{m.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <p style={{ ...S.st, marginTop: 8 }}>Интенсивность · {intensity}/10</p>
                <input type="range" min={1} max={10} value={intensity} onChange={e => setIntensity(Number(e.target.value))} style={{ width: "100%", accentColor: T.accent, marginBottom: 4 }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted }}><span>Лёгко</span><span>Невыносимо</span></div>
                <button style={{ ...S.primaryBtn(), marginTop: 14 }} onClick={handleSaveDay}>Сохранить — этого достаточно</button>
                <button style={S.linkBtn} onClick={() => setDiaryStep(1)}>Добавить ещё: тело, схемы, заметки</button>
              </div>
            )}

            {/* Шаг 1 — Тело */}
            {diaryStep === 1 && (
              <div style={S.card}>
                <p style={S.st}>Тело сегодня</p>

                <div style={S.groupWrap(false)}>
                  <div style={S.groupLabel}>Выделения</div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {DISCHARGE_TYPES.map(d => <button key={d.id} style={S.chip(discharge === d.id, T.accent)} onClick={() => setDischarge(discharge === d.id ? null : d.id)}><Icon name={d.icon} size={13} /> {d.label}</button>)}
                  </div>
                </div>

                <div style={S.groupWrap(false)}>
                  <div style={S.groupLabel}>Пищеварение</div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {DIGESTION.map(d => <button key={d.id} style={S.chip(digestion === d.id, T.green)} onClick={() => setDigestion(digestion === d.id ? null : d.id)}><Icon name={d.icon} size={13} /> {d.label}</button>)}
                  </div>
                </div>

                <div style={S.groupWrap(false)}>
                  <div style={S.groupLabel}>Либидо</div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {LIBIDO.map(l => <button key={l.id} style={S.chip(libido === l.id, T.yellow)} onClick={() => setLibido(libido === l.id ? null : l.id)}><Icon name={l.icon} size={13} /> {l.label}</button>)}
                  </div>
                </div>

                <div style={S.groupWrap(true)}>
                  <div style={S.groupLabel}>Симптомы</div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {PHYSICAL_SYMPTOMS.map(s => <button key={s.id} style={S.chip(symptoms.includes(s.id), T.mood.activated)} onClick={() => toggleSymptom(s.id)}><Icon name={s.icon} size={13} /> {s.label}</button>)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.ghostBtn, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setDiaryStep(0)}><Icon name="arrowLeft" size={13} /> Назад</button>
                  <button style={{ ...S.ghostBtn, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setDiaryStep(2)}>Далее <Icon name="arrowRight" size={13} /></button>
                </div>
                <button style={{ ...S.primaryBtn(), marginTop: 8 }} onClick={handleSaveDay}>Сохранить день</button>
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
                    <div style={S.groupWrap(false)}>
                      <div style={S.groupLabel}>Твои частые схемы</div>
                      {SCHEMAS.filter(s => topIds.includes(s.id)).map(schema => {
                        const active = activeSchemas.includes(schema.id);
                        return (
                          <div key={schema.id}
                            style={{ display: "flex", alignItems: "center", padding: "8px 10px", borderRadius: T.radius.sm, border: `${active ? 2 : 1}px solid ${active ? T.accent : T.border}`, background: active ? T.accentWash : "transparent", marginBottom: 4, cursor: "pointer" }}
                            onClick={() => toggleSchema(schema.id)}
                            onDoubleClick={() => onSchemaPopup(schema)}>
                            <span style={{ marginRight: 8, display: "inline-flex", color: T.muted }}><Icon name={schema.icon} size={14} /></span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13 }}>{schema.name}</div>
                              <div style={{ fontSize: 11, color: T.muted }}>{schema.desc}</div>
                            </div>
                            {active && <span style={{ color: T.accent, fontWeight: "700", display: "inline-flex" }}><Icon name="check" size={14} /></span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <CompanionSay phrase={emptySchemasPhrase} size={28} style={{ padding: "10px 12px", marginBottom: 12 }} />
                  );
                })()}
                <details className="sf-details" style={{ marginBottom: 12 }}>
                  <summary style={{ fontSize: 13, color: T.muted, cursor: "pointer", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>Все 18 схем <span className="sf-details-caret" style={{ display: "inline-flex" }}><Icon name="chevronDown" size={12} /></span></summary>
                  {DOMAINS.map(domain => (
                    <div key={domain}>
                      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, marginTop: 8 }}>{domain}</div>
                      {SCHEMAS.filter(sc => sc.domain === domain).map(schema => {
                        const active = activeSchemas.includes(schema.id);
                        return (
                          <div key={schema.id}
                            style={{ display: "flex", alignItems: "center", padding: "7px 9px", borderRadius: T.radius.xs, border: `${active ? 2 : 1}px solid ${active ? T.accent : T.border}`, background: active ? T.accentWash : "transparent", marginBottom: 3, cursor: "pointer" }}
                            onClick={() => toggleSchema(schema.id)}
                            onDoubleClick={() => onSchemaPopup(schema)}>
                            <span style={{ marginRight: 7, display: "inline-flex", color: T.muted }}><Icon name={schema.icon} size={13} /></span>
                            <span style={{ fontSize: 11 }}>{schema.name}</span>
                            {active && <span style={{ marginLeft: "auto", color: T.accent, fontWeight: "700", display: "inline-flex" }}><Icon name="check" size={13} /></span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </details>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.ghostBtn, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setDiaryStep(1)}><Icon name="arrowLeft" size={13} /> Назад</button>
                  <button style={{ ...S.ghostBtn, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setDiaryStep(3)}>Далее <Icon name="arrowRight" size={13} /></button>
                </div>
                <button style={{ ...S.primaryBtn(), marginTop: 8 }} onClick={handleSaveDay}>Сохранить день</button>
              </div>
            )}

            {/* Шаг 3 — Заметки */}
            {diaryStep === 3 && (
              <div style={S.card}>
                <p style={S.st}>Заметки дня</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                  placeholder="Что происходит? Что заметила? Можно просто поток мыслей..."
                  style={{ ...S.textarea, marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.ghostBtn, flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }} onClick={() => setDiaryStep(2)}><Icon name="arrowLeft" size={13} /> Назад</button>
                  <button style={{ ...S.primaryBtn(), flex: 2 }} onClick={handleSaveDay}>Сохранить день</button>
                </div>
              </div>
            )}
            {saveError && (
              <p style={{ color: T.red, fontSize: 13, margin: "10px 0 0", textAlign: "center" }}>
                Не удалось сохранить — проверь соединение и попробуй ещё раз
              </p>
            )}
          </>
        )}

        {/* Медкарточка фазы — справочный блок, самый тихий уровень иерархии */}
        <div style={{ ...S.cardQuiet, borderLeft: `3px solid ${phase.color}` }}>
          <button
            type="button"
            aria-expanded={phaseExpanded}
            aria-controls="home-phase-details"
            onClick={() => setPhaseExpanded(expanded => !expanded)}
            style={{ width: "100%", padding: 0, border: "none", background: "transparent", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", cursor: "pointer", fontFamily: T.font }}
          >
            <p style={{ ...S.st, color: phase.color, margin: 0 }}>Что происходит в теле</p>
            <span style={{ color: T.muted, transition: "transform 0.2s", display: "inline-flex", transform: phaseExpanded ? "rotate(180deg)" : "rotate(0deg)" }}><Icon name="chevronDown" size={13} /></span>
          </button>
          {!phaseExpanded && <p style={{ fontSize: 13, color: T.muted, margin: "6px 0 0", lineHeight: 1.5, fontStyle: "italic" }}>{phase.tip}</p>}
          <div id="home-phase-details" className="sf-collapse" data-open={phaseExpanded ? "true" : "false"}>
            <div className="sf-collapse-inner">
              <div style={{ paddingTop: 10 }}>
                <p style={{ fontSize: 13, color: T.purple, lineHeight: 1.7, margin: "0 0 8px" }}>{phase.gynComment}</p>
                <div style={{ fontSize: 12, color: phase.color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Психологически</div>
                <p style={{ fontSize: 13, color: T.purple, lineHeight: 1.7, margin: 0 }}>{phase.mentalComment}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {chatOpen && <CompanionChat onClose={() => setChatOpen(false)} />}
    </div>
  );
}
