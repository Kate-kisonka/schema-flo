import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildDatabaseConfig, readConfigValue } from "./config.js";

function withSecretFile(contents, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "schema-flo-config-"));
  const secretPath = path.join(directory, "secret");
  fs.writeFileSync(secretPath, contents);
  try {
    return callback(secretPath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("NAME_FILE takes priority over NAME", () => {
  withSecretFile("from-file\n", (secretPath) => {
    const value = readConfigValue("JWT_SECRET", {
      env: { JWT_SECRET: "from-env", JWT_SECRET_FILE: secretPath },
    });
    assert.equal(value, "from-file");
  });
});

test("falls back to NAME when NAME_FILE is not set", () => {
  assert.equal(
    readConfigValue("JWT_SECRET", { env: { JWT_SECRET: "from-env" } }),
    "from-env"
  );
});

test("required configuration error names variables without exposing a value", () => {
  assert.throws(
    () => readConfigValue("JWT_SECRET", { env: {}, required: true }),
    (error) => {
      assert.match(error.message, /JWT_SECRET is required/);
      assert.match(error.message, /JWT_SECRET_FILE/);
      assert.doesNotMatch(error.message, /undefined|null/);
      return true;
    }
  );
});

test("removes one final LF or CRLF and preserves other whitespace", () => {
  withSecretFile("  first value  \n", (lfPath) => {
    assert.equal(
      readConfigValue("SECRET", { env: { SECRET_FILE: lfPath } }),
      "  first value  "
    );
  });

  withSecretFile("\tsecond value \r\n", (crlfPath) => {
    assert.equal(
      readConfigValue("SECRET", { env: { SECRET_FILE: crlfPath } }),
      "\tsecond value "
    );
  });

  withSecretFile("value\n\n", (twoLinesPath) => {
    assert.equal(
      readConfigValue("SECRET", { env: { SECRET_FILE: twoLinesPath } }),
      "value\n"
    );
  });
});

test("builds pg config from DB values and retains DATABASE_URL fallback", () => {
  assert.deepEqual(
    buildDatabaseConfig({
      env: {
        DB_HOST: "2001:db8::1",
        DB_PORT: "5433",
        DB_USER: "schema user",
        DB_NAME: "schema/flo",
        DB_PASSWORD: "p@ss word",
      },
    }),
    {
      host: "2001:db8::1",
      port: 5433,
      user: "schema user",
      database: "schema/flo",
      password: "p@ss word",
    }
  );

  assert.deepEqual(
    buildDatabaseConfig({ env: { DATABASE_URL: "postgresql://legacy/db" } }),
    { connectionString: "postgresql://legacy/db" }
  );
});

test("any partial DB configuration selects component mode and fails clearly", () => {
  for (const partialConfig of [
    { DB_PORT: "5433" },
    { DB_PORT_FILE: "/run/secrets/db_port" },
  ]) {
    assert.throws(
      () =>
        buildDatabaseConfig({
          env: { DATABASE_URL: "postgresql://legacy/db", ...partialConfig },
        }),
      /DB_HOST is required/
    );
  }
});
