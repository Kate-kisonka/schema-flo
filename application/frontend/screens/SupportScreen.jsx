import React, { useState } from "react";
import { T } from "../constants/theme.js";
import { formatDate } from "../utils.js";
import Icon from "../components/icons.jsx";

const S = {
  content: { padding: "0 16px 100px" },
  card:    { background: T.card, borderRadius: 12, padding: "16px", marginBottom: 8, border: `1px solid ${T.border}` },
};

export default function SupportScreen({ ai }) {
  const {
    aiMessages, aiInput, setAiInput,
    aiLoading, showQuickStates,
    aiSessions, messagesEndRef,
    sendToAI, resetChat, loadSession,
    quickStates,
  } = ai;

  const [supportTab, setSupportTab] = useState("chat");

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Табы */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.card, position: "sticky", top: 0, zIndex: 5 }}>
        {[{ id: "chat", icon: "chat", label: "Чат" }, { id: "history", icon: "book", label: "Сессии" }].map(t => (
          <button key={t.id}
            style={{ flex: 1, padding: "10px 2px", border: "none", background: "none", fontSize: 12, color: supportTab === t.id ? T.text : T.muted, borderBottom: supportTab === t.id ? `2px solid ${T.text}` : "2px solid transparent", cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}
            onClick={() => setSupportTab(t.id)}>
            <Icon name={t.icon} size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* История сессий */}
      {supportTab === "history" && (
        <div style={S.content}>
          <div style={{ paddingTop: 14 }}>
            {aiSessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: 36, color: T.muted, fontStyle: "italic", fontSize: 13 }}>Пока нет сохранённых разговоров</div>
            ) : aiSessions.map(session => (
              <div key={session.id}
                style={{ ...S.card, cursor: "pointer", borderLeft: `3px solid ${T.accent}` }}
                onClick={() => { loadSession(session); setSupportTab("chat"); }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <div style={{ fontSize: 10, color: T.muted }}>{formatDate(session.date)} · {session.phase}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>День {session.cycleDay}</div>
                </div>
                <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{session.title}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 5 }}>{session.messages.length} сообщений</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Чат */}
      {supportTab === "chat" && (
        <div style={S.content}>
          {showQuickStates && aiMessages.length === 0 && (
            <div style={{ padding: "16px 0 0" }}>
              <div style={{ ...S.card, background: "#1A102808", borderColor: "#1A102820" }}>
                <p style={{ margin: "0 0 5px", fontSize: 14 }}>Как я могу помочь?</p>
                <p style={{ margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 }}>Я знаю твоё состояние сегодня — день цикла, настроение, активные схемы.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {quickStates.map(qs => (
                  <button key={qs.id} onClick={() => sendToAI(qs.prompt)}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 11, padding: "12px 10px", cursor: "pointer", fontFamily: T.font, textAlign: "center" }}>
                    <div style={{ marginBottom: 5, display: "flex", justifyContent: "center", color: T.sub }}>
                      <Icon name={qs.icon} size={22} strokeWidth={1.6} />
                    </div>
                    <div style={{ fontSize: 12, color: T.text }}>{qs.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <button onClick={() => ai.setShowQuickStates(false)} style={{ background: "none", border: "none", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: T.font, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  или написать самой <Icon name="arrowRight" size={12} />
                </button>
              </div>
            </div>
          )}

          <div>
            {aiMessages.length === 0 && !showQuickStates && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted }}>
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
                  <Icon name="sprout" size={28} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 13, fontStyle: "italic" }}>Напиши что сейчас происходит</div>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 9, paddingTop: i === 0 ? 16 : 0 }}>
                <div style={msg.role === "user"
                  ? { background: T.text, color: T.bg, padding: "8px 12px", borderRadius: "13px 13px 3px 13px", maxWidth: "80%", fontSize: 13, lineHeight: 1.5 }
                  : { background: T.card, color: T.text, padding: "8px 12px", borderRadius: "13px 13px 13px 3px", maxWidth: "82%", fontSize: 13, lineHeight: 1.6, border: `1px solid ${T.border}` }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div style={{ display: "flex", paddingTop: 8 }}>
                <div style={{ background: T.card, padding: "8px 12px", borderRadius: "13px 13px 13px 3px", fontSize: 13, color: T.muted, border: `1px solid ${T.border}` }}>печатает...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Инпут */}
      {supportTab === "chat" && (
        <div style={{ display: "flex", gap: 7, position: "fixed", bottom: 60, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, padding: "10px 15px", background: T.bg, borderTop: `1px solid ${T.border}`, boxSizing: "border-box" }}>
          {aiMessages.length > 0 && (
            <button onClick={resetChat} aria-label="Начать разговор заново" style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${T.border}`, background: "none", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.text }}>
              <Icon name="undo" size={15} />
            </button>
          )}
          <input
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendToAI()}
            placeholder="Напиши что чувствуешь..."
            style={{ flex: 1, padding: "8px 12px", borderRadius: 18, border: `1px solid ${T.border}`, background: T.card, fontFamily: T.font, fontSize: 13, color: T.text, outline: "none" }}
          />
          <button onClick={() => sendToAI()} aria-label="Отправить сообщение" style={{ width: 36, height: 36, borderRadius: "50%", background: T.text, color: T.bg, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="arrowUp" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
