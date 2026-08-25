import test from "node:test";
import assert from "node:assert/strict";
import { cleanupLegacyAISessions } from "./cleanupLegacyAISessions.js";

function createStorage(entries) {
  const values = new Map(entries);
  const removedKeys = [];
  return {
    removedKeys,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      removedKeys.push(key);
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("legacy AI cleanup removes only ai_sessions and runs once", () => {
  const originalStorage = globalThis.localStorage;
  const storage = createStorage([
    ["ai_sessions", "sensitive history"],
    ["auth_token", "keep-token"],
    ["sf-theme", "dark"],
  ]);
  globalThis.localStorage = storage;

  try {
    assert.equal(cleanupLegacyAISessions(), true);
    assert.equal(storage.getItem("ai_sessions"), null);
    assert.equal(storage.getItem("auth_token"), "keep-token");
    assert.equal(storage.getItem("sf-theme"), "dark");

    assert.equal(cleanupLegacyAISessions(), false);
    assert.deepEqual(storage.removedKeys, ["ai_sessions"]);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});
