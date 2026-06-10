import { useSyncExternalStore } from "react";
import { isDesktop } from "@/app/lib/desktop";

// The desktop flag never changes within a session, so there is nothing to
// subscribe to — return a no-op unsubscribe.
const subscribe = (): (() => void) => () => {};

/**
 * Returns true when running inside the Tauri desktop shell.
 *
 * Uses useSyncExternalStore so the server snapshot (false) and the client
 * snapshot are reconciled by React without a hydration mismatch — desktop-only
 * UI stays hidden during SSR and appears after hydration on desktop.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isDesktop(),
    () => false,
  );
}
