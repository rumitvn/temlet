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

The packaged app reads `temlet.env` from the OS app-config directory and injects
each `KEY=VALUE` into the embedded server. Copy `temlet.env.example` there:

- macOS: `~/Library/Application Support/com.rumitx.temlet/temlet.env`
- Windows: `%APPDATA%\com.rumitx.temlet\temlet.env`

## Not yet done (distributable milestone)

- Bundle ffmpeg + a Chromium for Puppeteer (set `PUPPETEER_EXECUTABLE_PATH` /
  ffmpeg path) so the crawler and YouTube-thumbnail features work on a clean machine.
- Code signing, notarization, installers, and auto-update.
- OAuth redirect handling for a signed app (custom scheme / deep link).
