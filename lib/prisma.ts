import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma 7 connects through a driver adapter instead of a schema-level `url`.
// PrismaPg manages its own pg connection pool. The pool connects lazily (on the
// first query), so constructing it at import time is safe even when
// DATABASE_URL is unset — e.g. during `next build`, which imports route modules
// to collect page data. A missing URL surfaces as a clear error on first query
// rather than crashing the build.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

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
