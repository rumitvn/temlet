/**
 * Desktop capability bridge.
 *
 * The same React UI runs both as a web app and inside the Tauri desktop webview.
 * These helpers expose native desktop features (folder pickers, reveal-in-file-
 * manager, OS notifications) when running under Tauri, and degrade gracefully to
 * no-ops / nulls on the web. The Tauri plugin packages are imported dynamically
 * so they never enter the server/web bundle and never run during SSR.
 */

/** True when running inside the Tauri desktop shell. */
export function isDesktop(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Open a native folder picker. Returns the chosen absolute path, or null if the
 * user cancels or we're not running on desktop.
 */
export async function pickDirectory(
  options: { title?: string; defaultPath?: string } = {},
): Promise<string | null> {
  if (!isDesktop()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      directory: true,
      multiple: false,
      title: options.title,
      defaultPath: options.defaultPath,
    });
    return typeof selected === "string" ? selected : null;
  } catch {
    return null;
  }
}

/**
 * Reveal a file or folder in the OS file manager (Finder / Explorer),
 * highlighting the item. No-op on the web.
 */
export async function revealPath(path: string): Promise<void> {
  if (!isDesktop() || !path) return;
  try {
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(path);
  } catch {
    // ignore — the path may not exist yet or the platform refused
  }
}

/** Open a file/folder/URL with its default OS handler. No-op on the web. */
export async function openPath(path: string): Promise<void> {
  if (!isDesktop() || !path) return;
  try {
    const { openPath: open } = await import("@tauri-apps/plugin-opener");
    await open(path);
  } catch {
    // ignore
  }
}

/**
 * Send a native OS notification, requesting permission on first use. No-op on
 * the web (callers should keep their existing in-app feedback as the primary UX).
 */
export async function notify(title: string, body?: string): Promise<void> {
  if (!isDesktop()) return;
  try {
    const mod = await import("@tauri-apps/plugin-notification");
    let granted = await mod.isPermissionGranted();
    if (!granted) {
      granted = (await mod.requestPermission()) === "granted";
    }
    if (granted) {
      mod.sendNotification(body ? { title, body } : { title });
    }
  } catch {
    // ignore — notifications are best-effort
  }
}
