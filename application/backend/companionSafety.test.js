import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { isCompanionCrisisMessage, normalizeCompanionSafetyText } from "./companionSafety.js";

const POSITIVE_CASES = [
  "я хочу умереть",
  "лучше бы я умерла",
  "мне незачем жить",
  "хочу уйти из жизни",
  "хочу себя убить",
  "у меня есть план",
  "есть план, как покончить с собой",
  "хочу прыгнуть с крыши",
  "я уже порезала себя",
  "я причиню себе вред",
  "я собираюсь выпить все таблетки",
  "я уже выпила все таблетки",
  "я сейчас вскрою вены",
  "я не хочу просыпаться",
  "я лучше умру",
  "у меня суицидальные мысли",
  "i want to kill myself",
  "i wish i were dead",
  "i have no reason to live",
  "i have a plan",
  "i plan to jump off the roof",
  "i have already cut myself",
  "I already overdosed",
  "я сейчас вск\u200Bрою вены",
  "suicidal\u200B thoughts",
  "ｉ　ｗａｎｔ　ｔｏ　ｄｉｅ",
];

const NEGATIVE_CASES = [
  "я не хочу умереть",
  "я хочу умереть от смеха",
  "я не хочу жить в этом городе",
  "я хочу жить",
  "у меня есть план на выходные",
  "обсуждаем профилактику суицида",
  "книга рассказывает о самоубийстве героя",
  "он сказал, что хочет умереть",
  "i don't want to die",
  "suicide prevention resources",
  "the patient denied suicidal thoughts",
  "i have a plan for tomorrow",
];

test("normalizes compatibility characters and removes zero-width separators", () => {
  assert.equal(normalizeCompanionSafetyText("  Ｉ\u200B WANT\tTO DIE  "), "i want to die");
});

test("detects explicit Russian and English crisis formulations", () => {
  for (const value of POSITIVE_CASES) {
    assert.equal(isCompanionCrisisMessage(value), true, value);
  }
});

test("does not flag contextual, negated, or ordinary planning phrases", () => {
  for (const value of NEGATIVE_CASES) {
    assert.equal(isCompanionCrisisMessage(value), false, value);
  }
});

test("global retention query removes unsafe rows and invalidates affected generations", async () => {
  const serverSource = await fs.readFile(new URL("./server.js", import.meta.url), "utf8");
  const serviceSource = await fs.readFile(
    new URL("./services/companion.js", import.meta.url),
    "utf8"
  );
  assert.match(
    serverSource,
    /readBoundedEnvInt\("COMPANION_CLEANUP_INTERVAL_HOURS", 1, 1, 24\)/
  );
  const sql = serviceSource.match(/COMPANION_GLOBAL_CLEANUP_SQL = `([\s\S]*?)`;/)?.[1];
  assert.ok(sql, "cleanup SQL must be declared");
  assert.match(sql, /DELETE FROM companion_messages/);
  assert.match(sql, /NOT EXISTS/);
  assert.match(sql, /consent\.revoked_at IS NULL/);
  assert.match(sql, /LEAST\(consent\.retention_days, \$1::integer\)/);
  assert.match(sql, /SET chat_version = consent\.chat_version \+ 1/);
  assert.match(sql, /SELECT count\(\*\)::integer FROM deleted/);
});

test("chat persistence is guarded by a single conditional version increment", async () => {
  const serviceSource = await fs.readFile(
    new URL("./services/companion.js", import.meta.url),
    "utf8"
  );
  const routeSource = await fs.readFile(
    new URL("./routes/companion.js", import.meta.url),
    "utf8"
  );
  const saveBlock = serviceSource.match(/async function saveExchange[\s\S]*?return \{/ )?.[0];
  assert.ok(saveBlock, "saveExchange must be declared");
  assert.match(saveBlock, /SET chat_version = chat_version \+ 1/);
  assert.match(saveBlock, /AND chat_version = \$2/);
  assert.match(saveBlock, /COMPANION_CHAT_CONFLICT/);
  assert.match(routeSource, /res\.status\(409\)/);
});

test("008 migration converges drifted companion tables to the required contract", async () => {
  const migration = await fs.readFile(
    new URL("./migrations/008_companion_chat_safety.sql", import.meta.url),
    "utf8"
  );

  for (const column of ["consented_at", "revoked_at", "retention_days", "chat_version"]) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`));
  }
  assert.match(migration, /alter column consented_at set not null/);
  assert.match(migration, /alter column retention_days set not null/);
  assert.match(migration, /alter column chat_version set not null/);
  assert.match(migration, /foreign key \(user_id\) references users\(id\) on delete cascade/);
  assert.match(migration, /delete from companion_chat_consents/);

  for (const column of ["id", "user_id", "role", "content", "created_at"]) {
    assert.match(migration, new RegExp(`add column if not exists ${column}`));
    assert.match(migration, new RegExp(`alter column ${column} set not null`));
  }
  assert.match(migration, /check \(role in \('user', 'companion'\)\)/);
  assert.match(migration, /delete from companion_messages/);
  assert.match(migration, /idx_companion_messages_id_unique/);
  assert.match(migration, /idx_companion_messages_user_created_id/);
});
