import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const backendDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(backendDir, ".env"), quiet: true });

function removeTrailingLineEnding(value) {
  return value.replace(/\r?\n$/, "");
}

export function hasConfigValue(name, env = process.env) {
  return Boolean(env[`${name}_FILE`] || env[name] !== undefined);
}

export function readConfigValue(
  name,
  { env = process.env, required = false, readFileSync = fs.readFileSync } = {}
) {
  const fileName = `${name}_FILE`;
  let value;

  if (env[fileName]) {
    try {
      value = removeTrailingLineEnding(readFileSync(env[fileName], "utf8"));
    } catch {
      throw new Error(`[config] Cannot read ${name} from ${fileName}`);
    }
  } else {
    value = env[name];
  }

  if (required && (value === undefined || value === "")) {
    throw new Error(`[config] ${name} is required (set ${name} or ${fileName})`);
  }

  return value;
}

const DATABASE_PART_NAMES = ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME", "DB_PASSWORD"];

export function buildDatabaseConfig({ env = process.env, readFileSync = fs.readFileSync } = {}) {
  const read = (name, options = {}) =>
    readConfigValue(name, { env, readFileSync, ...options });
  const usesDatabaseParts = DATABASE_PART_NAMES.some((name) => hasConfigValue(name, env));

  if (!usesDatabaseParts) {
    return { connectionString: read("DATABASE_URL", { required: true }) };
  }

  const host = read("DB_HOST", { required: true });
  const port = read("DB_PORT") ?? "5432";
  const user = read("DB_USER", { required: true });
  const database = read("DB_NAME", { required: true });
  const password = read("DB_PASSWORD", { required: true });

  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("[config] DB_PORT must be an integer between 1 and 65535");
  }

  return { host, port: Number(port), user, database, password };
}
