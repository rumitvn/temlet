# Contributing to Temlet

Thanks for your interest in improving Temlet! This guide covers local setup, the
development workflow, and how releases are cut.

## Prerequisites

- **Node.js >= 20**
- **PostgreSQL** (local install or Docker)
- **ffmpeg** on your `PATH` (bundled `ffmpeg-static` is used as a fallback)
- **After Effects + nexrender** for the actual render pipeline (optional for UI work)

## Local setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp env.example .env
#   then edit .env — at minimum set DATABASE_URL and WORKING_DIRECTORY

# 3. Set up the database
npm run prisma:generate
npx prisma migrate dev

# 4. Start the dev server (http://localhost:3001)
npm run dev
```

> Prefer Docker? See [README-DOCKER.md](README-DOCKER.md) for a one-command setup.

## Development workflow

1. Create a branch from `master`: `git checkout -b feat/my-change`
2. Make your change. Keep it focused.
3. Run the checks locally before pushing:
   ```bash
   npm run lint
   npm run build
   ```
4. If you changed `prisma/schema.prisma`, generate a migration:
   ```bash
   npx prisma migrate dev --name describe_your_change
   ```
5. Open a pull request against `master`. CI (lint + build) must pass.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add scheduled TikTok uploads
fix: correct asset path resolution on Windows
docs: clarify WORKING_DIRECTORY setup
chore: bump dependencies
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

## Code style

- TypeScript strict mode — add explicit types on exported/public APIs, avoid `any`.
- Prefer immutable updates; validate input at API boundaries.
- No `console.log` in production code paths.
- Never commit secrets or personal absolute paths. Secrets come from env only
  (see [env.example](env.example)).

## Releasing (maintainers)

Releases are automated. Pushing a `v*` tag triggers
[`.github/workflows/release.yml`](.github/workflows/release.yml), which:

1. Builds the production Docker image.
2. Publishes it to GitHub Container Registry as
   `ghcr.io/rumitvn/temlet:<version>` and `:latest`.
3. Creates a GitHub Release with auto-generated notes.

To cut a release:

```bash
# bump "version" in package.json first, then:
git tag v0.2.0
git push origin v0.2.0
```

## Reporting bugs / requesting features

Open an issue using the provided templates. Please include reproduction steps and
your environment for bugs.
