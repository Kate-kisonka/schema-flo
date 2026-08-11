import { useState, useEffect, useCallback } from "react";
import { dbCompanionChat } from "../services/db.js";

export const MAX_MESSAGE_LENGTH = 4000;

export function useCompanionChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [consentChanging, setConsentChanging] = useState(false);
  const [consentActive, setConsentActive] = useState(false);
  const [retentionDays, setRetentionDays] = useState(30);
  const [error, setError] = useState(null);

  const handleConsentRequired = useCallback((err) => {
    if (err.status !== 403) return false;
    setConsentActive(false);
    setMessages([]);
    setError("Согласие на хранение переписки не активно");
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const consent = await dbCompanionChat.getConsent();
        if (cancelled) return;
        setConsentActive(Boolean(consent.active));
        setRetentionDays(consent.retentionDays || 30);
        if (consent.active) {
          const history = await dbCompanionChat.getHistory();
          if (!cancelled) setMessages(history);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[companion] initial load failed:", err.message);
          setError("Не удалось загрузить настройки компаньона");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const grantConsent = useCallback(async () => {
    setConsentChanging(true);
    setError(null);
    let consent;
    try {
      consent = await dbCompanionChat.grantConsent();
      setConsentActive(true);
      setRetentionDays(consent.retentionDays || 30);
    } catch (err) {
      console.error("[companion] consent grant failed:", err.message);
      setError("Не удалось сохранить согласие");
      setConsentChanging(false);
      return false;
    }

    try {
      const history = await dbCompanionChat.getHistory();
      setMessages(history);
      return true;
    } catch (err) {
      console.error("[companion] history load after consent failed:", err.message);
      if (!handleConsentRequired(err)) {
        setError("Согласие сохранено, но история пока не загрузилась. Попробуйте открыть чат снова.");
      }
      return true;
    } finally {
      setConsentChanging(false);
    }
  }, [handleConsentRequired]);

  const revokeConsent = useCallback(async () => {
    setConsentChanging(true);
    setError(null);
    try {
      await dbCompanionChat.revokeConsent();
      setConsentActive(false);
      setMessages([]);
      return true;
    } catch (err) {
      console.error("[companion] consent revoke failed:", err.message);
      setError("Не удалось отозвать согласие");
      return false;
    } finally {
      setConsentChanging(false);
    }
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || sending || !consentActive) return false;
      if (trimmed.length > MAX_MESSAGE_LENGTH) {
        setError(`Сообщение слишком длинное — максимум ${MAX_MESSAGE_LENGTH} символов`);
        return false;
      }

      setError(null);
      const optimisticMessage = {
        id: `pending-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((previous) => [...previous, optimisticMessage]);
      setSending(true);

      try {
        const result = await dbCompanionChat.send(trimmed);
        const savedMessages = Array.isArray(result.messages)
          ? result.messages
          : [{ role: "companion", content: result.reply, createdAt: result.createdAt }];
        setMessages((previous) => [
          ...previous.filter((item) => item.id !== optimisticMessage.id),
          ...savedMessages,
        ]);
        return true;
      } catch (err) {
        setMessages((previous) => previous.filter((item) => item.id !== optimisticMessage.id));
        if (handleConsentRequired(err)) return false;
        if (err.status === 409) {
          try {
            const history = await dbCompanionChat.getHistory();
            setMessages(history);
            setError("История изменилась в другой вкладке. Проверьте её и отправьте сообщение ещё раз.");
          } catch (historyError) {
            console.error("[companion] conflict refresh failed:", historyError.message);
            setError("История изменилась в другой вкладке. Откройте чат снова и повторите сообщение.");
          }
        } else if (err.status === 503) {
          setError("Компаньон временно недоступен, попробуйте позже");
        } else if (err.status === 400) {
          setError("Сообщение не отправлено — проверьте текст");
        } else {
          setError("Не удалось отправить сообщение, проверьте соединение");
        }
        return false;
      } finally {
        setSending(false);
      }
    },
    [consentActive, handleConsentRequired, sending]
  );

  const deleteHistory = useCallback(async () => {
    setError(null);
    try {
      await dbCompanionChat.deleteHistory();
      setMessages([]);
      return true;
    } catch (err) {
      if (handleConsentRequired(err)) return false;
      console.error("[companion] history delete failed:", err.message);
      setError("Не удалось удалить историю");
      return false;
    }
  }, [handleConsentRequired]);

  const exportHistory = useCallback(async () => {
    try {
      const blob = await dbCompanionChat.exportBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "companion-chat.txt";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (handleConsentRequired(err)) return;
      console.error("[companion] export failed:", err.message);
      setError("Не удалось скачать историю");
    }
  }, [handleConsentRequired]);

  return {
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
  };
}
