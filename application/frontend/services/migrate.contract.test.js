import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLegacyImportPayload,
  LEGACY_IMPORT_CONTRACT,
} from "./migrate.js";

test("legacy migration payload activates the backend no-overwrite contract", () => {
  const snapshot = {
    diary: [{ date: "2026-08-10" }],
    periodHistory: [{ date: "2026-08-01" }],
    silenceLogs: [{ date: "2026-08-09" }],
  };

  const payload = buildLegacyImportPayload(snapshot);

  assert.deepEqual(LEGACY_IMPORT_CONTRACT, {
    source: "schema-flo-legacy-local-storage",
    confirmedOwnership: true,
    overwriteExisting: false,
  });
  assert.equal(payload.source, "schema-flo-legacy-local-storage");
  assert.strictEqual(payload.confirmedOwnership, true);
  assert.strictEqual(payload.overwriteExisting, false);
  assert.strictEqual(payload.diary, snapshot.diary);
  assert.strictEqual(payload.periodHistory, snapshot.periodHistory);
  assert.strictEqual(payload.silenceLogs, snapshot.silenceLogs);
});
