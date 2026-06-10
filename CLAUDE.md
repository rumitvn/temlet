# Temlet

A video rendering and upload management system for After Effects projects. Made by **rumitx** (author/creator).

> **Desktop migration (in progress):** Temlet is being adapted into a **Tauri v2
> desktop app** (Windows/macOS), not just a web app. The React UI runs in a native
> webview; the existing Next.js backend runs as an **embedded local sidecar server**;
> data is a **local SQLite file** (migrated off PostgreSQL). When changing the
> backend, DB, build, or env handling, keep the desktop path working — see
> **`DESKTOP.md`** (how it works) and **`DESKTOP_ROADMAP.md`** (what's left to do).

> **Brand note:** The product/app brand is **Temlet** (renamed from "RumitX Studio").
> "RumitX" remains the author/creator identity — keep "made by rumitx" attribution as-is.
> The **YouTube content channels** ("RumitX Studio", "RumitX Shorts", "RumitX Nature",
> "RumitX Science", "RumitX History") are **not** the app brand — do **not** rename them.
> Channel names map directly to filesystem paths via `channel.toLowerCase()` in
> `lib/config.ts`, so renaming a channel would break asset folder resolution and stored data.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (PostCSS), **Framer Motion**
- **Prisma 7** + **SQLite** (local file, via `@prisma/adapter-better-sqlite3`) —
  migrated off PostgreSQL for self-contained desktop use
- **Tauri v2** (Rust shell in `src-tauri/`) for the desktop build
- **Puppeteer** (crawlers), **fluent-ffmpeg** / `ffmpeg-static`, **sharp**
- **googleapis** (YouTube), TikTok upload, **OpenAI** / Grok image generation
- Dev server runs on **port 3001**; the packaged desktop server runs on `127.0.0.1:38211`

## Commands

```bash
npm run dev              # next dev --port 3001
npm run build            # next build (output: "standalone" for the sidecar)
npm run start            # next start
npm run lint             # next lint
npm run monitor          # node scripts/monitor.js (render monitor, web/dev)
npm run tauri:dev        # desktop window wrapping next dev
npm run tauri:build      # build the desktop app (runs build + prepare:sidecar)
npm run prepare:sidecar  # stage standalone build + seed DB into src-tauri/resources
```

Prisma (SQLite): export `DATABASE_URL="file:./prisma/temlet.db"`, then
`npx prisma generate`, `npx prisma migrate dev`, `npx prisma studio`.
Prisma 7 does not auto-load `.env` — set `DATABASE_URL` in the shell.
Docker: see `README-DOCKER.md` (web deployment; uses its own DB config).

## Layout

```
app/
├── api/                 # Route handlers
│   ├── renders/         # Create/start render items
│   ├── crawlers/        # Crawler jobs (Puppeteer)
│   ├── cron/            # Scheduled tasks
│   ├── templates/       # AE templates
│   ├── output-folders/  # Output folder config
│   ├── render-formats/  # Render format presets
│   ├── assets/          # Asset mgmt + AI image generation
│   ├── youtube-metadata/ youtube-upload/
│   ├── tiktok-auth/ tiktok-status/ tiktok-upload/
│   └── health/
├── components/          # UI (e.g. CreateCrawlerDialog)
├── services/            # render.ts, metadata.ts, monitor.ts, crawlerService.ts
├── data/filters.ts      # Default channels/types/topics (channel list lives here)
├── lib/                 # db.ts, prisma.ts (app-level)
├── types/render.ts      # Shared render types
├── page.tsx             # Main dashboard
├── layout.tsx           # Root layout + metadata
├── assets/ crawlers/ ae_render_jobs/ render_* /  callback/ tiktok-callback/
lib/
├── prisma.ts            # Prisma client singleton (better-sqlite3 adapter)
└── config.ts            # WORKING_DIRECTORY + channel/topic path helpers
prisma/schema.prisma     # provider = sqlite. Models: RenderFormat, RenderItem, Template, OutputFolder, CrawlerJob
instrumentation.ts       # In-process render monitor (when TEMLET_RUN_MONITOR=1; packaged app)
scripts/monitor.js       # Render monitor entrypoint (web/dev)
scripts/prepare-sidecar.mjs # Stage standalone build + seed DB for the desktop bundle
loading/index.html       # Desktop startup splash (shown until the sidecar is ready)
src-tauri/               # Tauri v2 Rust shell (lib.rs spawns/seeds/manages the sidecar)
postman/                 # Temlet.postman_collection.json (API collection)
```

Path alias: `@/*` → project root (see `tsconfig.json`).

## Key concepts

- **Channels → folders**: `lib/config.ts` builds asset paths from `WORKING_DIRECTORY/<channel>/<topic>/<category>` using lowercased names. Channel/topic strings are functional, not just labels.
- **Render pipeline**: render items (`RenderItem`) created from templates → rendered via nexrender → metadata generated → uploaded to YouTube/TikTok. Scheduling distributes uploads across days/time slots (see `README.md`).
- **AI image generation**: `app/api/assets/generate-image` supports OpenAI DALL·E 3, Grok-2 Image, and local ComfyUI.
- **Desktop sidecar**: `src-tauri/src/lib.rs` — in **dev** the window wraps `next dev`
  (no sidecar); in **release** it boots the bundled standalone server, seeds
  `temlet.db` into the app-data dir on first run, injects secrets from
  `<app-config>/temlet.env`, waits for the port, then navigates the window to it.
  The child process is killed on app exit.

## Conventions

- Follow repo TypeScript style: explicit types on exported/public APIs, avoid `any`, immutable updates, no `console.log` in production code.
- Validate input at API boundaries; never trust external data (crawled content, API responses).
- Secrets via env only — never hardcode. Web/dev: `env.example` (`DATABASE_URL` is a
  SQLite `file:` URL, `OPENAI_API_KEY`, `GROK_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`).
  Desktop: `temlet.env.example` (loaded from the OS app-config dir by the shell).
- When migrating the schema, remember the packaged app seeds the DB only on first
  run — schema changes shipped in a new app version need a migration-on-update path
  (see `DESKTOP_ROADMAP.md`, Phase B).

## Setup docs

`README.md`, `DESKTOP.md` (desktop build), `DESKTOP_ROADMAP.md` (desktop TODO),
`README-DOCKER.md`, `DATABASE_SETUP.md`, `CRAWLERS_README.md`, `TIKTOK_SETUP.md`,
`WORKING_DIRECTORY_SETUP.md`.
