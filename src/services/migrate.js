// Одноразовая миграция: перекидываем данные из localStorage в PostgreSQL
// Вызывается из App.jsx после подтверждения авторизации

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function loadFromLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export async function migrateFromLocalStorage(userId) {
  if (!userId) return;
  const migratedKey = `pg_migrated:${userId}`;

  // Уже мигрировали — выходим
  if (localStorage.getItem(migratedKey)) return;

  // Нет токена — не авторизованы, импорт невозможен
  const token = localStorage.getItem("auth_token");
  if (!token) {
    return;
  }

  // Собираем данные из localStorage (старый формат)
  const diary = loadFromLS("schema_logs", []);
  const periodHistory = loadFromLS("period_history", []);
  const silenceLogs = loadFromLS("silence_logs", []);

  // Если нечего мигрировать — помечаем и выходим
  if (!diary.length && !periodHistory.length && !silenceLogs.length) {
    localStorage.setItem(migratedKey, "1");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/import/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ diary, periodHistory, silenceLogs }),
    });

    if (res.ok) {
      const result = await res.json();
      console.log("[migrate] импортировано:", result.imported);
      localStorage.setItem(migratedKey, "1");
    } else {
      console.warn("[migrate] сервер вернул ошибку, попробуем при следующем запуске");
    }
  } catch (err) {
    // Сеть недоступна — не падаем, попробуем при следующем запуске
    console.warn("[migrate] не удалось импортировать данные:", err.message);
  }
}
