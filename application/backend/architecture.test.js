import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("server remains a bootstrap and app owns route composition", async () => {
  const [serverSource, appSource] = await Promise.all([
    fs.readFile(new URL("./server.js", import.meta.url), "utf8"),
    fs.readFile(new URL("./app.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(serverSource, /app\.(get|post|put|patch|delete)\(/);
  assert.doesNotMatch(serverSource, /SELECT |INSERT INTO|UPDATE |DELETE FROM/);
  assert.match(appSource, /app\.use\("\/api\/auth", createAuthRouter/);
  assert.match(appSource, /app\.use\("\/api\/diary", createDiaryRouter/);
  assert.match(appSource, /app\.use\("\/api", createTrackingRouter/);
  assert.match(appSource, /app\.use\("\/api\/import", createImportRouter/);
  assert.match(appSource, /app\.use\("\/api\/companion", createCompanionRouter/);
});
