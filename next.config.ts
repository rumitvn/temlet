import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Pin the file-tracing root to this project. Without it, Next walks up to a
// parent directory (because of node_modules/lockfiles higher in the tree) and
// nests the standalone output under `Documents/rumitx/temlet/...`, leaving no
// `server.js` at the standalone root.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle (.next/standalone/server.js) so the
  // Tauri desktop shell can launch the backend as a sidecar. The build also
  // copies the minimal traced node_modules needed at runtime.
  output: "standalone",
  outputFileTracingRoot: projectRoot,

  // The Rust shell lives under src-tauri/ and its build artifacts (target/) and
  // staged bundle (resources/, which contains a copy of this very output) are
  // gigabytes — never needed by the Node server. Exclude them from the trace so
  // the standalone bundle stays lean and the build doesn't recursively copy
  // itself. Patterns are matched both at the tracing root and anywhere in the
  // tree as a safeguard.
  outputFileTracingExcludes: {
    "*": ["src-tauri/**"],
  },

  // Ensure the ffmpeg packages (used by the YouTube upload route) are copied
  // into the standalone bundle even though the tracer doesn't always follow
  // their dynamic binary resolution.
  outputFileTracingIncludes: {
    "/api/youtube-upload": [
      "./node_modules/ffmpeg-static/**",
      "./node_modules/fluent-ffmpeg/**",
    ],
  },

  // Native/server-only packages that must NOT be bundled by the compiler and
  // instead resolved from node_modules at runtime. Their native bindings and
  // (for ffmpeg/puppeteer) sibling binaries can't be webpacked.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
    "sharp",
    "puppeteer",
    "fluent-ffmpeg",
    "ffmpeg-static",
  ],
};

export default nextConfig;
