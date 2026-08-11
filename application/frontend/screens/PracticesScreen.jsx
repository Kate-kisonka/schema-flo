import React from "react";
import { T, wash } from "../constants/theme.js";
import { EXERCISES, NEEDS, NEED_LEVELS } from "../data.js";
import { formatDate } from "../utils.js";
import Breathing478 from "../components/Breathing478.jsx";
import { CompanionSay } from "../components/Companion.jsx";
import { companionSay } from "../constants/companion.js";
import Icon from "../components/icons.jsx";

const S = {
  content:     { padding: "0 16px 100px" },
  card:        { background: T.card, borderRadius: 12, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}`, boxShadow: T.shadow.e1 },
  cardQuiet:   { background: T.card, borderRadius: 12, padding: "14px 16px", marginBottom: 8, border: `1px solid ${T.border}` },
  st:         { fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "500" },
  textarea:   { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontFamily: T.font, fontSize: 14, color: T.text, resize: "none", boxSizing: "border-box", lineHeight: 1.6 },
  primaryBtn: (color) => ({ width: "100%", padding: "13px", background: color || T.accent, color: T.onAccent, border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: "500" }),
  ghostBtn:   { width: "100%", padding: "12px", background: T.card, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: T.font },
  tabBar:     (active) => ({ flex: 1, padding: "7px 2px", border: "none", background: active ? T.text : "transparent", color: active ? T.bg : T.muted, borderRadius: 7, cursor: "pointer", fontFamily: T.font, fontSize: 11 }),
};

const TABS = [
  { id: "crisis",  label: "Кризис", icon: "crisis",  color: T.orange },
  { id: "schema",  label: "Схема",  icon: "schema",  color: T.accent },
  { id: "cbt",     label: "КПТ",    icon: "cbt",     color: T.blue   },
  { id: "silence", label: "Тишина", icon: "silence", color: T.greenDark },
];

function TabIcon({ name, color, size = 14 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "crisis")  return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></svg>);
  if (name === "schema")  return (<svg {...p}><path d="M12 20s-6-4-6-9a3.6 3.6 0 0 1 6-2.6A3.6 3.6 0 0 1 18 11c0 5-6 9-6 9Z" /></svg>);
  if (name === "cbt")     return (<svg {...p}><path d="M9.5 18h5M10.5 21h3" /><path d="M12 3a6 6 0 0 0-3.7 10.7c.6.5.9 1.1.9 2.3h5.6c0-1.2.3-1.8.9-2.3A6 6 0 0 0 12 3Z" /></svg>);
  if (name === "silence") return (<svg {...p}><path d="M5 9.5v5h3l4 3.5v-12L8 9.5H5Z" /><path d="M16 10l4 4M20 10l-4 4" /></svg>);
  return null;
}

function TabButton({ tab, active, onClick }) {
  return (
    <button style={S.tabBar(active)} onClick={onClick}>
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <TabIcon name={tab.icon} color={active ? T.bg : T.muted} /> {tab.label}
      </span>
    </button>
  );
}

export default function PracticesScreen({ silence, diary }) {
  const [exerciseTab,   setExerciseTab]   = React.useState("crisis");
  const [activeExercise, setActiveExercise] = React.useState(null);

  const { completedExercises, markExerciseDone } = diary;

  const {
    silenceActive, silenceDays, adjustDays,
    silenceStartDate,
    needsChecked, toggleNeed,
    morningNote, setMorningNote,
    goodDone, setGoodDone,
    goodTomorrow, setGoodTomorrow,
    silenceDayNum, startSilence, saveSilenceDay,
  } = silence;

  const [saved, setSaved] = React.useState(false);
  const [silencePhrase, setSilencePhrase] = React.useState(null);

  const currentColor = TABS.find(t => t.id === exerciseTab)?.color || T.accent;

  // Реплика компаньона перекатывается только при смене вкладки, не при каждом ре-рендере
  const introPhrase = React.useMemo(
    () => companionSay(exerciseTab === "crisis" ? "practice_crisis" : "practice_intro"),
    [exerciseTab]
  );

  const handleSaveSilence = () => {
    saveSilenceDay();
    setSaved(true);
    setSilencePhrase(companionSay("silence_save"));
    setTimeout(() => setSaved(false), 900);
    setTimeout(() => setSilencePhrase(null), 3200);
  };

  // Экран активного упражнения
  if (activeExercise) {
    return (
      <div style={S.content}>
        <button onClick={() => setActiveExercise(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", marginBottom: 12, fontFamily: T.font, fontSize: 13, padding: "16px 0 0", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="arrowLeft" size={14} /> Назад
        </button>
        <div style={{ ...S.card, borderLeft: `3px solid ${currentColor}` }}>
          <div style={{ marginBottom: 8, color: currentColor }}>
            <Icon name={activeExercise.icon} size={26} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 18, marginBottom: 5 }}>{activeExercise.name}</div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="clock" size={12} /> {activeExercise.duration}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{activeExercise.desc}</div>

          {activeExercise.id === "breathing_478"   && <Breathing478 />}
          {activeExercise.id === "thought_record"  && (
            <div>
              {["Ситуация", "Автоматическая мысль", "Эмоция (0–100%)", "Альтернативная мысль", "Результат"].map(label => (
                <div key={label} style={{ marginBottom: 9 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>{label}</div>
                  <textarea rows={2} style={S.textarea} placeholder="..." />
                </div>
              ))}
            </div>
          )}
          {activeExercise.id === "inner_child"    && <textarea rows={6} style={{ ...S.textarea, marginTop: 4 }} placeholder="Дорогая маленькая я..." />}
          {activeExercise.id === "healthy_adult"  && <textarea rows={5} style={{ ...S.textarea, marginTop: 4 }} placeholder="Я слышу тебя..." />}
          {activeExercise.id === "needs_ex"       && <textarea rows={4} style={{ ...S.textarea, marginTop: 4 }} placeholder="Прямо сейчас мне нужно..." />}

          <button onClick={() => { markExerciseDone(activeExercise.id); setActiveExercise(null); }} style={{ ...S.primaryBtn(T.green), marginTop: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="check" size={15} /> Выполнено
          </button>
        </div>
      </div>
    );
  }

  // Вкладка Тишина
  if (exerciseTab === "silence") {
    const dayNum   = silenceDayNum();
    const progress = silenceDays > 0 ? (dayNum / silenceDays) * 100 : 0;

    return (
      <div style={S.content}>
        <div style={{ padding: "16px 0 0" }}>
          <div style={{ display: "flex", gap: 3, marginBottom: 14, background: T.card, padding: 3, borderRadius: 9, border: `1px solid ${T.border}` }}>
            {TABS.map(t => <TabButton key={t.id} tab={t} active={exerciseTab === t.id} onClick={() => setExerciseTab(t.id)} />)}
          </div>

          {!silenceActive ? (
            <>
              <div style={{ ...S.card, textAlign: "center" }}>
                <div style={{ marginBottom: 8, color: T.greenDark, display: "flex", justifyContent: "center" }}>
                  <Icon name="mute" size={28} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 17, marginBottom: 6 }}>Практика #Тишины</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginBottom: 14 }}>Ежедневная практика для перехода через кризис — чек-ап потребностей, движение, письменный монолог, два вопроса дня.</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 5 }}>Длительность (дней)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                    <button onClick={() => adjustDays(-7)} aria-label="Уменьшить на неделю" style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${T.border}`, background: "none", fontSize: 18, cursor: "pointer", color: T.sub }}>−</button>
                    <div style={{ fontSize: 32 }} aria-live="polite">{silenceDays}</div>
                    <button onClick={() => adjustDays(7)} aria-label="Добавить неделю" style={{ width: 44, height: 44, borderRadius: "50%", border: `1px solid ${T.border}`, background: "none", fontSize: 18, cursor: "pointer", color: T.sub }}>+</button>
                  </div>
                </div>
                <button onClick={startSilence} style={S.primaryBtn(T.greenDark)}>Начать практику</button>
              </div>
              <div style={{ ...S.cardQuiet, background: wash(T.accent, 5) }}>
                <p style={{ ...S.st, marginBottom: 8 }}>Как работает</p>
                {["Утром: чек-ап потребностей по пирамиде Маслоу", "В течение дня: движение / танец в своём состоянии", "После движения: записать мысли и чувства", "Вечером: два вопроса дня"].map((text, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, marginBottom: 9, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.text, color: T.bg, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ fontSize: 13, color: T.purple, lineHeight: 1.5 }}>{text}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...S.card, background: T.text, color: T.bg, marginTop: 0, boxShadow: T.shadow.e2 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Практика тишины</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{dayNum} из {silenceDays}</div>
                </div>
                <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>{dayNum}</div>
                <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 3, height: 3, marginBottom: 6 }}>
                  <div style={{ background: T.green, height: 3, borderRadius: 3, width: progress + "%", transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>Начало: {formatDate(silenceStartDate)}</div>
              </div>

              <div style={S.card}>
                <p style={{ ...S.st, display: "flex", alignItems: "center", gap: 5 }}><Icon name="sunrise" size={13} /> Чек-ап потребностей (утро)</p>
                {NEED_LEVELS.map(level => (
                  <div key={level.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: level.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, fontWeight: "bold" }}>{level.label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap" }}>
                      {NEEDS.filter(n => n.level === level.id).map(need => {
                        const checked = needsChecked.includes(need.id);
                        return (
                          <button key={need.id} onClick={() => toggleNeed(need.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: checked ? "4px 7px" : "5px 8px", borderRadius: 14, border: `${checked ? 2 : 1}px solid ${checked ? level.color : T.border}`, background: checked ? wash(level.color, 22) : "transparent", cursor: "pointer", fontFamily: T.font, fontSize: 11, fontWeight: checked ? "600" : "400", marginRight: 4, marginBottom: 4 }}>
                            {checked && <Icon name="check" size={11} />}<Icon name={need.icon} size={12} /> {need.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <p style={{ ...S.st, display: "flex", alignItems: "center", gap: 5 }}><Icon name="flex" size={13} /> После движения</p>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 7, fontStyle: "italic" }}>Включи музыку которая отражает состояние. Подвигайся. Потом запиши.</div>
                <textarea value={morningNote} onChange={e => setMorningNote(e.target.value)} rows={4} placeholder="Что живёт во мне сегодня..." style={S.textarea} />
              </div>

              <div style={S.card}>
                <p style={{ ...S.st, display: "flex", alignItems: "center", gap: 5 }}><Icon name="moon" size={13} /> Два вопроса вечера</p>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Что хорошего / важного для себя я сделала сегодня?</div>
                <textarea value={goodDone} onChange={e => setGoodDone(e.target.value)} rows={2} placeholder="..." style={{ ...S.textarea, marginBottom: 10 }} />
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Что хорошего / важного хочу сделать завтра?</div>
                <textarea value={goodTomorrow} onChange={e => setGoodTomorrow(e.target.value)} rows={2} placeholder="..." style={S.textarea} />
              </div>

              <button style={S.primaryBtn(saved ? T.green : T.greenDark)} onClick={handleSaveSilence}>Сохранить день тишины</button>
              {silencePhrase && (
                <p style={{ fontFamily: T.fontSerif, fontStyle: "italic", fontSize: 13, color: T.sub, textAlign: "center", margin: "10px 0 0", lineHeight: 1.5 }}>
                  {silencePhrase}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Остальные вкладки (кризис, схема, КПТ)
  return (
    <div style={S.content}>
      <div style={{ padding: "16px 0 0" }}>
        <div style={{ display: "flex", gap: 3, marginBottom: 14, background: T.card, padding: 3, borderRadius: 9, border: `1px solid ${T.border}` }}>
          {TABS.map(t => <TabButton key={t.id} tab={t} active={exerciseTab === t.id} onClick={() => setExerciseTab(t.id)} />)}
        </div>

        <CompanionSay phrase={introPhrase} style={{ marginBottom: 12 }} />

        {EXERCISES[exerciseTab]?.map(ex => (
          <div key={ex.id}
            style={{ background: T.card, border: `1px solid ${wash(currentColor, 44)}`, borderLeft: `3px solid ${completedExercises.includes(ex.id) ? T.green : currentColor}`, borderRadius: 10, padding: 13, marginBottom: 8, cursor: "pointer", boxShadow: T.shadow.e1 }}
            onClick={() => setActiveExercise(ex)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "inline-flex", color: currentColor }}><Icon name={ex.icon} size={22} strokeWidth={1.5} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: T.muted, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="clock" size={11} /> {ex.duration}
                </div>
              </div>
              {completedExercises.includes(ex.id) && (
                <span style={{ color: T.green, fontSize: 14, fontWeight: "700", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Icon name="check" size={14} /> Готово
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: T.purple, marginTop: 8, lineHeight: 1.5 }}>{ex.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
