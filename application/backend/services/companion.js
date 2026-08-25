export const COMPANION_GLOBAL_CLEANUP_SQL = `
  WITH cleanup_users AS MATERIALIZED (
    SELECT DISTINCT message.user_id
    FROM companion_messages AS message
    LEFT JOIN companion_chat_consents AS consent ON consent.user_id = message.user_id
    WHERE consent.user_id IS NULL
       OR consent.revoked_at IS NOT NULL
       OR message.created_at < now() - (
         LEAST(consent.retention_days, $1::integer) * interval '1 day'
       )
  ),
  bumped AS (
    UPDATE companion_chat_consents AS consent
    SET chat_version = consent.chat_version + 1
    FROM cleanup_users
    WHERE consent.user_id = cleanup_users.user_id
    RETURNING consent.user_id
  ),
  deleted AS (
    DELETE FROM companion_messages AS message
    USING cleanup_users
    WHERE message.user_id = cleanup_users.user_id
      AND (
        NOT EXISTS (
          SELECT 1 FROM companion_chat_consents AS consent
          WHERE consent.user_id = message.user_id
        )
        OR EXISTS (
          SELECT 1 FROM bumped WHERE bumped.user_id = message.user_id
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM companion_chat_consents AS active_consent
        WHERE active_consent.user_id = message.user_id
          AND active_consent.revoked_at IS NULL
          AND message.created_at >= now() - (
            LEAST(active_consent.retention_days, $1::integer) * interval '1 day'
          )
      )
    RETURNING message.user_id
  )
  SELECT
    (SELECT count(*)::integer FROM deleted) AS deleted_messages,
    (SELECT count(*)::integer FROM bumped) AS affected_users
`;

const COMPANION_SYSTEM_PROMPT =
  "Ты — Свет, тёплый и бережный компаньон в приложении для отслеживания психического состояния и цикла. " +
  "Слушай внимательно, поддерживай без осуждения и отвечай кратко. " +
  "Не ставь диагнозы, не давай медицинских советов и не заменяй врача или психотерапевта.";

function toClientMessage(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function createCompanionService({
  pool,
  query,
  ollamaUrl,
  ollamaModel,
  retentionDays,
  numPredict,
  maxReplyLength,
  timeoutMs = 30000,
  historyContextLimit = 19,
}) {
  async function callOllama(messages) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [{ role: "system", content: COMPANION_SYSTEM_PROMPT }, ...messages],
          options: { num_predict: numPredict },
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Ollama responded with status ${response.status}`);
      }
      const data = await response.json();
      const content = data?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        throw new Error("Ollama returned empty content");
      }
      return content.trim().slice(0, maxReplyLength);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function getConsent(client, userId) {
    const result = await client.query(
      `SELECT consented_at, revoked_at, retention_days, chat_version
       FROM companion_chat_consents WHERE user_id = $1`,
      [userId]
    );
    const row = result.rows[0];
    if (!row || row.revoked_at) {
      return { active: false, retentionDays };
    }
    return {
      active: true,
      consentedAt: row.consented_at,
      retentionDays: Math.min(row.retention_days, retentionDays),
      chatVersion: Number(row.chat_version),
    };
  }

  async function requireConsent(req, res, next) {
    try {
      const consent = await getConsent(pool, req.user.id);
      if (!consent.active) {
        return res.status(403).json({
          code: "COMPANION_CONSENT_REQUIRED",
          error: "Для использования компаньона нужно активное согласие",
          retentionDays: consent.retentionDays,
        });
      }
      req.companionRetentionDays = consent.retentionDays;
      req.companionChatVersion = consent.chatVersion;
      next();
    } catch (err) {
      console.error("companion consent check error:", err.message);
      res.status(500).json({ error: "Не удалось проверить согласие" });
    }
  }

  async function runGlobalCleanup() {
    const result = await query(COMPANION_GLOBAL_CLEANUP_SQL, [retentionDays]);
    return result.rows[0] || { deleted_messages: 0, affected_users: 0 };
  }

  async function cleanupMessagesForUser(client, userId, userRetentionDays) {
    const deleted = await client.query(
      `DELETE FROM companion_messages
       WHERE user_id = $1
         AND created_at < now() - ($2::integer * interval '1 day')
       RETURNING id`,
      [userId, userRetentionDays]
    );
    if (deleted.rowCount > 0) {
      const version = await client.query(
        `UPDATE companion_chat_consents
         SET chat_version = chat_version + 1
         WHERE user_id = $1
         RETURNING chat_version`,
        [userId]
      );
      return Number(version.rows[0].chat_version);
    }
    return null;
  }

  async function cleanupActiveMessages(userId) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const consentResult = await client.query(
        `SELECT retention_days, chat_version
         FROM companion_chat_consents
         WHERE user_id = $1 AND revoked_at IS NULL
         FOR UPDATE`,
        [userId]
      );
      if (consentResult.rowCount === 0) {
        const error = new Error("Companion consent is required");
        error.code = "COMPANION_CONSENT_REQUIRED";
        throw error;
      }
      const consent = consentResult.rows[0];
      const userRetentionDays = Math.min(consent.retention_days, retentionDays);
      const cleanedVersion = await cleanupMessagesForUser(client, userId, userRetentionDays);
      await client.query("commit");
      return {
        retentionDays: userRetentionDays,
        chatVersion: cleanedVersion ?? Number(consent.chat_version),
      };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async function prepareGeneration(userId) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const consentResult = await client.query(
        `SELECT retention_days, chat_version
         FROM companion_chat_consents
         WHERE user_id = $1 AND revoked_at IS NULL
         FOR UPDATE`,
        [userId]
      );
      if (consentResult.rowCount === 0) {
        const error = new Error("Companion consent is required");
        error.code = "COMPANION_CONSENT_REQUIRED";
        throw error;
      }

      const consent = consentResult.rows[0];
      const userRetentionDays = Math.min(consent.retention_days, retentionDays);
      const cleanedVersion = await cleanupMessagesForUser(client, userId, userRetentionDays);
      const expectedVersion = cleanedVersion ?? Number(consent.chat_version);
      const historyResult = await client.query(
        `SELECT id, role, content, created_at FROM (
           SELECT id, role, content, created_at FROM companion_messages
           WHERE user_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT $2
         ) recent
         ORDER BY created_at ASC, id ASC`,
        [userId, historyContextLimit]
      );
      await client.query("commit");
      return { expectedVersion, history: historyResult.rows };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async function saveExchange(userId, expectedVersion, userMessage, companionReply) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const versionUpdate = await client.query(
        `UPDATE companion_chat_consents
         SET chat_version = chat_version + 1
         WHERE user_id = $1
           AND revoked_at IS NULL
           AND chat_version = $2
         RETURNING chat_version`,
        [userId, expectedVersion]
      );
      if (versionUpdate.rowCount === 0) {
        const current = await client.query(
          `SELECT revoked_at FROM companion_chat_consents WHERE user_id = $1`,
          [userId]
        );
        const error = new Error("Companion chat changed during generation");
        error.code = current.rowCount === 0 || current.rows[0].revoked_at
          ? "COMPANION_CONSENT_REQUIRED"
          : "COMPANION_CHAT_CONFLICT";
        throw error;
      }

      const result = await client.query(
        `WITH inserted AS (
           INSERT INTO companion_messages (user_id, role, content, created_at)
           VALUES
             ($1, 'user', $2, now()),
             ($1, 'companion', $3, now() + interval '1 microsecond')
           RETURNING id, role, content, created_at
         )
         SELECT id, role, content, created_at FROM inserted
         ORDER BY created_at ASC, id ASC`,
        [userId, userMessage, companionReply]
      );
      await client.query("commit");
      return {
        chatVersion: Number(versionUpdate.rows[0].chat_version),
        messages: result.rows.map(toClientMessage),
      };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    retentionDays,
    callOllama,
    cleanupActiveMessages,
    getConsent,
    prepareGeneration,
    requireConsent,
    runGlobalCleanup,
    saveExchange,
    toClientMessage,
  };
}

export function startCompanionCleanup(runGlobalCleanup, intervalHours) {
  let running = false;
  async function runScheduledCleanup() {
    if (running) return;
    running = true;
    try {
      const result = await runGlobalCleanup();
      if (result.deleted_messages > 0) {
        console.log(
          `companion retention cleanup: deleted=${result.deleted_messages} users=${result.affected_users}`
        );
      }
    } catch (err) {
      console.error("companion retention cleanup error:", err.message);
    } finally {
      running = false;
    }
  }

  runScheduledCleanup();
  const timer = setInterval(runScheduledCleanup, intervalHours * 60 * 60 * 1000);
  timer.unref();
  return timer;
}
