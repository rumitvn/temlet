# Temlet

A video rendering and upload management system for After Effects projects. Made by **rumitx** (author/creator).

> **Brand note:** The product/app brand is **Temlet** (renamed from "RumitX Studio").
> "RumitX" remains the author/creator identity — keep "made by rumitx" attribution as-is.
> The **YouTube content channels** ("RumitX Studio", "RumitX Shorts", "RumitX Nature",
> "RumitX Science", "RumitX History") are **not** the app brand — do **not** rename them.
> Channel names map directly to filesystem paths via `channel.toLowerCase()` in
> `lib/config.ts`, so renaming a channel would break asset folder resolution and stored data.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (PostCSS), **Framer Motion**
- **Prisma 6** + **PostgreSQL**
- **Puppeteer** (crawlers), **fluent-ffmpeg** / `ffmpeg-static`, **sharp**
- **googleapis** (YouTube), TikTok upload, **OpenAI** / Grok image generation
- Dev server runs on **port 3001**

## Commands

```bash
npm run dev      # next dev --port 3001
npm run build    # next build
npm run start    # next start
npm run lint     # next lint
npm run monitor  # node scripts/monitor.js (render monitor)
```

Prisma: `npx prisma generate`, `npx prisma migrate dev`, `npx prisma studio`.
Docker: see `README-DOCKER.md` (`docker-compose.dev.yml` / `.prod.yml`).

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
├── prisma.ts            # Prisma client singleton
└── config.ts            # WORKING_DIRECTORY + channel/topic path helpers
prisma/schema.prisma     # Models: RenderFormat, RenderItem, Template, OutputFolder, CrawlerJob
scripts/monitor.js       # Render monitor entrypoint
postman/                 # Temlet.postman_collection.json (API collection)
```

Path alias: `@/*` → project root (see `tsconfig.json`).

## Key concepts

- **Channels → folders**: `lib/config.ts` builds asset paths from `WORKING_DIRECTORY/<channel>/<topic>/<category>` using lowercased names. Channel/topic strings are functional, not just labels.
- **Render pipeline**: render items (`RenderItem`) created from templates → rendered via nexrender → metadata generated → uploaded to YouTube/TikTok. Scheduling distributes uploads across days/time slots (see `README.md`).
- **AI image generation**: `app/api/assets/generate-image` supports OpenAI DALL·E 3, Grok-2 Image, and local ComfyUI.

## Conventions

- Follow repo TypeScript style: explicit types on exported/public APIs, avoid `any`, immutable updates, no `console.log` in production code.
- Validate input at API boundaries; never trust external data (crawled content, API responses).
- Secrets via env only (see `env.example`): `DATABASE_URL`, `OPENAI_API_KEY`, `GROK_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `NEXTAUTH_SECRET`. Never hardcode.

## Setup docs

`README.md`, `README-DOCKER.md`, `DATABASE_SETUP.md`, `CRAWLERS_README.md`, `TIKTOK_SETUP.md`, `WORKING_DIRECTORY_SETUP.md`.
