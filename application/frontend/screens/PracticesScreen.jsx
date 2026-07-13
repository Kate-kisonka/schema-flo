import React from "react";
import { T } from "../constants/theme.js";
import { EXERCISES, NEEDS, NEED_LEVELS } from "../data.js";
import { formatDate, getTodayKey } from "../utils.js";
import Breathing478 from "../components/Breathing478.jsx";

const S = {
  content:    { padding: "0 16px 100px" },
  card:       { background: T.card, borderRadius: 12, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}` },
  st:         { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "500" },
  textarea:   { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontFamily: T.font, fontSize: 14, color: T.text, resize: "none", boxSizing: "border-box", lineHeight: 1.6 },
  primaryBtn: (color) => ({ width: "100%", padding: "13px", background: color || T.accent, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: T.font, fontWeight: "500" }),
  ghostBtn:   { width: "100%", padding: "12px", background: T.card, color: T.sub, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, cursor: "pointer", fontFamily: T.font },
  tabBar:     (active) => ({ flex: 1, padding: "7px 2px", border: "none", background: active ? T.text : "transparent", color: active ? T.bg : T.muted, borderRadius: 7, cursor: "pointer", fontFamily: T.font, fontSize: 10 }),
};

const TABS = [
  { id: "crisis",  label: "🆘 Кризис", color: T.orange },
  { id: "schema",  label: "🧸 Схема",  color: T.accent },
  { id: "cbt",     label: "🧠 КПТ",    color: T.blue   },
  { id: "silence", label: "🤫 Тишина", color: T.greenDark },
];

export default function PracticesScreen({ silence, diary }) {
  const [exerciseTab,   setExerciseTab]   = React.useState("crisis");
  const [activeExercise, setActiveExercise] = React.useState(null);

  const { completedExercises, markExerciseDone } = diary;

  const {
    silenceActive, silenceDays, adjustDays,
    silenceStartDate, silenceLogs,
    needsChecked, toggleNeed,
    morningNote, setMorningNote,
    goodDone, setGoodDone,
    goodTomorrow, setGoodTomorrow,
    silenceDayNum, startSilence, saveSilenceDay,
  } = silence;

  const [saved, setSaved] = React.useState(false);

  const currentColor = TABS.find(t => t.id === exerciseTab)?.color || T.accent;

  const handleSaveSilence = () => {
    saveSilenceDay();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Экран активного упражнения
  if (activeExercise) {
    return (
      <div style={S.content}>
        <button onClick={() => setActiveExercise(null)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", marginBottom: 12, fontFamily: T.font, fontSize: 13, padding: "16px 0 0" }}>← Назад</button>
        <div style={{ ...S.card, borderLeft: `3px solid ${currentColor}` }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>{activeExercise.icon}</div>
          <div style={{ fontSize: 18, marginBottom: 5 }}>{activeExercise.name}</div>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>⏱ {activeExercise.duration}</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{activeExercise.desc}</div>

          {activeExercise.id === "breathing_478"   && <Breathing478 />}
          {activeExercise.id === "thought_record"  && (
            <div>
              {["Ситуация", "Автоматическая мысль", "Эмоция (0–100%)", "Альтернативная мысль", "Результат"].map(label => (
                <div key={label} style={{ marginBottom: 9 }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>{label}</div>
                  <textarea rows={2} style={S.textarea} placeholder="..." />
                </div>
              ))}
            </div>
          )}
          {activeExercise.id === "inner_child"    && <textarea rows={6} style={{ ...S.textarea, marginTop: 4 }} placeholder="Дорогая маленькая я..." />}
          {activeExercise.id === "healthy_adult"  && <textarea rows={5} style={{ ...S.textarea, marginTop: 4 }} placeholder="Я слышу тебя..." />}
          {activeExercise.id === "needs_ex"       && <textarea rows={4} style={{ ...S.textarea, marginTop: 4 }} placeholder="Прямо сейчас мне нужно..." />}

          <button onClick={() => { markExerciseDone(activeExercise.id); setActiveExercise(null); }} style={{ ...S.primaryBtn(T.green), marginTop: 16 }}>✓ Выполнено</button>
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
            {TABS.map(t => <button key={t.id} style={S.tabBar(exerciseTab === t.id)} onClick={() => setExerciseTab(t.id)}>{t.label}</button>)}
          </div>

          {!silenceActive ? (
            <>
              <div style={{ ...S.card, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🤫</div>
                <div style={{ fontSize: 17, marginBottom: 6 }}>Практика #Тишины</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginBottom: 14 }}>Ежедневная практика для перехода через кризис — чек-ап потребностей, движение, письменный монолог, два вопроса дня.</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: T.muted, marginBottom: 5 }}>Длительность (дней)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                    <button onClick={() => adjustDays(-7)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.border}`, background: "none", fontSize: 16, cursor: "pointer" }}>−</button>
                    <div style={{ fontSize: 32 }}>{silenceDays}</div>
                    <button onClick={() => adjustDays(7)} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.border}`, background: "none", fontSize: 16, cursor: "pointer" }}>+</button>
                  </div>
                </div>
                <button onClick={startSilence} style={S.primaryBtn(T.greenDark)}>Начать практику</button>
              </div>
              <div style={{ ...S.card, background: "#1A102808" }}>
                <p style={{ ...S.st, marginBottom: 8 }}>Как работает</p>
                {["Утром: чек-ап потребностей по пирамиде Маслоу", "В течение дня: движение / танец в своём состоянии", "После движения: записать мысли и чувства", "Вечером: два вопроса дня"].map((text, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, marginBottom: 9, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.text, color: T.bg, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ fontSize: 12, color: T.purple, lineHeight: 1.5 }}>{text}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ ...S.card, background: T.text, color: T.bg, marginTop: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Практика тишины</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{dayNum} из {silenceDays}</div>
                </div>
                <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 8 }}>{dayNum}</div>
                <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 3, height: 3, marginBottom: 6 }}>
                  <div style={{ background: T.green, height: 3, borderRadius: 3, width: progress + "%", transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>Начало: {formatDate(silenceStartDate)}</div>
              </div>

              <div style={S.card}>
                <p style={S.st}>🌅 Чек-ап потребностей (утро)</p>
                {NEED_LEVELS.map(level => (
                  <div key={level.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: level.color, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5, fontWeight: "bold" }}>{level.label}</div>
                    <div style={{ display: "flex", flexWrap: "wrap" }}>
                      {NEEDS.filter(n => n.level === level.id).map(need => (
                        <button key={need.id} onClick={() => toggleNeed(need.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "5px 8px", borderRadius: 14, border: `1px solid ${needsChecked.includes(need.id) ? level.color : T.border}`, background: needsChecked.includes(need.id) ? level.color + "22" : "transparent", cursor: "pointer", fontFamily: T.font, fontSize: 11, marginRight: 4, marginBottom: 4 }}>
                          {need.emoji} {need.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={S.card}>
                <p style={S.st}>💃 После движения</p>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 7, fontStyle: "italic" }}>Включи музыку которая отражает состояние. Подвигайся. Потом запиши.</div>
                <textarea value={morningNote} onChange={e => setMorningNote(e.target.value)} rows={4} placeholder="Что живёт во мне сегодня..." style={S.textarea} />
              </div>

              <div style={S.card}>
                <p style={S.st}>🌙 Два вопроса вечера</p>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Что хорошего / важного для себя я сделала сегодня?</div>
                <textarea value={goodDone} onChange={e => setGoodDone(e.target.value)} rows={2} placeholder="..." style={{ ...S.textarea, marginBottom: 10 }} />
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>Что хорошего / важного хочу сделать завтра?</div>
                <textarea value={goodTomorrow} onChange={e => setGoodTomorrow(e.target.value)} rows={2} placeholder="..." style={S.textarea} />
              </div>

              <button style={S.primaryBtn(saved ? T.green : T.greenDark)} onClick={handleSaveSilence}>
                {saved ? "✓ Сохранено" : "Сохранить день тишины"}
              </button>
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
          {TABS.map(t => <button key={t.id} style={S.tabBar(exerciseTab === t.id)} onClick={() => setExerciseTab(t.id)}>{t.label}</button>)}
        </div>

        {exerciseTab === "crisis" && (
          <div style={{ ...S.card, background: T.orange + "08", borderColor: T.orange + "44", marginBottom: 12 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, color: T.orange }}>Сейчас очень тяжело?</p>
            <p style={{ margin: 0, fontSize: 12, color: T.purple, lineHeight: 1.5 }}>Выбери любую технику. Та, что откликается — и есть нужная.</p>
          </div>
        )}

        {EXERCISES[exerciseTab]?.map(ex => (
          <div key={ex.id}
            style={{ background: T.card, border: `1px solid ${currentColor}44`, borderLeft: `3px solid ${completedExercises.includes(ex.id) ? T.green : currentColor}`, borderRadius: 10, padding: 13, marginBottom: 8, cursor: "pointer" }}
            onClick={() => setActiveExercise(ex)}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>{ex.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, marginBottom: 2 }}>{ex.name}</div>
                <div style={{ fontSize: 10, color: T.muted }}>⏱ {ex.duration}</div>
              </div>
              {completedExercises.includes(ex.id) && <span style={{ color: T.green, fontSize: 14 }}>✓</span>}
            </div>
            <div style={{ fontSize: 12, color: T.purple, marginTop: 8, lineHeight: 1.5 }}>{ex.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
