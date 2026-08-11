import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { T, wash } from "../constants/theme.js";
import { Orb } from "./Companion.jsx";
import Icon from "./icons.jsx";
import { useCompanionChat, MAX_MESSAGE_LENGTH } from "../hooks/useCompanionChat.js";

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const secondaryButtonStyle = {
  padding: "7px 9px",
  borderRadius: T.radius.sm,
  border: `1px solid ${T.border}`,
  background: "none",
  cursor: "pointer",
  fontFamily: T.font,
  fontSize: 12,
  color: T.sub,
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

export default function CompanionChat({ onClose }) {
  const {
    messages,
    loading,
    sending,
    consentChanging,
    consentActive,
    retentionDays,
    error,
    grantConsent,
    revokeConsent,
    sendMessage,
    deleteHistory,
    exportHistory,
  } = useCompanionChat();
  const [draft, setDraft] = useState("");
  const listRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousActiveElement = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusableElements = () => Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR))
      .filter((element) => element.getClientRects().length > 0);

    const focusFrame = requestAnimationFrame(() => {
      const [firstFocusable] = getFocusableElements();
      (firstFocusable || dialog).focus();
    });

    const handleDialogKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstFocusable || !dialog.contains(activeElement))) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && (activeElement === lastFocusable || !dialog.contains(activeElement))) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown, true);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeyDown, true);
      document.body.style.overflow = previousBodyOverflow;
      if (previousActiveElement instanceof HTMLElement && previousActiveElement.isConnected) {
        previousActiveElement.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const remaining = MAX_MESSAGE_LENGTH - draft.length;
  const overLimit = remaining < 0;

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || overLimit || !consentActive) return;
    setDraft("");
    const sent = await sendMessage(text);
    if (!sent) setDraft(text);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleDeleteHistory = async () => {
    if (window.confirm("Удалить всю переписку с компаньоном? Это действие нельзя отменить.")) {
      await deleteHistory();
    }
  };

  const handleRevokeConsent = async () => {
    if (window.confirm("Отозвать согласие? Вся переписка будет удалена без возможности восстановления.")) {
      await revokeConsent();
    }
  };

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, background: T.overlay, zIndex: 110, display: "flex", alignItems: "flex-end" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Чат с компаньоном Свет"
        tabIndex={-1}
        style={{
          background: T.card,
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 430,
          margin: "0 auto",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          height: "78vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px", borderBottom: `1px solid ${T.border}` }}>
          <Orb size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.fontSerif, fontSize: 16 }}>Свет</div>
            <div style={{ fontSize: 11, color: T.muted }}>компаньон</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть чат"
            style={{ ...secondaryButtonStyle, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {consentActive && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 16px", borderBottom: `1px solid ${T.border}` }}>
            <button onClick={exportHistory} style={secondaryButtonStyle}>Скачать</button>
            <button onClick={handleDeleteHistory} disabled={messages.length === 0} style={{ ...secondaryButtonStyle, opacity: messages.length === 0 ? 0.5 : 1 }}>
              Удалить историю
            </button>
            <button onClick={handleRevokeConsent} disabled={consentChanging} style={secondaryButtonStyle}>
              Отозвать согласие
            </button>
          </div>
        )}

        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
          {loading ? (
            <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginTop: 20 }}>Загружаю настройки...</div>
          ) : !consentActive ? (
            <div style={{ maxWidth: 360, margin: "20px auto", color: T.text }}>
              <div style={{ fontFamily: T.fontSerif, fontSize: 18, marginBottom: 10 }}>Перед началом</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: T.sub, margin: "0 0 10px" }}>
                Сообщения сохраняются на сервере и передаются локальной AI-модели для ответа. Сообщения старше {retentionDays} дней удаляются плановой очисткой; удаление может занять до настроенного интервала очистки, но не более 24 часов.
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: T.sub, margin: "0 0 16px" }}>
                Свет не ставит диагнозов и не заменяет врача, психотерапевта или экстренную помощь. Согласие можно отозвать в любой момент — тогда вся переписка будет удалена.
              </p>
              <button
                onClick={grantConsent}
                disabled={consentChanging}
                style={{
                  width: "100%",
                  minHeight: 42,
                  border: "none",
                  borderRadius: T.radius.sm,
                  background: consentChanging ? wash(T.accent, 40) : T.accent,
                  color: T.onAccent,
                  fontFamily: T.font,
                  fontSize: 14,
                  cursor: consentChanging ? "default" : "pointer",
                }}
              >
                {consentChanging ? "Сохраняю..." : "Согласна и продолжить"}
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ fontSize: 13, color: T.muted, textAlign: "center", marginTop: 20, fontFamily: T.fontSerif, fontStyle: "italic" }}>
              Здесь пока тихо. Напиши, что у тебя на душе.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || `${message.createdAt}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: message.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  className={message.role === "user" ? undefined : "sf-glass sf-glass--soft"}
                  style={{
                    maxWidth: "78%",
                    background: message.role === "user" ? T.accent : undefined,
                    color: message.role === "user" ? T.onAccent : T.text,
                    borderRadius: T.radius.sm,
                    padding: "9px 12px",
                  }}
                >
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{message.content}</div>
                  <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{formatTime(message.createdAt)}</div>
                </div>
              </div>
            ))
          )}
          {sending && consentActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }} role="status" aria-label="Свет печатает">
              <Orb size={22} />
              <span style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>Свет пишет ответ...</span>
            </div>
          )}
        </div>

        {error && <div role="alert" style={{ padding: "0 16px 8px", fontSize: 12, color: T.red }}>{error}</div>}

        {consentActive && (
          <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderTop: `1px solid ${T.border}`, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать Свету..."
                rows={1}
                maxLength={MAX_MESSAGE_LENGTH}
                style={{
                  width: "100%",
                  resize: "none",
                  padding: "10px 12px",
                  borderRadius: T.radius.sm,
                  border: `1px solid ${overLimit ? T.red : T.border}`,
                  background: T.bg,
                  fontFamily: T.font,
                  fontSize: 14,
                  color: T.text,
                  boxSizing: "border-box",
                  lineHeight: 1.5,
                }}
              />
              {remaining <= 200 && (
                <div style={{ fontSize: 11, color: overLimit ? T.red : T.muted, marginTop: 4, textAlign: "right" }}>
                  {overLimit ? `Превышен лимит на ${-remaining} симв.` : `Осталось ${remaining} симв.`}
                </div>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !draft.trim() || overLimit}
              aria-label="Отправить сообщение"
              style={{
                padding: "0 16px",
                height: 40,
                borderRadius: T.radius.sm,
                border: "none",
                background: sending || !draft.trim() || overLimit ? wash(T.accent, 40) : T.accent,
                color: T.onAccent,
                cursor: sending || !draft.trim() || overLimit ? "default" : "pointer",
                fontFamily: T.font,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="arrowRight" size={17} />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
