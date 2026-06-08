<div align="center">

# 🎬 Temlet

**Self-hosted video rendering & upload automation for After Effects projects.**

Render with nexrender → auto-generate metadata → schedule uploads to YouTube & TikTok — all from one dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/rumitvn/temlet/actions/workflows/ci.yml/badge.svg)](https://github.com/rumitvn/temlet/actions/workflows/ci.yml)
[![GHCR](https://img.shields.io/badge/ghcr.io-temlet-blue?logo=docker)](https://github.com/rumitvn/temlet/pkgs/container/temlet)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Made by rumitx](https://img.shields.io/badge/made%20by-rumitx-ff5c5c)](https://github.com/rumitvn)

</div>

---

## What is Temlet?

Temlet turns an After Effects render pipeline into an automated content factory. You
point it at your AE templates and assets, and it handles the tedious parts: rendering
videos with [nexrender](https://github.com/inlife/nexrender), generating
platform-ready titles/descriptions/tags, and **scheduling** batches of uploads across
days and time slots on YouTube and TikTok. It can even crawl and generate the source
assets for you.

## ✨ Features

- **🎞️ Render management** — Create render items from templates, render via nexrender,
  track progress in real time, support multiple compositions and output formats.
- **📝 Metadata generation** — Auto-generate YouTube titles, descriptions, tags,
  playlists, and categories.
- **📅 Scheduled uploads** — Distribute many videos across days and time slots, then
  auto-upload to **YouTube** and **TikTok**. Batch operations supported.
- **🤖 AI image generation** — Generate assets with OpenAI DALL·E 3, Grok-2 Image (xAI),
  or a local ComfyUI instance.
- **🕷️ Asset crawlers** — Puppeteer-based crawlers to collect images/videos by keyword
  (see [CRAWLERS_README.md](CRAWLERS_README.md)).

## 🚀 Quick start

### Option A — Docker (recommended)

```bash
git clone https://github.com/rumitvn/temlet.git
cd temlet
cp env.example .env          # edit DATABASE_URL, WORKING_DIRECTORY, API keys
docker compose up -d
```

Then open **http://localhost:3001**. Full Docker guide: [README-DOCKER.md](README-DOCKER.md).

> Prebuilt images are published to GitHub Container Registry on every release:
> ```bash
> docker pull ghcr.io/rumitvn/temlet:latest
> ```

### Option B — Manual

```bash
git clone https://github.com/rumitvn/temlet.git
cd temlet
npm install
cp env.example .env          # configure your environment

npm run prisma:generate
npx prisma migrate deploy    # or `npx prisma migrate dev` in development

npm run dev                  # http://localhost:3001
```

**Requirements:** Node.js ≥ 20, PostgreSQL, and ffmpeg. After Effects + nexrender are
needed for the actual rendering step. See [DATABASE_SETUP.md](DATABASE_SETUP.md).

## ⚙️ Configuration

All configuration is via environment variables (copy [env.example](env.example) → `.env`).

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Prisma). |
| `DB_PASSWORD` | Database password (used by Docker Compose). |
| `WORKING_DIRECTORY` | Base path for channel/topic assets. See [WORKING_DIRECTORY_SETUP.md](WORKING_DIRECTORY_SETUP.md). |
| `NEXRENDER_SECRET` | Shared secret for the nexrender server/worker. |
| `NEXRENDER_SERVER_URL` | nexrender server URL. |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | Auth/session config. |
| `OPENAI_API_KEY` | OpenAI key for DALL·E 3 image generation (optional). |
| `GROK_API_KEY` | xAI Grok key for Grok-2 image generation (optional). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | YouTube/Google OAuth (optional). |
| `PORT` | App port (defaults to `3001`). |

> 🔐 Never commit `.env` or credentials. `.env*`, `google-cloud-key.json`, and uploaded
> AE templates are gitignored.

## 🧰 Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion ·
Prisma 6 + PostgreSQL · Puppeteer · fluent-ffmpeg / ffmpeg-static · sharp ·
googleapis (YouTube) · OpenAI / Grok image generation.

## 📡 API reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/renders` | Create render items |
| `POST` | `/api/renders/:id/render` | Start rendering an item |
| `POST` | `/api/youtube-metadata` | Generate YouTube metadata |
| `POST` | `/api/youtube-upload` | Upload to YouTube |
| `POST` | `/api/tiktok-upload` | Upload to TikTok |
| `POST` | `/api/assets/generate-image` | Generate images via AI models |
| `GET` | `/api/assets/generate-image` | List available AI models/config |
| `GET` | `/api/health` | Health check |

A Postman collection is available in [`postman/`](postman/).

## 📚 Documentation

- [README-DOCKER.md](README-DOCKER.md) — Docker setup (dev & prod)
- [DATABASE_SETUP.md](DATABASE_SETUP.md) — PostgreSQL & Prisma
- [WORKING_DIRECTORY_SETUP.md](WORKING_DIRECTORY_SETUP.md) — Asset path configuration
- [CRAWLERS_README.md](CRAWLERS_README.md) — Asset crawlers
- [TIKTOK_SETUP.md](TIKTOK_SETUP.md) — TikTok upload setup

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, the
development workflow, and the release process.

## 📄 License

[MIT](LICENSE) © **rumitx** — made by rumitx.
