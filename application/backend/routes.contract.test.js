import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import { createAuthMiddleware } from "./middleware/auth.js";
import { createDiaryRouter } from "./routes/diary.js";
import { createImportRouter } from "./routes/import.js";
import { createTrackingRouter } from "./routes/tracking.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const FOREIGN_ENTRY_ID = "22222222-2222-4222-8222-222222222222";

function contractAuth(req, _res, next) {
  req.user = { id: USER_ID, email: "owner@example.com" };
  next();
}

async function startServer(t, app) {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

function createJsonApp(path, router) {
  const app = express();
  app.use(express.json());
  app.use(path, router);
  return app;
}

function sendJson(url, method, body) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("JWT middleware rejects an invalid token and exposes a valid token subject", async (t) => {
  const jwtSecret = "contract-test-secret";
  const app = express();
  app.get("/protected", createAuthMiddleware(jwtSecret), (req, res) => {
    res.json({ user: req.user });
  });
  const baseUrl = await startServer(t, app);

  const invalidResponse = await fetch(`${baseUrl}/protected`, {
    headers: { Authorization: "Bearer invalid-token" },
  });
  assert.equal(invalidResponse.status, 401);
  assert.deepEqual(await invalidResponse.json(), { error: "Invalid token" });

  const token = jwt.sign({ sub: USER_ID, email: "owner@example.com" }, jwtSecret);
  const validResponse = await fetch(`${baseUrl}/protected`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(validResponse.status, 200);
  assert.deepEqual(await validResponse.json(), {
    user: { id: USER_ID, email: "owner@example.com" },
  });
});

test("diary POST keeps the per-user upsert contract", async (t) => {
  const calls = [];
  const savedEntry = {
    id: FOREIGN_ENTRY_ID,
    entry_date: "2026-08-24",
    notes: "updated",
  };
  const query = async (sql, params) => {
    calls.push({ sql, params });
    return { rowCount: 1, rows: [savedEntry] };
  };
  const app = createJsonApp("/api/diary", createDiaryRouter({ auth: contractAuth, query }));
  const baseUrl = await startServer(t, app);

  const response = await sendJson(`${baseUrl}/api/diary`, "POST", {
    entryDate: "2026-08-24",
    moodIds: ["calm"],
    notes: "updated",
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), savedEntry);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /ON CONFLICT \(user_id, entry_date\) DO UPDATE/);
  assert.equal(calls[0].params[0], USER_ID);
  assert.equal(calls[0].params[1], "2026-08-24");
});

test("diary PATCH and DELETE scope mutations to the authenticated user and hide foreign rows", async (t) => {
  const calls = [];
  const query = async (sql, params) => {
    calls.push({ sql, params });
    return { rowCount: 0, rows: [] };
  };
  const app = createJsonApp("/api/diary", createDiaryRouter({ auth: contractAuth, query }));
  const baseUrl = await startServer(t, app);

  const patchResponse = await sendJson(
    `${baseUrl}/api/diary/${FOREIGN_ENTRY_ID}`,
    "PATCH",
    { notes: "must not cross users" }
  );
  assert.equal(patchResponse.status, 404);
  assert.deepEqual(await patchResponse.json(), { error: "Запись не найдена" });

  const deleteResponse = await fetch(`${baseUrl}/api/diary/${FOREIGN_ENTRY_ID}`, {
    method: "DELETE",
  });
  assert.equal(deleteResponse.status, 404);
  assert.deepEqual(await deleteResponse.json(), { error: "Запись не найдена" });

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(calls[0].params.slice(0, 2), [FOREIGN_ENTRY_ID, USER_ID]);
  assert.match(calls[1].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(calls[1].params, [FOREIGN_ENTRY_ID, USER_ID]);
});

test("state GET and PUT use only the authenticated user key", async (t) => {
  const calls = [];
  const storedState = {
    cycle_day: 5,
    period_start_date: "2026-08-20",
    period_active: true,
    silence_active: false,
    silence_start_date: null,
    silence_days: 14,
  };
  const query = async (sql, params) => {
    calls.push({ sql, params });
    return { rowCount: 1, rows: [storedState] };
  };
  const app = createJsonApp("/api", createTrackingRouter({ auth: contractAuth, query }));
  const baseUrl = await startServer(t, app);

  const getResponse = await fetch(`${baseUrl}/api/state`);
  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), storedState);

  const putResponse = await sendJson(`${baseUrl}/api/state`, "PUT", {
    cycleDay: 5,
    periodStartDate: "2026-08-20",
    periodActive: true,
    silenceActive: false,
    silenceDays: 14,
  });
  assert.equal(putResponse.status, 200);
  assert.deepEqual(await putResponse.json(), storedState);

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /FROM user_states WHERE user_id = \$1/);
  assert.deepEqual(calls[0].params, [USER_ID]);
  assert.match(calls[1].sql, /ON CONFLICT \(user_id\) DO UPDATE/);
  assert.equal(calls[1].params[0], USER_ID);
});

test("legacy import ownership is rejected before opening a transaction", async (t) => {
  let connectCalls = 0;
  const pool = {
    connect: async () => {
      connectCalls += 1;
      throw new Error("must not connect");
    },
  };
  const app = createJsonApp("/api/import", createImportRouter({ auth: contractAuth, pool }));
  const baseUrl = await startServer(t, app);

  const response = await sendJson(`${baseUrl}/api/import/local`, "POST", {
    source: "schema-flo-legacy-local-storage",
    confirmedOwnership: false,
    diary: [],
    periodHistory: [],
    silenceLogs: [],
  });

  assert.equal(response.status, 400);
  assert.equal(connectCalls, 0);
});

test("failed import rolls back, releases the client, and never commits", async (t) => {
  t.mock.method(console, "error", () => {});
  const calls = [];
  let released = false;
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      if (/INSERT INTO diary_entries/.test(sql)) throw new Error("forced insert failure");
      return { rowCount: 0, rows: [] };
    },
    release: () => {
      released = true;
    },
  };
  const pool = { connect: async () => client };
  const app = createJsonApp("/api/import", createImportRouter({ auth: contractAuth, pool }));
  const baseUrl = await startServer(t, app);

  const response = await sendJson(`${baseUrl}/api/import/local`, "POST", {
    diary: [{ date: "2026-08-24", notes: "rollback me" }],
    periodHistory: [],
    silenceLogs: [],
  });

  assert.equal(response.status, 500);
  assert.equal(calls[0].sql, "begin");
  assert.match(calls[1].sql, /INSERT INTO diary_entries/);
  assert.equal(calls[1].params[0], USER_ID);
  assert.equal(calls.at(-1).sql, "rollback");
  assert.equal(calls.some(({ sql }) => sql === "commit"), false);
  assert.equal(released, true);
});
