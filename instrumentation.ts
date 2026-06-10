/**
 * Next.js instrumentation hook. `register()` runs once when the server process
 * boots (Node.js runtime only).
 *
 * In the packaged desktop app the Tauri shell sets `TEMLET_RUN_MONITOR=1`, which
 * starts the render-status monitor loop in-process — replacing the standalone
 * `scripts/monitor.js` poller. Plain `npm run dev` leaves the flag unset, so this
 * is a no-op there and the existing `npm run monitor` workflow is unchanged.
 */

const DEFAULT_MONITOR_INTERVAL_MS = 5000;

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Upgrade the user's existing SQLite DB in place before serving requests.
  // Desktop-only (the shell sets this); dev/web uses `prisma migrate dev`.
  if (process.env.TEMLET_APPLY_MIGRATIONS === "1") {
    const { applyMigrations } = await import("@/app/lib/migrate");
    await applyMigrations();
  }

  if (process.env.TEMLET_RUN_MONITOR !== "1") return;

  const port = process.env.PORT ?? "3001";
  const intervalMs = Number(
    process.env.TEMLET_MONITOR_INTERVAL_MS ?? DEFAULT_MONITOR_INTERVAL_MS,
  );
  const secret = process.env.CRON_SECRET;

  const url = `http://127.0.0.1:${port}/api/cron/monitor`;
  const headers: Record<string, string> = secret
    ? { Authorization: `Bearer ${secret}` }
    : {};

  const tick = async (): Promise<void> => {
    try {
      await fetch(url, { headers });
    } catch {
      // The HTTP listener may not be ready on the first tick, or the DB may be
      // momentarily unavailable — both are transient and safe to ignore.
    }
  };

  // Defer the first tick so the listener is accepting connections, then poll.
  setTimeout(tick, intervalMs);
  setInterval(tick, intervalMs);
}
