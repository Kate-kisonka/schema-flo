const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Отправить сообщения в AI через backend-прокси.
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} context  — системный промпт с контекстом пользователя
 * @returns {Promise<string>} ответ ассистента
 */
export async function sendAIMessage(messages, context) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  return data.reply ?? "Что-то пошло не так.";
}
