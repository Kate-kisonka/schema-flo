import React from "react";
import { T } from "../constants/theme.js";
import { SCHEMAS, MOODS, DISCHARGE_TYPES, LIBIDO, PHYSICAL_SYMPTOMS, EXERCISES } from "../data.js";
import { getPhase, formatDate, getDayOfWeek } from "../utils.js";

const S = {
  card: { background: T.card, borderRadius: 12, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}` },
  st:   { fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: T.muted, marginBottom: 10, marginTop: 0, fontWeight: "500" },
};

const ALL_EXERCISES = [...EXERCISES.crisis, ...EXERCISES.schema, ...EXERCISES.cbt];

export default function LogDetailScreen({ log, onBack }) {
  const lp = getPhase(log.cycleDay || 1);

  return (
    <div style={{ padding: "0 15px", paddingBottom: 80 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", fontFamily: T.font, fontSize: 13, padding: "16px 0 10px" }}>← История</button>

      <div style={{ ...S.card, background: lp.color + "15", borderColor: lp.color + "44" }}>
        <div style={{ fontSize: 16, marginBottom: 3 }}>{getDayOfWeek(log.date)}, {formatDate(log.date)}</div>
        <div style={{ fontSize: 12, color: lp.color }}>День цикла {log.cycleDay} · {log.phase}</div>
      </div>

      <div style={{ ...S.card, borderLeft: `3px solid ${lp.color}` }}>
        <p style={S.st}>Медицинский контекст фазы</p>
        <p style={{ fontSize: 12, color: T.purple, lineHeight: 1.7, margin: 0 }}>{lp.gynComment}</p>
      </div>

      {log.moods?.length > 0 && (
        <div style={S.card}>
          <p style={S.st}>Эмоции</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {log.moods.map(id => {
              const m = MOODS.find(x => x.id === id);
              return m ? (
                <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 14, background: m.color + "22", border: `1px solid ${m.color}`, fontSize: 12 }}>
                  {m.emoji} {m.label}
                </span>
              ) : null;
            })}
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>Интенсивность: <b>{log.intensity}/10</b></div>
        </div>
      )}

      {log.schemas?.length > 0 && (
        <div style={S.card}>
          <p style={S.st}>Активные схемы</p>
          {log.schemas.map(id => {
            const sc = SCHEMAS.find(s => s.id === id);
            return sc ? (
              <div key={id} style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 7 }}>
                <span style={{ fontSize: 14, marginTop: 1 }}>{sc.emoji}</span>
                <div>
                  <div style={{ fontSize: 12 }}>{sc.name}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{sc.desc}</div>
                </div>
              </div>
            ) : null;
          })}
        </div>
      )}

      {(log.symptoms?.length > 0 || log.discharge || log.libido) && (
        <div style={S.card}>
          <p style={S.st}>Тело</p>
          {log.discharge && <div style={{ fontSize: 12, marginBottom: 5 }}>Выделения: {DISCHARGE_TYPES.find(d => d.id === log.discharge)?.emoji} {DISCHARGE_TYPES.find(d => d.id === log.discharge)?.label}</div>}
          {log.libido    && <div style={{ fontSize: 12, marginBottom: 5 }}>Либидо: {LIBIDO.find(l => l.id === log.libido)?.emoji} {LIBIDO.find(l => l.id === log.libido)?.label}</div>}
          {log.symptoms?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {log.symptoms.map(id => {
                const s = PHYSICAL_SYMPTOMS.find(x => x.id === id);
                return s ? <span key={id} style={{ fontSize: 12 }}>{s.emoji} {s.label}</span> : null;
              })}
            </div>
          )}
        </div>
      )}

      {log.exercises?.length > 0 && (
        <div style={S.card}>
          <p style={S.st}>Практики дня</p>
          {log.exercises.map(id => {
            const ex = ALL_EXERCISES.find(e => e.id === id);
            return ex ? <div key={id} style={{ fontSize: 12, marginBottom: 4 }}>{ex.icon} {ex.name}</div> : null;
          })}
        </div>
      )}

      {log.notes && (
        <div style={S.card}>
          <p style={S.st}>Заметки</p>
          <p style={{ fontSize: 13, color: T.purple, lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>{log.notes}</p>
        </div>
      )}
    </div>
  );
}
