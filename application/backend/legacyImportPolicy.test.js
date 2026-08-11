import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_IMPORT_SOURCE as BACKEND_LEGACY_IMPORT_SOURCE,
  getImportConflictPolicy,
} from "./legacyImportPolicy.js";

test("legacy policy never overwrites existing server records", () => {
  const policy = getImportConflictPolicy(BACKEND_LEGACY_IMPORT_SOURCE);
  assert.equal(policy.isLegacyMigration, true);
  for (const clause of [
    policy.diaryConflictClause,
    policy.cycleConflictClause,
    policy.practiceConflictClause,
  ]) {
    assert.match(clause, /DO NOTHING/);
    assert.doesNotMatch(clause, /DO UPDATE/);
  }
});

test("ordinary backup restore keeps its overwrite contract", () => {
  const policy = getImportConflictPolicy("backup-restore");
  assert.equal(policy.isLegacyMigration, false);
  for (const clause of [
    policy.diaryConflictClause,
    policy.cycleConflictClause,
    policy.practiceConflictClause,
  ]) {
    assert.match(clause, /DO UPDATE/);
  }
});
