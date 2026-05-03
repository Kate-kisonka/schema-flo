import React, { useState } from "react";
import { T } from "../constants/theme";
import { SCHEMAS, MOODS, CYCLE_PHASES, DISCHARGE_TYPES, LIBIDO, PHYSICAL_SYMPTOMS, EXERCISES } from "../data";
import { getPhase, getTodayKey, formatDate, getDayOfWeek } from "../utils";

const S = {
  content:    { padding: "0 16px 100px" },
  card:       { background: T.card, borderRadius: 12, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}` },
  st:         { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "500" },
  tabBar:     (active) => ({ flex: 1, padding: "7px 2px", border: "none", background: active ? T.text : "transparent", color: active ? T.bg : T.muted, borderRadius: 7, cursor: "pointer", fontFamily: T.font, fontSize: 10 }),
};

const ALL_EXERCISES = [...EXERCISES.crisis, ...EXERCISES.schema, ...EXERCISES.cbt];

export default function HistoryScreen({ logs, periodHistory, history, onSelectLog }) {
  const [historyTab, setHistoryTab] = useState("list");
  const { last14, insights, calendarDays, cyclePhaseStats } = history;

  const avgCycleLength = () => {
    const lens = periodHistory.filter(p => p.cycleLength && p.cycleLength > 15 && p.cycleLength < 50).map(p => p.cycleLength);
    return lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : null;
  };

  const exportCsv = () => {
    const rows = ["Дата,День цикла,Фаза,Настроение,Интенсивность,Схемы,Выделения,Либидо,Симптомы,Заметки"];
    logs.forEach(l => {
      const moods    = l.moods?.map(id => MOODS.find(m => m.id === id)?.label).filter(Boolean).join("|") || "";
      const schemas  = l.schemas?.map(id => SCHEMAS.find(s => s.id === id)?.name).filter(Boolean).join("|") || "";
      const symptoms = l.symptoms?.map(id => PHYSICAL_SYMPTOMS.find(s => s.id === id)?.label).filter(Boolean).join("|") || "";
      const discharge = DISCHARGE_TYPES.find(d => d.id === l.discharge)?.label || "";
      const libido    = LIBIDO.find(x => x.id === l.libido)?.label || "";
      const notes     = (l.notes || "").replace(/,/g, ";").replace(/\n/g, " ");
      rows.push([l.date, l.cycleDay, l.phase, moods, l.intensity || "", schemas, discharge, libido, symptoms, notes].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `schema-flo-${getTodayKey()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const data = { exported: getTodayKey(), logs, periodHistory };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `schema-flo-backup-${getTodayKey()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        // Импорт через localStorage — при переходе на IndexedDB здесь будет db.import(data)
        if (data.logs)          localStorage.setItem("schema_logs",    JSON.stringify(data.logs));
        if (data.periodHistory) localStorage.setItem("period_history", JSON.stringify(data.periodHistory));
        window.location.reload();
      } catch {
        alert("Ошибка: файл повреждён или неверный формат.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={S.content}>
      <div style={{ padding: "16px 0 0" }}>
        <div style={{ display: "flex", gap: 3, marginBottom: 10, background: T.card, padding: 3, borderRadius: 9, border: `1px solid ${T.border}` }}>
          {[{ id: "list", label: "📋 Дни" }, { id: "calendar", label: "📅 Кал." }, { id: "charts", label: "📊 Графики" }, { id: "insights", label: "💡 Инсайты" }].map(t => (
            <button key={t.id} style={S.tabBar(historyTab === t.id)} onClick={() => setHistoryTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button onClick={exportCsv} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", fontFamily: T.font, fontSize: 11, color: T.text }}>⬇ CSV</button>
          <button onClick={exportJson} style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", fontFamily: T.font, fontSize: 11, color: T.text }}>⬇ JSON</button>
          <label style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${T.accent}`, background: T.card, cursor: "pointer", fontFamily: T.font, fontSize: 11, color: T.accent, textAlign: "center" }}>
            ⬆ Восстановить
            <input type="file" accept=".json" onChange={importJson} style={{ display: "none" }} />
          </label>
        </div>

        {/* Список */}
        {historyTab === "list" && (
          <div>
            {periodHistory.length > 0 && (
              <div style={{ ...S.card, background: T.orange + "08", borderColor: T.orange + "44" }}>
                <p style={{ ...S.st, color: T.orange }}>Статистика цикла</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "средний цикл", val: avgCycleLength() ? avgCycleLength() + "д" : "—" },
                    { label: "циклов записано", val: periodHistory.length },
                    ...(periodHistory.filter(p => p.cycleLength).length >= 2 ? [{
                      label: "разброс",
                      val: Math.min(...periodHistory.filter(p => p.cycleLength).map(p => p.cycleLength)) + "–" + Math.max(...periodHistory.filter(p => p.cycleLength).map(p => p.cycleLength)) + "д",
                    }] : []),
                  ].map((item, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", background: T.card, borderRadius: 9, padding: "9px 4px", border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 20, fontWeight: "bold", color: T.orange }}>{item.val}</div>
                      <div style={{ fontSize: 9, color: T.muted, marginTop: 2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {logs.length === 0 && <div style={{ textAlign: "center", padding: 36, color: T.muted, fontStyle: "italic", fontSize: 13 }}>Пока нет записей</div>}
            {logs.map((log, i) => {
              const lp = getPhase(log.cycleDay || 1);
              return (
                <div key={log.date + i} style={{ ...S.card, borderLeft: `3px solid ${lp.color}`, cursor: "pointer" }} onClick={() => onSelectLog(log)}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ fontSize: 13 }}>{getDayOfWeek(log.date)}, {formatDate(log.date)}</div>
                    <div style={{ fontSize: 10, color: lp.color }}>День {log.cycleDay}</div>
                  </div>
                  {log.moods?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {log.moods.slice(0, 6).map(id => { const m = MOODS.find(x => x.id === id); return m ? <span key={id} style={{ fontSize: 15 }}>{m.emoji}</span> : null; })}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, color: T.muted }}>Интенсивность: {log.intensity}/10</div>
                    <div style={{ fontSize: 10, color: T.muted }}>→</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Календарь */}
        {historyTab === "calendar" && (
          <div style={S.card}>
            <p style={{ ...S.st, marginBottom: 10 }}>{new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 6 }}>
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 9, color: T.muted, padding: "3px 0" }}>{d}</div>)}
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const lp = day.log ? getPhase(day.log.cycleDay || 1) : null;
                const isToday = day.dateStr === getTodayKey();
                return (
                  <div key={day.dateStr} onClick={() => day.log && onSelectLog(day.log)}
                    style={{ textAlign: "center", padding: "5px 1px", borderRadius: 6, background: lp ? lp.color + "33" : isToday ? "#1A102815" : "transparent", border: isToday ? `1px solid ${T.text}` : "1px solid transparent", cursor: day.log ? "pointer" : "default", fontSize: 11 }}>
                    {day.d}
                    {day.log?.moods?.length > 0 && <div style={{ fontSize: 7, marginTop: 1 }}>{MOODS.find(m => m.id === day.log.moods[0])?.emoji}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {CYCLE_PHASES.map(p => <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.muted }}><div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />{p.name}</div>)}
            </div>
          </div>
        )}

        {/* Графики */}
        {historyTab === "charts" && (
          <div>
            {last14.length < 2
              ? <div style={{ textAlign: "center", padding: 36, color: T.muted, fontStyle: "italic", fontSize: 13 }}>Нужно минимум 2 записи</div>
              : <>
                <div style={S.card}>
                  <p style={S.st}>Интенсивность (14 дней)</p>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80 }}>
                    {last14.map((log, i) => {
                      const h  = ((log.intensity || 5) / 10) * 70;
                      const lp = getPhase(log.cycleDay || 1);
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                          <div style={{ width: "100%", background: lp.color, borderRadius: "3px 3px 0 0", height: h + "px", minHeight: 3, opacity: 0.7 }} />
                          <div style={{ fontSize: 8, color: T.muted, transform: "rotate(-45deg)", transformOrigin: "right", whiteSpace: "nowrap" }}>{log.date.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={S.card}>
                  <p style={S.st}>Частые эмоции</p>
                  {(() => {
                    const c = {};
                    last14.forEach(l => l.moods?.forEach(id => { c[id] = (c[id] || 0) + 1; }));
                    const s = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
                    const max = s[0]?.[1] || 1;
                    return s.map(([id, count]) => {
                      const m = MOODS.find(x => x.id === id);
                      return m ? (
                        <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                          <span style={{ fontSize: 16, width: 20 }}>{m.emoji}</span>
                          <div style={{ flex: 1, background: T.border, borderRadius: 3, height: 7, overflow: "hidden" }}>
                            <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: m.color, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: T.muted, width: 20, textAlign: "right" }}>{count}</span>
                        </div>
                      ) : null;
                    });
                  })()}
                </div>

                <div style={S.card}>
                  <p style={S.st}>Топ схем</p>
                  {(() => {
                    const c = {};
                    last14.forEach(l => l.schemas?.forEach(id => { c[id] = (c[id] || 0) + 1; }));
                    const s = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    if (!s.length) return <div style={{ fontSize: 12, color: T.muted }}>Схемы не отмечались</div>;
                    const max = s[0]?.[1] || 1;
                    return s.map(([id, count]) => {
                      const sc = SCHEMAS.find(x => x.id === id);
                      return sc ? (
                        <div key={id} style={{ marginBottom: 9 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                            <span>{sc.emoji} {sc.name}</span>
                            <span style={{ color: T.muted }}>{count}×</span>
                          </div>
                          <div style={{ background: T.border, borderRadius: 3, height: 5, overflow: "hidden" }}>
                            <div style={{ width: `${(count / max) * 100}%`, height: "100%", background: T.accent, borderRadius: 3 }} />
                          </div>
                        </div>
                      ) : null;
                    });
                  })()}
                </div>

                <div style={S.card}>
                  <p style={S.st}>Интенсивность по фазам</p>
                  {cyclePhaseStats.map(cp => (
                    <div key={cp.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: cp.color, flexShrink: 0 }} />
                      <div style={{ fontSize: 11, width: 90, flexShrink: 0 }}>{cp.name}</div>
                      <div style={{ flex: 1, background: T.border, borderRadius: 3, height: 7, overflow: "hidden" }}>
                        <div style={{ width: `${(cp.avg / 10) * 100}%`, height: "100%", background: cp.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, color: T.muted }}>{cp.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </>
            }
          </div>
        )}

        {/* Инсайты */}
        {historyTab === "insights" && (
          <div>
            {insights.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 36 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                <div style={{ fontSize: 13, color: T.muted }}>Нужно больше записей — минимум 3-5 дней</div>
              </div>
            ) : insights.map((ins, i) => (
              <div key={i} style={{ ...S.card, display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${T.accent}` }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{ins.emoji}</div>
                <div style={{ fontSize: 13, color: T.purple, lineHeight: 1.6 }}>{ins.text}</div>
              </div>
            ))}
            {logs.length >= 5 && (
              <div style={{ ...S.card, background: "#1A102808" }}>
                <p style={{ ...S.st, marginBottom: 8 }}>Что это значит?</p>
                <p style={{ fontSize: 12, color: T.purple, lineHeight: 1.7, margin: 0 }}>
                  Паттерны помогают увидеть связь между циклом, схемами и состоянием. Поделись этими наблюдениями с терапевтом — это ценный материал для работы.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
