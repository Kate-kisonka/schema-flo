import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await ensureMigrationsTable(client);

    const files = (await fs.readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const filename of files) {
      const already = await client.query(
        "select 1 from schema_migrations where filename = $1",
        [filename]
      );
      if (already.rowCount > 0) continue;

      const sql = await fs.readFile(path.join(migrationsDir, filename), "utf8");
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [filename]);
      console.log(`[migrate] applied ${filename}`);
    }

    await client.query("commit");
    console.log("[migrate] done");
  } catch (err) {
    await client.query("rollback");
    console.error("[migrate] failed", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
