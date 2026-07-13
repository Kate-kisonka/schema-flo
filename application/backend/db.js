import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[db] DATABASE_URL is not set");
}

function shouldUseSsl(connectionString = "") {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;
  return /neon\.tech|sslmode=require/i.test(connectionString);
}

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  return pool.query(text, params);
}
