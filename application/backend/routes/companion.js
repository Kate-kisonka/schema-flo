import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { COMPANION_CRISIS_REPLY, isCompanionCrisisMessage } from "../companionSafety.js";
import { parseBoundedQueryInt } from "../lib/validation.js";

const ROLE_TO_OLLAMA = { user: "user", companion: "assistant" };

export function createCompanionRouter({
  auth,
  companionService,
  pool,
  query,
  maxMessageLength = 4000,
  chatLimit = 20,
  chatWindowMs = 5 * 60 * 1000,
  crisisPersistenceLimit = 20,
  crisisPersistenceWindowMs = 5 * 60 * 1000,
}) {
  const router = express.Router();
  const chatLimiter = rateLimit({
    windowMs: chatWindowMs,
    limit: chatLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
    message: { error: "Слишком много сообщений компаньону. Попробуйте позже." },
  });
  const crisisPersistenceLimiter = rateLimit({
    windowMs: crisisPersistenceWindowMs,
    limit: crisisPersistenceLimit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
    skip: (req) => !req.companionCrisis,
    handler: (req, _res, next) => {
      req.companionPersist = false;
      next();
    },
  });

  function validateMessage(req, res, next) {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      return res.status(400).json({ error: "message обязателен и должен быть непустой строкой" });
    }
    if (message.length > maxMessageLength) {
      return res.status(400).json({ error: "message слишком длинное" });
    }
    req.companionMessage = message;
    req.companionCrisis = isCompanionCrisisMessage(message);
    next();
  }

  function limitOllamaRequests(req, res, next) {
    if (req.companionCrisis) return next();
    return chatLimiter(req, res, next);
  }

  function limitCrisisPersistence(req, res, next) {
    req.companionPersist = true;
    return crisisPersistenceLimiter(req, res, next);
  }

  router.get("/consent", auth, async (req, res) => {
    try {
      const consent = await companionService.getConsent(pool, req.user.id);
      res.json(consent);
    } catch (err) {
      console.error("companion consent GET error:", err.message);
      res.status(500).json({ error: "Не удалось загрузить согласие" });
    }
  });

  router.post("/consent", auth, async (req, res) => {
    try {
      const result = await query(
        `INSERT INTO companion_chat_consents (user_id, consented_at, revoked_at, retention_days, chat_version)
         VALUES ($1, now(), NULL, $2, 0)
         ON CONFLICT (user_id) DO UPDATE SET
           consented_at = now(),
           revoked_at = NULL,
           retention_days = EXCLUDED.retention_days,
           chat_version = companion_chat_consents.chat_version + 1
         RETURNING consented_at, retention_days, chat_version`,
        [req.user.id, companionService.retentionDays]
      );
      res.json({
        active: true,
        consentedAt: result.rows[0].consented_at,
        retentionDays: result.rows[0].retention_days,
        chatVersion: Number(result.rows[0].chat_version),
      });
    } catch (err) {
      console.error("companion consent POST error:", err.message);
      res.status(500).json({ error: "Не удалось сохранить согласие" });
    }
  });

  router.delete("/consent", auth, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `UPDATE companion_chat_consents
         SET revoked_at = now(), chat_version = chat_version + 1
         WHERE user_id = $1`,
        [req.user.id]
      );
      const deleted = await client.query(
        "DELETE FROM companion_messages WHERE user_id = $1",
        [req.user.id]
      );
      await client.query("commit");
      res.json({ active: false, deletedMessages: deleted.rowCount });
    } catch (err) {
      await client.query("rollback");
      console.error("companion consent DELETE error:", err.message);
      res.status(500).json({ error: "Не удалось отозвать согласие" });
    } finally {
      client.release();
    }
  });

  router.post("/chat", auth, validateMessage, limitOllamaRequests, limitCrisisPersistence, async (req, res) => {
    const message = req.companionMessage;
    try {
      if (req.companionCrisis && !req.companionPersist) {
        const consent = await companionService.getConsent(pool, req.user.id);
        if (!consent.active) {
          const error = new Error("Companion consent is required");
          error.code = "COMPANION_CONSENT_REQUIRED";
          throw error;
        }
        const createdAt = new Date().toISOString();
        return res.json({
          reply: COMPANION_CRISIS_REPLY,
          createdAt,
          messages: [
            { role: "user", content: message, createdAt },
            { role: "companion", content: COMPANION_CRISIS_REPLY, createdAt },
          ],
          crisis: true,
          chatVersion: consent.chatVersion,
          persisted: false,
        });
      }

      const generation = await companionService.prepareGeneration(req.user.id);
      let reply;
      let crisis = false;
      if (req.companionCrisis) {
        crisis = true;
        reply = COMPANION_CRISIS_REPLY;
      } else {
        const ollamaMessages = [
          ...generation.history.map((row) => ({
            role: ROLE_TO_OLLAMA[row.role] || "user",
            content: row.content,
          })),
          { role: "user", content: message },
        ];
        try {
          reply = await companionService.callOllama(ollamaMessages);
        } catch (err) {
          console.error("companion ollama error:", err.message);
          return res.status(503).json({ error: "Компаньон временно недоступен, попробуйте позже" });
        }
      }

      const saved = await companionService.saveExchange(
        req.user.id,
        generation.expectedVersion,
        message,
        reply
      );
      const companionMessage = saved.messages.find((item) => item.role === "companion");
      res.json({
        reply: companionMessage.content,
        createdAt: companionMessage.createdAt,
        messages: saved.messages,
        crisis,
        chatVersion: saved.chatVersion,
      });
    } catch (err) {
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({
          code: err.code,
          error: "Согласие было отозвано",
          retentionDays: companionService.retentionDays,
        });
      }
      if (err.code === "COMPANION_CHAT_CONFLICT") {
        return res.status(409).json({
          code: err.code,
          error: "История чата изменилась. Обновите её и повторите сообщение.",
        });
      }
      console.error("companion chat error:", err.message);
      res.status(500).json({ error: "Не удалось обработать сообщение" });
    }
  });

  router.get("/chat/history", auth, companionService.requireConsent, async (req, res) => {
    const limit = parseBoundedQueryInt(req.query.limit, 100, 1, 500);
    const offset = parseBoundedQueryInt(req.query.offset, 0, 0, 100000);
    if (limit === null || offset === null) {
      return res.status(400).json({
        error: "limit и offset должны быть целыми числами в допустимом диапазоне",
      });
    }
    try {
      const state = await companionService.cleanupActiveMessages(req.user.id);
      const result = await query(
        `SELECT id, role, content, created_at FROM (
           SELECT id, role, content, created_at FROM companion_messages
           WHERE user_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT $2 OFFSET $3
         ) recent
         ORDER BY created_at ASC, id ASC`,
        [req.user.id, limit, offset]
      );
      res.json({
        messages: result.rows.map(companionService.toClientMessage),
        retentionDays: state.retentionDays,
        chatVersion: state.chatVersion,
      });
    } catch (err) {
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({ code: err.code, error: "Согласие не активно" });
      }
      console.error("companion history error:", err.message);
      res.status(500).json({ error: "Не удалось загрузить историю" });
    }
  });

  router.delete("/chat/history", auth, companionService.requireConsent, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const version = await client.query(
        `UPDATE companion_chat_consents
         SET chat_version = chat_version + 1
         WHERE user_id = $1 AND revoked_at IS NULL
         RETURNING chat_version`,
        [req.user.id]
      );
      if (version.rowCount === 0) {
        const error = new Error("Companion consent is required");
        error.code = "COMPANION_CONSENT_REQUIRED";
        throw error;
      }
      const result = await client.query(
        "DELETE FROM companion_messages WHERE user_id = $1",
        [req.user.id]
      );
      await client.query("commit");
      res.json({
        deletedMessages: result.rowCount,
        chatVersion: Number(version.rows[0].chat_version),
      });
    } catch (err) {
      await client.query("rollback");
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({ code: err.code, error: "Согласие не активно" });
      }
      console.error("companion history DELETE error:", err.message);
      res.status(500).json({ error: "Не удалось удалить историю" });
    } finally {
      client.release();
    }
  });

  router.get("/chat/export", auth, companionService.requireConsent, async (req, res) => {
    try {
      await companionService.cleanupActiveMessages(req.user.id);
      const result = await query(
        `SELECT id, role, content, created_at FROM companion_messages
         WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
        [req.user.id]
      );
      const lines = result.rows.map((row) => {
        const roleLabel = row.role === "companion" ? "Свет" : "Я";
        return `[${row.created_at.toISOString()}] ${roleLabel}: ${row.content}`;
      });
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Content-Disposition", 'attachment; filename="companion-chat.txt"');
      res.send(lines.join("\n\n"));
    } catch (err) {
      if (err.code === "COMPANION_CONSENT_REQUIRED") {
        return res.status(403).json({ code: err.code, error: "Согласие не активно" });
      }
      console.error("companion export error:", err.message);
      res.status(500).json({ error: "Не удалось экспортировать историю" });
    }
  });

  return router;
}
