import pg from "pg";
import { buildDatabaseConfig, readConfigValue } from "./config.js";

const { Pool } = pg;

function shouldUseSsl(databaseConfig) {
  const databaseSsl = readConfigValue("DATABASE_SSL");
  if (databaseSsl === "true") return true;
  if (databaseSsl === "false") return false;
  return /neon\.tech|sslmode=require/i.test(
    databaseConfig.connectionString ?? databaseConfig.host ?? ""
  );
}

const databaseConfig = buildDatabaseConfig();

export const pool = new Pool({
  ...databaseConfig,
  ssl: shouldUseSsl(databaseConfig) ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  return pool.query(text, params);
}
