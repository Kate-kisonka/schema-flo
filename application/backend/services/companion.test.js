import test from "node:test";
import assert from "node:assert/strict";
import { createCompanionService } from "./companion.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function createService(client) {
  return createCompanionService({
    pool: { connect: async () => client },
    query: async () => ({ rows: [] }),
    ollamaUrl: "http://ollama.test",
    ollamaModel: "test-model",
    retentionDays: 30,
    numPredict: 100,
    maxReplyLength: 1000,
  });
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

test("saveExchange rolls back and reports an optimistic conflict without inserting messages", async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, params) {
      calls.push({ sql: sql.trim(), params });
      if (/^UPDATE companion_chat_consents/.test(sql.trim())) {
        return { rowCount: 0, rows: [] };
      }
      if (/^SELECT revoked_at/.test(sql.trim())) {
        return { rowCount: 1, rows: [{ revoked_at: null }] };
      }
      return { rowCount: 0, rows: [] };
    },
    release() {
      released = true;
    },
  };
  const service = createService(client);

  await assert.rejects(
    service.saveExchange(USER_ID, 7, "Сообщение", "Ответ"),
    (error) => error.code === "COMPANION_CHAT_CONFLICT"
  );
  assert.deepEqual(calls.map(({ sql }) => normalizeSql(sql)), [
    "begin",
    "UPDATE companion_chat_consents SET chat_version = chat_version + 1 WHERE user_id = $1 AND revoked_at IS NULL AND chat_version = $2 RETURNING chat_version",
    "SELECT revoked_at FROM companion_chat_consents WHERE user_id = $1",
    "rollback",
  ]);
  assert.deepEqual(calls[1].params, [USER_ID, 7]);
  assert.deepEqual(calls[2].params, [USER_ID]);
  assert.equal(calls.some(({ sql }) => /INSERT INTO companion_messages/.test(sql)), false);
  assert.equal(released, true);
});

test("saveExchange rolls back both version change and messages when insertion fails", async () => {
  const calls = [];
  let released = false;
  const insertError = new Error("insert failed");
  const client = {
    async query(sql, params) {
      calls.push({ sql: sql.trim(), params });
      if (/^UPDATE companion_chat_consents/.test(sql.trim())) {
        return { rowCount: 1, rows: [{ chat_version: "8" }] };
      }
      if (/^WITH inserted AS/.test(sql.trim())) throw insertError;
      return { rowCount: 0, rows: [] };
    },
    release() {
      released = true;
    },
  };
  const service = createService(client);

  await assert.rejects(
    service.saveExchange(USER_ID, 7, "Сообщение", "Ответ"),
    insertError
  );
  assert.equal(calls.at(-1).sql, "rollback");
  assert.deepEqual(calls[1].params, [USER_ID, 7]);
  assert.deepEqual(calls[2].params, [USER_ID, "Сообщение", "Ответ"]);
  assert.equal(released, true);
});
