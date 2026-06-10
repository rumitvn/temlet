// Download the official Node.js binary for a target platform and stage it as a
// Tauri resource, so the packaged desktop app ships its own runtime and does not
// depend on the user having Node installed (or on the GUI inheriting PATH).
//
// Defaults to the *host* platform/version (guaranteeing the native-module ABI
// matches the installed node_modules). Override for cross-builds via env:
//   TARGET_NODE_VERSION (e.g. v26.0.0)  TARGET_PLATFORM (darwin|win32|linux)
//   TARGET_ARCH (arm64|x64)
//
// Run:  node scripts/fetch-node-runtime.mjs

import { execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");

const version = process.env.TARGET_NODE_VERSION ?? `v${process.versions.node}`;
const platform = process.env.TARGET_PLATFORM ?? process.platform;
const arch = process.env.TARGET_ARCH ?? process.arch;

// Map Node's platform/arch to nodejs.org dist naming.
const distPlatform = { darwin: "darwin", win32: "win", linux: "linux" }[platform];
if (!distPlatform) {
  console.error(`[fetch-node] unsupported platform: ${platform}`);
  process.exit(1);
}

const isWindows = platform === "win32";
const ext = isWindows ? "zip" : "tar.gz";
const pkgName = `node-${version}-${distPlatform}-${arch}`;
const url = `https://nodejs.org/dist/${version}/${pkgName}.${ext}`;
const exeName = isWindows ? "node.exe" : "node";

const runtimeDir = path.join(root, "src-tauri", "resources", "runtime");
const exeDest = path.join(runtimeDir, exeName);
const marker = path.join(runtimeDir, ".node-version");

// Idempotent: skip if we already staged this exact version for this target.
const wantMarker = `${version}-${distPlatform}-${arch}`;
if (existsSync(exeDest) && existsSync(marker) && readFileSync(marker, "utf8").trim() === wantMarker) {
  console.log(`[fetch-node] already staged ${wantMarker}`);
  process.exit(0);
}

console.log(`[fetch-node] downloading ${url}`);
const response = await fetch(url);
if (!response.ok) {
  console.error(`[fetch-node] download failed: HTTP ${response.status}`);
  process.exit(1);
}

const tmp = mkdtempSync(path.join(os.tmpdir(), "temlet-node-"));
const archivePath = path.join(tmp, `${pkgName}.${ext}`);
await new Promise(async (resolve, reject) => {
  const out = createWriteStream(archivePath);
  out.on("error", reject);
  out.on("finish", resolve);
  const buf = Buffer.from(await response.arrayBuffer());
  out.end(buf);
});

// Extract just the node binary using the OS-native extractor.
mkdirSync(runtimeDir, { recursive: true });
if (isWindows) {
  // node.exe lives at <pkgName>/node.exe inside the zip.
  execFileSync("powershell", [
    "-NoProfile",
    "-Command",
    `Expand-Archive -Force -Path '${archivePath}' -DestinationPath '${tmp}'`,
  ]);
  const extracted = path.join(tmp, pkgName, "node.exe");
  writeFileSync(exeDest, readFileSync(extracted));
} else {
  // bin/node inside the tarball; extract only that entry.
  execFileSync("tar", [
    "-xzf",
    archivePath,
    "-C",
    tmp,
    `${pkgName}/bin/node`,
  ]);
  const extracted = path.join(tmp, pkgName, "bin", "node");
  writeFileSync(exeDest, readFileSync(extracted));
  execFileSync("chmod", ["+x", exeDest]);
}

writeFileSync(marker, wantMarker);
rmSync(tmp, { recursive: true, force: true });
console.log(`[fetch-node] staged ${exeName} (${wantMarker}) -> ${exeDest}`);
