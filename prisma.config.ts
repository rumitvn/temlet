import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 moved the Migrate/introspection connection URL out of
 * `schema.prisma` and into this config file. The application runtime
 * connects via a better-sqlite3 driver adapter (see `lib/prisma.ts`); this
 * datasource block is only used by Prisma CLI commands (migrate, db pull,
 * studio) and expects a SQLite `file:` URL, e.g. `file:./prisma/temlet.db`.
 *
 * The datasource is attached only when `DATABASE_URL` is present. This keeps
 * `prisma generate` (which needs no DB) working in environments where the
 * variable is unset. Migrate/introspection commands require a real URL and
 * will have it set. Using `process.env` instead of Prisma's `env()` helper
 * avoids its eager throw on a missing var.
 *
 * Prisma 7 no longer auto-loads `.env`, so populate the shell env (or use
 * `dotenv -e .env -- prisma ...`) when running migrations locally.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
