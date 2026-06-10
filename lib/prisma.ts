import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 connects through a driver adapter instead of a schema-level `url`.
// The desktop build uses a local SQLite file rather than a remote Postgres
// server, so the app is fully self-contained.
//
// The file location comes from DATABASE_URL when set (the Tauri shell injects an
// absolute `file:` path under the app-data dir in the packaged app). When unset
// — e.g. `next dev` or `next build` collecting route data — it falls back to a
// project-local file. SQLite opens the file lazily on first query, so
// constructing the adapter at import time is safe even before the DB exists.
const databaseUrl = process.env.DATABASE_URL ?? 'file:./prisma/temlet.db';

const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error'],
    errorFormat: 'pretty',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
