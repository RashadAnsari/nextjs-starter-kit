/**
 * Applies db/migrations/*.sql in filename order, skipping files already
 * recorded in schema_migrations. Each file runs in its own transaction, so a
 * failing migration rolls back cleanly and leaves the ones before it applied.
 *
 * Usage: bun scripts/migrate.ts (or `make migrate`)
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "@/lib/db";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

async function migrate() {
  await pool.query(`
    create table if not exists schema_migrations (
      filename   text        primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await pool.query<{ filename: string }>("select filename from schema_migrations");
  const applied = new Set(rows.map((row) => row.filename));

  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const file of pending) {
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(
        `Migration ${file} failed: ${error instanceof Error ? error.message : error}`
      );
    } finally {
      client.release();
    }
  }
}

try {
  await migrate();
} finally {
  await pool.end();
}
