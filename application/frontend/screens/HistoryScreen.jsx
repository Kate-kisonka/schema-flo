import React, { useMemo, useState } from "react";
import { T, wash } from "../constants/theme.js";
import { SCHEMAS, MOODS, CYCLE_PHASES, DISCHARGE_TYPES, LIBIDO, PHYSICAL_SYMPTOMS } from "../data.js";
import { getPhase, getTodayKey, formatDate, getDayOfWeek, buildCalendarDays, shiftMonth, parseLocalDate, avgCycleLength, phaseLabel } from "../utils.js";
import { importBackup } from "../services/db.js";
import Icon from "../components/icons.jsx";

function activateCardWithKeyboard(event, action) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

const S = {
  content:    { padding: "0 16px 100px" },
  card:       { background: T.card, borderRadius: 12, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}` },
  st:         { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "500" },
  tabBar:     (active) => ({ flex: 1, minHeight: 44, padding: "7px 2px", border: "none", background: active ? T.text : "transparent", color: active ? T.bg : T.muted, borderRadius: 7, cursor: "pointer", fontFamily: T.font, fontSize: 11, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }),
};

const HISTORY_TABS = [
  { id: "list",     label: "Дни" },
  { id: "calendar", label: "Кал." },
  { id: "charts",   label: "Графики" },
  { id: "insights", label: "Инсайты" },
];

function HistoryTabIcon({ name, color, size = 14 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "list")     return (<svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>);
  if (name === "calendar") return (<svg {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
  if (name === "charts")   return (<svg {...p}><path d="M4 20V10M11 20V4M18 20v-7" /></svg>);
  if (name === "insights") return (<svg {...p}><path d="M9 18h6M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.3 1 2.3h6c0-1 .3-1.7 1-2.3A7 7 0 0 0 12 2Z" /></svg>);
  return null;
}

function getCurrentMonth() {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() };
}

export default function HistoryScreen({ logs, periodHistory, history, onSelectLog, onImportComplete }) {
  const [historyTab, setHistoryTab] = useState("list");
  const [viewMonth, setViewMonth] = useState(getCurrentMonth);
  const [selectedDate, setSelectedDate] = useState(getTodayKey());
  const [importing, setImporting] = useState(false);
  const { last14, insights, cyclePhaseStats } = history;

  const monthPrefix = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, "0")}`;
  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const monthInputValue = monthPrefix;
  const isCurrentMonth = viewMonth.year === new Date().getFullYear() && viewMonth.month === new Date().getMonth();

  const calendarDays = useMemo(
    () => buildCalendarDays(viewMonth.year, viewMonth.month, logs),
    [viewMonth, logs]
  );

  const monthLogs = useMemo(
    () => logs.filter((log) => log.date?.startsWith(monthPrefix)),
    [logs, monthPrefix]
  );

  const logsByDate = useMemo(() => {
    const map = new Map();
    logs.forEach((log) => { if (log.date) map.set(log.date, log); });
    return map;
  }, [logs]);

  const selectedLog = logsByDate.get(selectedDate) || null;

  // Мягкое отражение присутствия за 14 дней — без стриков, без цифр пропусков.
  // Насыщенность точки = была ли запись в этот день, не оценка «хорошо/плохо».
  const presenceDays = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ key, hasLog: logsByDate.has(key) });
    }
    return days;
  }, [logsByDate]);

  const jumpToDate = (dateStr) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    const d = parseLocalDate(dateStr);
    if (d) setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
  };

  const navBtn = {
    border: `1px solid ${T.border}`,
    background: T.card,
    color: T.text,
    borderRadius: 8,
    minWidth: 44,
    minHeight: 44,
    padding: "6px 10px",
    cursor: "pointer",
    fontFamily: T.font,
    fontSize: 14,
    lineHeight: 1,
  };

  const avgCycle = avgCycleLength(periodHistory);

  // Экранирование по RFC 4180 + защита от формул-инъекций в Excel:
  // ячейка, начинающаяся с = + - @, исполнилась бы как формула
  const csvCell = (value) => {
    let s = String(value ?? "").replace(/\r?\n/g, " ");
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (/[",]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const exportCsv = () => {
    const rows = ["Дата,День цикла,Фаза,Настроение,Интенсивность,Схемы,Выделения,Либидо,Симптомы,Заметки"];
    logs.forEach(l => {
      const moods    = l.moods?.map(id => MOODS.find(m => m.id === id)?.label).filter(Boolean).join("|") || "";
      const schemas  = l.schemas?.map(id => SCHEMAS.find(s => s.id === id)?.name).filter(Boolean).join("|") || "";
      const symptoms = l.symptoms?.map(id => PHYSICAL_SYMPTOMS.find(s => s.id === id)?.label).filter(Boolean).join("|") || "";
      const discharge = DISCHARGE_TYPES.find(d => d.id === l.discharge)?.label || "";
      const libido    = LIBIDO.find(x => x.id === l.libido)?.label || "";
      rows.push([l.date, l.cycleDay, phaseLabel(l.phase), moods, l.intensity || "", schemas, discharge, libido, symptoms, l.notes || ""].map(csvCell).join(","));
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
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setImporting(true);
        await importBackup({
          logs: data.logs || [],
          periodHistory: data.periodHistory || [],
          silenceLogs: data.silenceLogs || [],
        });
        if (onImportComplete) await onImportComplete();
        alert("Данные импортированы в аккаунт.");
      } catch {
        alert("Ошибка: файл повреждён или импорт не удался.");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div style={S.content}>
      <div style={{ padding: "16px 0 0" }}>
        <div style={{ display: "flex", gap: 3, marginBottom: 10, background: T.card, padding: 3, borderRadius: 9, border: `1px solid ${T.border}` }}>
          {HISTORY_TABS.map(t => (
            <button key={t.id} style={S.tabBar(historyTab === t.id)} onClick={() => setHistoryTab(t.id)}>
              <HistoryTabIcon name={t.id} color={historyTab === t.id ? T.bg : T.muted} />
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button onClick={exportCsv} style={{ flex: 1, minHeight: 44, padding: "7px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", fontFamily: T.font, fontSize: 12, color: T.text, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Icon name="download" size={14} /> CSV
          </button>
          <button onClick={exportJson} style={{ flex: 1, minHeight: 44, padding: "7px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, cursor: "pointer", fontFamily: T.font, fontSize: 12, color: T.text, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Icon name="download" size={14} /> JSON
          </button>
          <label style={{ flex: 1, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px", borderRadius: 8, border: `1px solid ${T.accent}`, background: T.card, cursor: importing ? "wait" : "pointer", fontFamily: T.font, fontSize: 12, color: T.accent, textAlign: "center", opacity: importing ? 0.6 : 1 }}>
            {importing ? "Импорт…" : (<><Icon name="upload" size={14} /> Восстановить</>)}
            <input type="file" accept=".json" onChange={importJson} disabled={importing} style={{ display: "none" }} />
          </label>
        </div>

        {(historyTab === "list" || historyTab === "calendar") && (
          <div style={{ ...S.card, marginBottom: 10, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <button type="button" style={{ ...navBtn, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setViewMonth((m) => shiftMonth(m.year, m.month, -1))} aria-label="Предыдущий месяц"><Icon name="arrowLeft" size={14} /></button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{monthLabel}</div>
                <input
                  type="month"
                  value={monthInputValue}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split("-").map(Number);
                    if (year && month) setViewMonth({ year, month: month - 1 });
                  }}
                  style={{ marginTop: 4, width: "100%", fontFamily: T.font, fontSize: 11, color: T.muted, border: "none", background: "transparent", textAlign: "center" }}
                />
              </div>
              <button type="button" style={{ ...navBtn, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setViewMonth((m) => shiftMonth(m.year, m.month, 1))} aria-label="Следующий месяц"><Icon name="arrowRight" size={14} /></button>
              {!isCurrentMonth && (
                <button type="button" style={{ ...navBtn, fontSize: 11, whiteSpace: "nowrap" }} onClick={() => { const m = getCurrentMonth(); setViewMonth(m); jumpToDate(getTodayKey()); }}>
                  Сегодня
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap" }}>Перейти к дню</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => jumpToDate(e.target.value)}
                style={{ flex: 1, fontFamily: T.font, fontSize: 12, padding: "6px 8px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, color: T.text }}
              />
            </div>
          </div>
        )}

        {/* Список */}
        {historyTab === "list" && (
          <div>
            {periodHistory.length > 0 && (
              <div style={{ ...S.card, background: wash(T.orange, 8), borderColor: wash(T.orange, 44) }}>
                <p style={{ ...S.st, color: T.orange }}>Статистика цикла</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "средний цикл", val: avgCycle ? avgCycle + "д" : "—" },
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
            {logs.length > 0 && monthLogs.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: T.muted, fontStyle: "italic", fontSize: 13 }}>В этом месяце записей нет</div>
            )}
            {monthLogs.map((log, i) => {
              const lp = getPhase(log.cycleDay || 1);
              return (
                <div
                  key={log.date + i}
                  role="button"
                  tabIndex={0}
                  aria-label={`Открыть запись за ${formatDate(log.date)}, интенсивность ${log.intensity}/10`}
                  style={{ ...S.card, borderLeft: `3px solid ${lp.color}`, cursor: "pointer" }}
                  onClick={() => onSelectLog(log)}
                  onKeyDown={(event) => activateCardWithKeyboard(event, () => onSelectLog(log))}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <div style={{ fontSize: 13 }}>{getDayOfWeek(log.date)}, {formatDate(log.date)}</div>
                    <div style={{ fontSize: 10, color: lp.color }}>День {log.cycleDay}</div>
                  </div>
                  {log.moods?.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {log.moods.slice(0, 6).map(id => { const m = MOODS.find(x => x.id === id); return m ? <span key={id} style={{ color: m.color, display: "inline-flex" }}><Icon name={m.icon} size={15} /></span> : null; })}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 10, color: T.muted }}>Интенсивность: {log.intensity}/10</div>
                    <div style={{ color: T.muted, display: "flex", alignItems: "center" }}><Icon name="arrowRight" size={12} /></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Календарь */}
        {historyTab === "calendar" && (
          <>
            <div style={S.card}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, color: T.muted, padding: "4px 0", fontWeight: 500 }}>{d}</div>)}
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const lp = day.log ? getPhase(day.log.cycleDay || 1) : null;
                  const isToday = day.dateStr === getTodayKey();
                  const isSelected = day.dateStr === selectedDate;
                  const intensity = day.log?.intensity;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(day.dateStr)}
                      onDoubleClick={() => day.log && onSelectLog(day.log)}
                      aria-label={`${day.d} ${day.log ? "есть запись" : "нет записи"}`}
                      style={{
                        textAlign: "center",
                        padding: "6px 2px",
                        minHeight: 44,
                        borderRadius: 8,
                        background: lp ? wash(lp.color, 33) : isToday ? wash(T.accent, 8) : T.bg,
                        border: isSelected ? `2px solid ${T.accent}` : isToday ? `1px solid ${T.text}` : `1px solid ${T.border}`,
                        cursor: "pointer",
                        fontFamily: T.font,
                        fontSize: 12,
                        color: T.text,
                      }}
                    >
                      <div style={{ fontWeight: isSelected ? 700 : 500 }}>{day.d}</div>
                      {day.log?.moods?.length > 0 && (
                        <div style={{ marginTop: 2, display: "flex", justifyContent: "center", color: MOODS.find(m => m.id === day.log.moods[0])?.color }}>
                          <Icon name={MOODS.find(m => m.id === day.log.moods[0])?.icon} size={11} />
                        </div>
                      )}
                      {intensity != null && (
                        <div style={{ fontSize: 8, color: T.muted, marginTop: 2 }}>{intensity}/10</div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {CYCLE_PHASES.map(p => <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.muted }}><div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />{p.name}</div>)}
              </div>
              <p style={{ fontSize: 10, color: T.muted, margin: "10px 0 0", textAlign: "center" }}>Клик — выбрать день · двойной клик — открыть запись</p>
            </div>

            <div style={{ ...S.card, borderLeft: `3px solid ${selectedLog ? getPhase(selectedLog.cycleDay || 1).color : T.border}` }}>
              <p style={S.st}>{getDayOfWeek(selectedDate)}, {formatDate(selectedDate)}</p>
              {selectedLog ? (
                <>
                  <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                    {selectedLog.moods?.map(id => { const m = MOODS.find(x => x.id === id); return m ? <span key={id} style={{ color: m.color, display: "inline-flex" }}><Icon name={m.icon} size={18} /></span> : null; })}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>
                    Интенсивность {selectedLog.intensity ?? "—"}/10 · день цикла {selectedLog.cycleDay ?? "—"}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectLog(selectedLog)}
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: T.text, color: T.bg, fontFamily: T.font, fontSize: 13, cursor: "pointer" }}
                  >
                    Открыть запись
                  </button>
                </>
              ) : (
                <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>За этот день записей нет</div>
              )}
            </div>
          </>
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
                          <span style={{ width: 20, display: "inline-flex", color: m.color }}><Icon name={m.icon} size={16} /></span>
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
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name={sc.icon} size={12} /> {sc.name}</span>
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
            <div style={S.card}>
              <p style={S.st}>Твои недавние приходы</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
                {presenceDays.map(d => (
                  <div key={d.key} style={{
                    aspectRatio: "1", borderRadius: 8,
                    background: d.hasLog ? T.accent : T.border,
                    opacity: d.hasLog ? 1 : 0.5,
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: T.muted, margin: "10px 0 0", lineHeight: 1.5 }}>
                Пустые дни — просто тише. Здесь нет счётчика пропусков — только то, что было.
              </p>
            </div>

            {insights.length === 0 ? (
              <div style={{ ...S.card, textAlign: "center", padding: 36 }}>
                <div style={{ marginBottom: 8, color: T.muted, display: "flex", justifyContent: "center" }}>
                  <Icon name="barChart" size={28} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 13, color: T.muted }}>Нужно больше записей — минимум 3-5 дней</div>
              </div>
            ) : insights.map((ins, i) => (
              <div key={i} style={{ ...S.card, display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${T.accent}` }}>
                <div style={{ flexShrink: 0, color: T.accent }}>
                    <Icon name={ins.icon || "sparkle"} size={24} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 13, color: T.purple, lineHeight: 1.6 }}>{ins.text}</div>
              </div>
            ))}
            {logs.length >= 5 && (
              <div style={{ ...S.card, background: wash(T.accent, 5) }}>
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
