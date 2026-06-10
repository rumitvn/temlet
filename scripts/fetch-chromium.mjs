// Download a Chromium (Chrome for Testing) for the target platform and stage it
// as a Tauri resource, so the packaged desktop app's crawler (Puppeteer) works
// without a separately-downloaded browser.
//
// Defaults to the host platform; override for cross-builds via env:
//   TARGET_BROWSER_PLATFORM (mac|mac_arm|linux|win32|win64)
//   TARGET_CHROME_CHANNEL   (stable|beta|dev|canary)  [default: stable]
//
// Run:  node scripts/fetch-chromium.mjs

import {
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
  resolveBuildId,
} from "@puppeteer/browsers";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const cacheDir = path.join(root, "src-tauri", "resources", "chromium");
const marker = path.join(cacheDir, "executable.txt");

const platform = process.env.TARGET_BROWSER_PLATFORM || detectBrowserPlatform();
if (!platform) {
  console.error("[fetch-chromium] could not detect a browser platform");
  process.exit(1);
}

const channel = process.env.TARGET_CHROME_CHANNEL || "stable";
const buildId = await resolveBuildId(Browser.CHROME, platform, channel);

// Idempotent: skip if this exact build is already installed.
const installedExe = computeExecutablePath({
  browser: Browser.CHROME,
  buildId,
  cacheDir,
  platform,
});
if (existsSync(installedExe) && existsSync(marker)) {
  console.log(`[fetch-chromium] already installed (${platform} ${buildId})`);
  process.exit(0);
}

mkdirSync(cacheDir, { recursive: true });
console.log(`[fetch-chromium] installing Chrome ${buildId} for ${platform}…`);
await install({ browser: Browser.CHROME, buildId, cacheDir, platform });

// Record the executable path relative to the chromium resource dir, so the Rust
// shell can resolve it after bundling (where the absolute path differs).
const exePath = computeExecutablePath({
  browser: Browser.CHROME,
  buildId,
  cacheDir,
  platform,
});
const relative = path.relative(cacheDir, exePath);
writeFileSync(marker, relative);
console.log(`[fetch-chromium] staged Chromium; executable: ${relative}`);
