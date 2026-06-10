# Temlet Desktop (Tauri)

Temlet ships as a desktop app (Windows / macOS) using [Tauri v2](https://tauri.app).
The React UI runs in the native webview; the existing Next.js backend (all API
routes, render/crawler services, Puppeteer, ffmpeg, Prisma) runs as an embedded
local server. Data lives in a local **SQLite** file, so no separate database
server is required.

## Architecture

- **Dev (`npm run tauri:dev`)** — opens a native window pointed at the live
  `next dev` server (`http://localhost:3001`). Fast iteration; same as the web app.
- **Release (`npm run tauri:build`)** — the Rust shell (`src-tauri/`) launches a
  bundled Next.js **standalone** server on `127.0.0.1:38211`, waits for the port,
  then navigates the window from a loading splash to the server.

Key pieces:

| Path | Role |
|------|------|
| `src-tauri/src/lib.rs` | Rust shell: spawns the server (release), seeds the DB, injects env, kills the process on exit |
| `next.config.ts` | `output: "standalone"` + tracing root/excludes/includes |
| `scripts/prepare-sidecar.mjs` | Stages the standalone build + seed DB into `src-tauri/resources/` |
| `instrumentation.ts` | Runs the render monitor in-process when `TEMLET_RUN_MONITOR=1` |
| `loading/index.html` | Splash shown until the embedded server is ready |

## Prerequisites

- Node.js ≥ 20, npm
- Rust toolchain (`rustup`, `cargo`) — required by Tauri
- Platform build deps per the [Tauri prerequisites](https://tauri.app/start/prerequisites/)

## Database (SQLite)

Set a local file URL and create/sync the schema:

```bash
export DATABASE_URL="file:./prisma/temlet.db"
npx prisma migrate dev      # create/update the local DB
npx prisma generate         # regenerate the client
```

> Prisma 7 does not auto-load `.env`; export `DATABASE_URL` in your shell (or use
> `dotenv -e .env -- prisma ...`). In the packaged app the shell points the DB at
> a writable app-data path automatically and seeds it from
> `src-tauri/resources/seed/temlet.db` on first run.

## Run in development

```bash
npm run tauri:dev
```

Opens the desktop window wrapping `next dev`. The render monitor still runs the
classic way (`npm run monitor`) in dev.

## Build a desktop app

```bash
npm run tauri:build
```

This runs `next build` → `fetch:node` → `prepare:sidecar` (staging) → `tauri build`,
producing a bundle for the current platform under
`src-tauri/target/release/bundle/`.

> The app **bundles its own Node runtime** (`scripts/fetch-node-runtime.mjs` stages
> the official binary into `src-tauri/resources/runtime/`), so it runs on a machine
> with no Node installed and regardless of how it's launched. `resolve_node()`
> prefers the bundled runtime, then `TEMLET_NODE_PATH`, then PATH. For cross-builds,
> set `TARGET_PLATFORM` / `TARGET_ARCH` / `TARGET_NODE_VERSION` before `fetch:node`
> (and rebuild native modules for that target).

## Runtime secrets

Open **Settings** (gear icon in the dashboard header, desktop only) to enter API
keys, Nexrender/YouTube/TikTok credentials, and the working directory. Values are
stored in the **OS keychain** (macOS Keychain / Windows Credential Manager) via
`src-tauri/src/secrets.rs`, not in a plaintext file. "Save & Restart" applies them
(the embedded server reads config from the keychain at startup). `CRON_SECRET` is
generated and persisted per install.

Legacy fallback: the shell also reads `temlet.env` from the OS app-config dir
(keychain values take precedence). Copy `temlet.env.example` there if preferred:

- macOS: `~/Library/Application Support/com.rumitx.temlet/temlet.env`
- Windows: `%APPDATA%\com.rumitx.temlet\temlet.env`

## Bundled runtimes

The build stages everything the app needs into `src-tauri/resources/` so it runs
on a clean machine (~600MB total): the Node runtime (`fetch:node`), the Next.js
server + seed DB (`prepare:sidecar`), and **Chromium for the crawler**
(`fetch:chromium` → `PUPPETEER_EXECUTABLE_PATH`). **ffmpeg** ships via
`ffmpeg-static` in the server bundle (`FFMPEG_PATH`). Cross-build with the
`TARGET_*` env vars before each `fetch:*`.

## Not yet done (distributable milestone)

- Code signing, notarization, installers, and auto-update.
- OAuth redirect handling for a signed app (custom scheme / deep link).
