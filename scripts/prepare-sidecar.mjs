// Stage the Next.js standalone build into the Tauri resources directory so the
// desktop shell can launch it as an embedded backend.
//
// `next build` (with output: "standalone") emits:
//   .next/standalone/server.js + traced node_modules   (the runnable server)
//   .next/static                                        (must be copied in)
//   public                                              (must be copied in)
//
// This script assembles those into src-tauri/resources/server/, and copies the
// migrated SQLite schema file into src-tauri/resources/seed/ for first-run.
//
// Run AFTER `next build`:  node scripts/prepare-sidecar.mjs

import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");

const standaloneDir = path.join(root, ".next", "standalone");
const staticDir = path.join(root, ".next", "static");
const publicDir = path.join(root, "public");
const seedDb = path.join(root, "prisma", "temlet.db");

const serverDest = path.join(root, "src-tauri", "resources", "server");
const seedDest = path.join(root, "src-tauri", "resources", "seed");

function fail(message) {
  console.error(`[prepare-sidecar] ${message}`);
  process.exit(1);
}

if (!existsSync(path.join(standaloneDir, "server.js"))) {
  fail("missing .next/standalone/server.js — run `npm run build` first.");
}

console.log("[prepare-sidecar] staging standalone server ->", serverDest);
rmSync(serverDest, { recursive: true, force: true });
mkdirSync(serverDest, { recursive: true });

// 1. The standalone server (server.js + traced node_modules + app code).
cpSync(standaloneDir, serverDest, { recursive: true });

// 2. Static assets — Next does not copy these into standalone automatically.
if (existsSync(staticDir)) {
  cpSync(staticDir, path.join(serverDest, ".next", "static"), { recursive: true });
} else {
  fail("missing .next/static — did the build succeed?");
}

// 3. public/ — same, copied in manually when present.
if (existsSync(publicDir)) {
  cpSync(publicDir, path.join(serverDest, "public"), { recursive: true });
}

// 4. Safety net: ensure the ffmpeg packages are present even if tracing missed
//    them (their binary resolution is dynamic).
for (const mod of ["ffmpeg-static", "fluent-ffmpeg"]) {
  const dest = path.join(serverDest, "node_modules", mod);
  if (!existsSync(dest)) {
    const src = path.join(root, "node_modules", mod);
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true });
      console.log(`[prepare-sidecar] copied missing module: ${mod}`);
    }
  }
}

// 5. Seed database — a migrated, empty SQLite file the shell copies into the
//    app-data dir on first run.
console.log("[prepare-sidecar] staging seed database ->", seedDest);
rmSync(seedDest, { recursive: true, force: true });
mkdirSync(seedDest, { recursive: true });
if (existsSync(seedDb)) {
  cpSync(seedDb, path.join(seedDest, "temlet.db"));
} else {
  fail("missing prisma/temlet.db — run `npx prisma migrate dev` to create it.");
}

const sizeMb = (dir) => {
  // lightweight: report server.js presence rather than walking the tree
  return existsSync(path.join(dir, "server.js")) ? "ok" : "??";
};
console.log(`[prepare-sidecar] done (server.js: ${sizeMb(serverDest)})`);
