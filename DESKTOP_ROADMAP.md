# Temlet Desktop — Improvement Roadmap

Tracking doc for turning the working desktop POC into a real, distributable
desktop product (not just the web app in a window).

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done
**Tags:** 🔴 blocker · 🟠 high · 🟡 medium · ⚪ nice-to-have · ⏱ effort (S/M/L)

> Already done (POC): Tauri v2 shell, Postgres→SQLite, embedded standalone
> server sidecar (dev wraps `next dev`, release boots bundled server), in-process
> render monitor, seed DB on first run, secrets via `temlet.env`. See `DESKTOP.md`.

---

## Phase A — Make the packaged app self-contained 🔴
*Without this, `tauri:build` output only runs on a machine that already has Node +
ffmpeg + Chrome. This is the gap between "POC" and "ships to a user."*

- [x] 🔴 **Bundle a Node runtime** — `scripts/fetch-node-runtime.mjs` downloads the
  official Node binary (host platform/version by default; ABI-matched to the
  native modules) into `src-tauri/resources/runtime/`; `resolve_node()` in
  `lib.rs` now prefers it. Verified: server boots + better-sqlite3 loads under the
  bundled node with an empty environment. **Remaining:** drive
  `TARGET_PLATFORM/ARCH/NODE_VERSION` from CI to cross-stage Windows/macOS-x64
  binaries (see Phase H), and rebuild native modules per target.
- [ ] 🔴 ⏱M **Bundle ffmpeg** — `ffmpeg-static` ships a binary, but verify it's
  packaged and resolvable in `app/api/youtube-upload/route.ts`; set the path
  explicitly via `ffmpeg.setFfmpegPath(...)` from a bundled resource.
- [ ] 🔴 ⏱L **Handle Chromium for Puppeteer** (`app/services/crawlerService.ts`)
  - Options: bundle a browser + set `PUPPETEER_EXECUTABLE_PATH`; OR detect the
    user's installed Chrome; OR download-on-first-run with progress UI.
  - Largest single size cost (~150–300MB) — decide per product need.
- [ ] 🟠 ⏱M **Native-module ABI matrix** — `sharp`, `better-sqlite3` prebuilds must
  match the bundled Node ABI for each target (macOS arm64 + x64, Windows x64).
  Verify staged `node_modules` carry the right `.node` binaries per platform build.
- [ ] 🟡 ⏱S **Trim bundle** — prune unused traced `node_modules`; confirm the
  135MB server has no dev-only deps. Consider `outputFileTracingExcludes` additions.

---

## Phase B — Backend robustness for embedded use 🟠
*The server is now a child process, not a managed deployment. Treat it like one.*

- [ ] 🟠 ⏱S **Dynamic free port** — replace the fixed `SERVER_PORT = 38211` in
  `lib.rs` with an OS-assigned free port (bind `:0`, read it back), passed to the
  server and used for the navigate URL. Avoids clashes with other apps / Temlet web.
- [ ] 🟠 ⏱S **Pipe sidecar logs to a file** — capture server stdout/stderr to
  `<app-data>/logs/server.log` for debugging field issues (currently discarded).
- [ ] 🟠 ⏱M **Crash recovery** — detect sidecar exit; show an error state in the
  webview and offer restart, instead of a hung loading splash.
- [ ] 🟠 ⏱S **Readiness via `/api/health`** — upgrade the bare TCP poll in `lib.rs`
  to hit `/api/health` so we navigate only when the app (not just the port) is ready.
- [ ] 🟡 ⏱S **Orphan prevention** — ensure the child dies if the shell is SIGKILLed
  or panics (process group / job object), not only on clean `ExitRequested`.
- [x] 🔴 **DB migrations on app update** — `app/lib/migrate.ts` applies pending
  migrations to the live DB on startup (gated by `TEMLET_APPLY_MIGRATIONS`, set by
  the shell). It's a minimal `migrate deploy` equivalent over better-sqlite3,
  compatible with Prisma's `_prisma_migrations` ledger (the seeded baseline is
  recognized, not re-run). Migrations are staged into the bundle by
  `prepare-sidecar.mjs`. Verified: baseline DB → applies only the new migration →
  idempotent on second boot.

---

## Phase C — Desktop-native UX 🟠
*What makes it feel like an app instead of a tab.*

- [~] 🟠 **Native folder/file pickers** (`tauri-plugin-dialog`) — added
  `pickDirectory()` in `app/lib/desktop.ts` and wired an "Add Folder" picker into
  `OutputFolderManagerDialog` (native on desktop, typed-path prompt on web).
  **Remaining:** template `.aep` selection and `WORKING_DIRECTORY` picker (the
  latter pairs with the Settings screen, Phase D).
- [x] 🟠 **Reveal in file manager** (`tauri-plugin-opener`) — `revealPath()` +
  a desktop-only "Reveal" button on rendered cards (`RenderCard.tsx`) opens the
  output file in Finder/Explorer. Gated by `useIsDesktop()`.
- [~] 🟠 **Native notifications** (`tauri-plugin-notification`) — `notify()` helper
  added (requests permission, no-ops on web). **Remaining:** call it on
  render/upload completion (needs a client-side status-transition hook in the
  dashboard) — the high-value wiring.
- [ ] 🟡 ⏱S **System tray** (`tauri-plugin-tray` / core tray) — let the monitor run
  in the background with a tray icon + quick status; close-to-tray.
- [ ] 🟡 ⏱S **Window state persistence** (`tauri-plugin-window-state`) — remember
  size/position across launches.
- [ ] 🟡 ⏱S **Single instance** (`tauri-plugin-single-instance`) — prevent two
  copies fighting over the same SQLite DB / port.
- [ ] 🟡 ⏱M **Native app menu** — File/Edit/Window/Help with real actions
  (open working dir, settings, logs, about, check for updates).
- [ ] ⚪ ⏱M **Drag-and-drop** assets/templates into the app.

---

## Phase D — Configuration, secrets & onboarding 🟠
*Desktop users don't edit env files in app-config dirs by hand.*

- [x] 🟠 **In-app Settings screen** — `SettingsDialog` (desktop-only, in the
  dashboard header) edits API keys, Nexrender, YouTube/TikTok creds, and the
  working directory (native folder picker); "Save & Restart" applies changes.
- [x] 🔴 **Secure secret storage** — secrets live in the **OS keychain** via the
  `keyring` crate (`src-tauri/src/secrets.rs`), not plaintext. The shell loads
  them into the server env on startup; `temlet.env` remains a legacy fallback.
- [x] 🟠 **Per-install `CRON_SECRET`** — generated and persisted in the keychain
  on first use (`secrets::cron_secret`), replacing the hardcoded value.
- [~] 🟡 **Wire working dir** — the Settings screen sets `WORKING_DIRECTORY` (shell
  default = app-data/working). **Remaining:** drop the `C:/Users/youruser/...`
  placeholder default in `lib/config.ts`.
- [ ] 🟠 ⏱M **First-run setup wizard** — choose working directory, enter required
  keys, test Nexrender connectivity before the dashboard loads.
- [ ] 🟡 ⏱S **Startup self-check** — verify ffmpeg/Chrome/Nexrender availability and
  surface a clear status panel.

---

## Phase E — OAuth flows for desktop 🟠
*Current YouTube/TikTok auth assumes a web redirect; `get_youtube_token.js` is a
manual CLI step.*

- [ ] 🟠 ⏱L **Deep-link OAuth callbacks** (`tauri-plugin-deep-link`) — register a
  custom scheme (e.g. `temlet://oauth/callback`) and handle YouTube + TikTok
  redirects in-app, replacing the manual token script and localhost redirect.
- [ ] 🟡 ⏱M **In-app YouTube auth** — fold `get_youtube_token.js` into a real
  flow; persist the token via secure storage (Phase D).
- [ ] 🟡 ⏱S **Loopback fallback** — if deep links are unavailable, spin a transient
  loopback listener for the OAuth code (the app already depends on `server-destroy`).

---

## Phase F — Security hardening 🟡

- [ ] 🟠 ⏱S **Tighten Tauri capabilities + CSP** — `app.security.csp` is `null`;
  define a CSP and restrict webview navigation to the local server origin only.
- [ ] 🟡 ⏱S **Disable devtools in release** and lock down remote-content allowlist.
- [ ] 🟡 ⏱S **Bind server to 127.0.0.1 only** (already done via `HOSTNAME`) — keep
  it loopback-only; never expose the embedded API on a routable interface.
- [ ] 🟡 ⏱S **Validate inputs at the shell boundary** — any Rust↔JS commands added
  later must validate paths (reuse `app/lib/file-utils.ts` allowlist patterns).

---

## Phase G — Distribution 🟠
*The "full distributable" milestone deferred from the POC.*

- [ ] 🟠 ⏱M **macOS signing + notarization** — Developer ID, hardened runtime,
  notarize the `.dmg`.
- [ ] 🟠 ⏱M **Windows signing** — sign the `.msi`/NSIS installer.
- [ ] 🟡 ⏱M **Installers** — configure `.dmg` (mac) and `.msi`/`.exe` (win) targets
  in `tauri.conf.json` (currently `"targets": "all"`).
- [ ] 🟡 ⏱M **Auto-update** (`tauri-plugin-updater`) — update endpoint, signing
  keys, and an in-app "check for updates" action.

---

## Phase H — CI/CD & testing 🟡

- [ ] 🟠 ⏱M **Build matrix** — GitHub Actions to build/sign macOS (arm64 + x64) and
  Windows (x64) artifacts on tag (`tauri-action`).
- [ ] 🟡 ⏱M **Packaged smoke test** — drive the built app (tauri-driver / WebDriver)
  to confirm boot → dashboard → a DB round-trip.
- [ ] 🟡 ⏱S **Sidecar lifecycle test** — assert the server child starts and is
  reaped on quit (no orphan).
- [ ] 🟡 ⏱S **SQLite migration test** — verify upgrade-in-place from an older DB.

---

## Suggested order

1. **Phase A** (self-contained) + **D secret storage** + **B migrations-on-update**
   — these three are the true blockers for shipping to anyone.
2. **Phase C** native UX + **D settings/wizard** — the biggest perceived "desktop"
   upgrade for users.
3. **Phase E** OAuth, **F** security, then **G** distribution + **H** CI to release.

> Keep `DESKTOP.md` (how it works) and this file (what's left) in sync as items land.
