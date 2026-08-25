import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createCompanionRouter } from "./companion.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function createAuth(userId = USER_ID) {
  return (req, _res, next) => {
    req.user = { id: userId, email: "test@example.com" };
    next();
  };
}

function createService(overrides = {}) {
  return {
    retentionDays: 30,
    getConsent: async () => ({
      active: true,
      consentedAt: "2026-08-24T10:00:00.000Z",
      retentionDays: 30,
      chatVersion: 1,
    }),
    requireConsent: (_req, _res, next) => next(),
    cleanupActiveMessages: async () => ({ retentionDays: 30, chatVersion: 1 }),
    prepareGeneration: async () => ({ expectedVersion: 1, history: [] }),
    callOllama: async () => "Обычный ответ",
    saveExchange: async (_userId, _version, message, reply) => ({
      chatVersion: 2,
      messages: [
        { id: "user", role: "user", content: message, createdAt: "2026-08-24T10:00:00.000Z" },
        { id: "reply", role: "companion", content: reply, createdAt: "2026-08-24T10:00:01.000Z" },
      ],
    }),
    toClientMessage: (row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }),
    ...overrides,
  };
}

async function startApp(t, options = {}) {
  const app = express();
  app.use(express.json());
  app.use("/api/companion", createCompanionRouter({
    auth: createAuth(),
    companionService: createService(),
    pool: { connect: async () => { throw new Error("Unexpected pool.connect"); } },
    query: async () => { throw new Error("Unexpected query"); },
    ...options,
  }));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  const address = server.address();
  return `http://127.0.0.1:${address.port}/api/companion`;
}

async function sendJson(url, method, body) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, " ").trim();
}

test("crisis replies bypass the Ollama limiter while repeated crisis storage is bounded", async (t) => {
  let ollamaCalls = 0;
  let prepareCalls = 0;
  let saveCalls = 0;
  let consentCalls = 0;
  const companionService = createService({
    getConsent: async (_client, userId) => {
      assert.equal(userId, USER_ID);
      consentCalls += 1;
      return { active: true, retentionDays: 30, chatVersion: 5 };
    },
    prepareGeneration: async (userId) => {
      assert.equal(userId, USER_ID);
      prepareCalls += 1;
      return { expectedVersion: prepareCalls, history: [] };
    },
    callOllama: async () => {
      ollamaCalls += 1;
      return "Обычный ответ";
    },
    saveExchange: async (userId, _version, message, reply) => {
      assert.equal(userId, USER_ID);
      saveCalls += 1;
      return {
        chatVersion: saveCalls,
        messages: [
          { id: `user-${saveCalls}`, role: "user", content: message, createdAt: "2026-08-24T10:00:00.000Z" },
          { id: `reply-${saveCalls}`, role: "companion", content: reply, createdAt: "2026-08-24T10:00:01.000Z" },
        ],
      };
    },
  });
  const baseUrl = await startApp(t, {
    companionService,
    chatLimit: 2,
    crisisPersistenceLimit: 2,
  });
  const send = (message) => sendJson(`${baseUrl}/chat`, "POST", { message });

  assert.equal((await send("обычное сообщение 1")).status, 200);
  assert.equal((await send("обычное сообщение 2")).status, 200);
  assert.equal((await send("обычное сообщение 3")).status, 429);

  const crisisBodies = [];
  for (let index = 0; index < 3; index += 1) {
    const response = await send("я хочу умереть");
    assert.equal(response.status, 200);
    crisisBodies.push(await response.json());
  }

  assert.equal(ollamaCalls, 2);
  assert.equal(prepareCalls, 4);
  assert.equal(saveCalls, 4);
  assert.equal(consentCalls, 1);
  assert.equal(crisisBodies[2].crisis, true);
  assert.equal(crisisBodies[2].persisted, false);
  assert.equal(crisisBodies[2].chatVersion, 5);
  assert.match(crisisBodies[2].reply, /112/);
});

test("consent read, grant, and revoke preserve the user-scoped contracts", async (t) => {
  const directQueries = [];
  const transactionQueries = [];
  let released = false;
  const client = {
    async query(sql, params) {
      transactionQueries.push({ sql: sql.trim(), params });
      if (/DELETE FROM companion_messages/.test(sql)) return { rowCount: 3, rows: [] };
      return { rowCount: 1, rows: [] };
    },
    release() {
      released = true;
    },
  };
  const pool = { connect: async () => client };
  const companionService = createService({
    getConsent: async (receivedPool, userId) => {
      assert.equal(receivedPool, pool);
      assert.equal(userId, USER_ID);
      return { active: false, retentionDays: 30 };
    },
  });
  const query = async (sql, params) => {
    directQueries.push({ sql, params });
    return {
      rows: [{
        consented_at: "2026-08-24T10:00:00.000Z",
        retention_days: 30,
        chat_version: "4",
      }],
    };
  };
  const baseUrl = await startApp(t, { companionService, pool, query });

  const readResponse = await fetch(`${baseUrl}/consent`);
  assert.equal(readResponse.status, 200);
  assert.deepEqual(await readResponse.json(), { active: false, retentionDays: 30 });

  const grantResponse = await sendJson(`${baseUrl}/consent`, "POST");
  assert.equal(grantResponse.status, 200);
  assert.deepEqual(await grantResponse.json(), {
    active: true,
    consentedAt: "2026-08-24T10:00:00.000Z",
    retentionDays: 30,
    chatVersion: 4,
  });
  assert.deepEqual(directQueries[0].params, [USER_ID, 30]);
  assert.match(directQueries[0].sql, /ON CONFLICT \(user_id\) DO UPDATE/);

  const revokeResponse = await sendJson(`${baseUrl}/consent`, "DELETE");
  assert.equal(revokeResponse.status, 200);
  assert.deepEqual(await revokeResponse.json(), { active: false, deletedMessages: 3 });
  assert.deepEqual(transactionQueries.map(({ sql }) => normalizeSql(sql)), [
    "begin",
    "UPDATE companion_chat_consents SET revoked_at = now(), chat_version = chat_version + 1 WHERE user_id = $1",
    "DELETE FROM companion_messages WHERE user_id = $1",
    "commit",
  ]);
  assert.deepEqual(transactionQueries[1].params, [USER_ID]);
  assert.deepEqual(transactionQueries[2].params, [USER_ID]);
  assert.equal(released, true);
});

test("history pagination, deletion, and export stay isolated to the authenticated user", async (t) => {
  const directQueries = [];
  const cleanupUsers = [];
  const transactionQueries = [];
  let released = false;
  const rows = [
    { id: "m1", role: "user", content: "Привет", created_at: new Date("2026-08-24T10:00:00.000Z") },
    { id: "m2", role: "companion", content: "Я рядом", created_at: new Date("2026-08-24T10:00:01.000Z") },
  ];
  const client = {
    async query(sql, params) {
      transactionQueries.push({ sql: sql.trim(), params });
      if (/UPDATE companion_chat_consents/.test(sql)) {
        return { rowCount: 1, rows: [{ chat_version: "8" }] };
      }
      if (/DELETE FROM companion_messages/.test(sql)) return { rowCount: 2, rows: [] };
      return { rowCount: 0, rows: [] };
    },
    release() {
      released = true;
    },
  };
  const companionService = createService({
    cleanupActiveMessages: async (userId) => {
      cleanupUsers.push(userId);
      return { retentionDays: 30, chatVersion: 7 };
    },
  });
  const query = async (sql, params) => {
    directQueries.push({ sql, params });
    return { rows };
  };
  const baseUrl = await startApp(t, {
    companionService,
    pool: { connect: async () => client },
    query,
  });

  const historyResponse = await fetch(`${baseUrl}/chat/history?limit=2&offset=3`);
  assert.equal(historyResponse.status, 200);
  assert.deepEqual(await historyResponse.json(), {
    messages: [
      { id: "m1", role: "user", content: "Привет", createdAt: "2026-08-24T10:00:00.000Z" },
      { id: "m2", role: "companion", content: "Я рядом", createdAt: "2026-08-24T10:00:01.000Z" },
    ],
    retentionDays: 30,
    chatVersion: 7,
  });
  assert.deepEqual(directQueries[0].params, [USER_ID, 2, 3]);

  const deleteResponse = await sendJson(`${baseUrl}/chat/history`, "DELETE");
  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), { deletedMessages: 2, chatVersion: 8 });
  assert.deepEqual(transactionQueries[1].params, [USER_ID]);
  assert.deepEqual(transactionQueries[2].params, [USER_ID]);
  assert.equal(released, true);

  const exportResponse = await fetch(`${baseUrl}/chat/export`);
  assert.equal(exportResponse.status, 200);
  assert.match(exportResponse.headers.get("content-type"), /^text\/plain/);
  assert.equal(
    exportResponse.headers.get("content-disposition"),
    'attachment; filename="companion-chat.txt"'
  );
  assert.equal(
    await exportResponse.text(),
    "[2026-08-24T10:00:00.000Z] Я: Привет\n\n[2026-08-24T10:00:01.000Z] Свет: Я рядом"
  );
  assert.deepEqual(directQueries[1].params, [USER_ID]);
  assert.deepEqual(cleanupUsers, [USER_ID, USER_ID]);
});

test("chat version conflicts are returned without changing the public normal-flow error", async (t) => {
  const conflict = new Error("conflict");
  conflict.code = "COMPANION_CHAT_CONFLICT";
  const companionService = createService({
    saveExchange: async () => { throw conflict; },
  });
  const baseUrl = await startApp(t, { companionService });

  const response = await sendJson(`${baseUrl}/chat`, "POST", { message: "Обычное сообщение" });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    code: "COMPANION_CHAT_CONFLICT",
    error: "История чата изменилась. Обновите её и повторите сообщение.",
  });
});
