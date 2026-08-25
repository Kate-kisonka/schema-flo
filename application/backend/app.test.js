import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "./app.js";

test("composed app serves health and protects mounted API routes", async (t) => {
  const queries = [];
  const query = async (sql) => {
    queries.push(sql);
    return { rowCount: 1, rows: [{ now: new Date().toISOString() }] };
  };
  const pool = {
    connect: async () => {
      throw new Error("protected smoke route must not reach the database");
    },
  };
  const companionService = {
    retentionDays: 30,
    requireConsent: (_req, _res, next) => next(),
  };
  const app = createApp({
    pool,
    query,
    jwtSecret: "app-smoke-secret",
    allowedOrigins: [],
    frontendUrl: "http://localhost:5173",
    companionService,
  });

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.equal(healthResponse.status, 200);
  assert.deepEqual(await healthResponse.json(), { status: "ok", db: "connected" });
  assert.deepEqual(queries, ["SELECT NOW()"]);

  const protectedResponse = await fetch(`${baseUrl}/api/state`);
  assert.equal(protectedResponse.status, 401);
  assert.deepEqual(await protectedResponse.json(), { error: "Unauthorized" });
  assert.deepEqual(queries, ["SELECT NOW()"]);
});
