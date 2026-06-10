import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { logger } from "@/app/lib/logger";

/**
 * Apply any pending Prisma migrations to the live SQLite database on startup.
 *
 * Context: the packaged desktop app seeds an empty DB into the app-data dir on
 * first run. When a later app version ships a new migration, the user's existing
 * DB must be upgraded in place — the seed copy only ever runs once. The Prisma
 * CLI is not bundled, so this is a minimal `migrate deploy` equivalent that runs
 * directly against the file via better-sqlite3.
 *
 * It is compatible with Prisma's `_prisma_migrations` ledger: migrations already
 * recorded as applied (e.g. the seeded baseline) are skipped, and newly applied
 * ones are recorded the same way Prisma would, so the DB stays consistent.
 *
 * Only invoked by the desktop shell (gated on TEMLET_APPLY_MIGRATIONS); the web /
 * dev workflow continues to use `prisma migrate dev`.
 */

interface MigrationFile {
  readonly name: string;
  readonly sql: string;
  readonly checksum: string;
}

const PRISMA_MIGRATIONS_DDL = `
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "checksum" TEXT NOT NULL,
  "finished_at" DATETIME,
  "migration_name" TEXT NOT NULL,
  "logs" TEXT,
  "rolled_back_at" DATETIME,
  "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
  "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
);
`;

/** Resolve the on-disk database path from a `file:`-style DATABASE_URL. */
function resolveDatabasePath(databaseUrl: string): string {
  const withoutScheme = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.resolve(process.cwd(), withoutScheme);
}

/** Read migration folders (sorted) from the bundled `prisma/migrations` dir. */
function loadMigrations(migrationsDir: string): MigrationFile[] {
  return readdirSync(migrationsDir)
    .filter((entry) => statSync(path.join(migrationsDir, entry)).isDirectory())
    .sort()
    .map((name) => {
      const sql = readFileSync(
        path.join(migrationsDir, name, "migration.sql"),
        "utf8",
      );
      const checksum = createHash("sha256").update(sql).digest("hex");
      return { name, sql, checksum };
    });
}

export async function applyMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error("[migrate] DATABASE_URL is not set; skipping migrations");
    return;
  }

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  if (!existsSync(migrationsDir)) {
    logger.warn(`[migrate] no migrations dir at ${migrationsDir}; skipping`);
    return;
  }

  const dbPath = resolveDatabasePath(databaseUrl);
  const db = new Database(dbPath);

  try {
    db.pragma("foreign_keys = ON");
    db.exec(PRISMA_MIGRATIONS_DDL);

    const appliedRows = db
      .prepare(
        `SELECT migration_name FROM "_prisma_migrations"
         WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      )
      .all() as { migration_name: string }[];
    const applied = new Set(appliedRows.map((row) => row.migration_name));

    const pending = loadMigrations(migrationsDir).filter(
      (migration) => !applied.has(migration.name),
    );

    if (pending.length === 0) {
      logger.info("[migrate] database is up to date");
      return;
    }

    const record = db.prepare(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
       VALUES (?, ?, ?, current_timestamp, current_timestamp, 1)`,
    );

    for (const migration of pending) {
      const apply = db.transaction(() => {
        db.exec(migration.sql);
        record.run(randomId(), migration.checksum, migration.name);
      });
      apply();
      logger.warn(`[migrate] applied ${migration.name}`);
    }

    logger.warn(`[migrate] applied ${pending.length} migration(s)`);
  } catch (error) {
    logger.error("[migrate] failed to apply migrations:", error);
    throw error;
  } finally {
    db.close();
  }
}

function randomId(): string {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : createHash("sha256")
        .update(`${process.pid}-${process.hrtime.bigint()}`)
        .digest("hex")
        .slice(0, 32);
}
