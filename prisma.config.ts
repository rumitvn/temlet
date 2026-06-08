import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 moved the Migrate/introspection connection URL out of
 * `schema.prisma` and into this config file. The application runtime
 * connects via a pg driver adapter (see `lib/prisma.ts`); this datasource
 * block is only used by Prisma CLI commands (migrate, db pull, studio).
 *
 * `DATABASE_URL` is provided by the environment (`.env` in dev, CI secret in
 * CI). Prisma 7 no longer auto-loads `.env`, so populate the shell env (or use
 * `dotenv -e .env -- prisma ...`) when running migrations locally.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
});
