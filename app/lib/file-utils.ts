import { promises as fs } from "fs";
import path from "path";
import { config } from "@/lib/config";

/**
 * Asset file classification shared across the asset API routes.
 */
export type AssetFileType = "voice" | "image" | "video" | "json" | "other";

/**
 * Single source of truth for which extensions map to which asset type.
 * Used by directory scanners to classify files consistently.
 */
export const FILE_TYPE_EXTENSIONS: Record<
  Exclude<AssetFileType, "other">,
  readonly string[]
> = {
  voice: [".mp3", ".wav", ".aac"],
  image: [".jpg", ".jpeg", ".png", ".gif", ".bmp"],
  video: [".mp4", ".avi", ".mov", ".wmv"],
  json: [".json"],
};

/**
 * Classify a file by its extension. Returns 'other' for unrecognized types.
 */
export function getFileType(fileName: string): AssetFileType {
  const ext = path.extname(fileName).toLowerCase();
  for (const [type, extensions] of Object.entries(FILE_TYPE_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type as AssetFileType;
    }
  }
  return "other";
}

export interface FileStats {
  size: number;
  lastModified: Date;
  exists: boolean;
}

/**
 * Read file size/mtime, returning a safe fallback when the file is missing.
 */
export async function getFileStats(filePath: string): Promise<FileStats> {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      lastModified: stats.mtime,
      exists: true,
    };
  } catch {
    return {
      size: 0,
      lastModified: new Date(),
      exists: false,
    };
  }
}

/**
 * Build the list of directories an asset file is allowed to live in for a
 * given channel/topic (voice, image, video, json, reward + reward subfolders).
 */
export function getAllowedAssetPaths(channel: string, topic: string): string[] {
  const assetPaths = config.getAssetPaths(channel, topic);
  return [
    assetPaths.voice,
    assetPaths.image,
    assetPaths.video,
    assetPaths.json,
    assetPaths.reward,
    `${assetPaths.reward}/output`,
    `${assetPaths.reward}/reward_1`,
    `${assetPaths.reward}/reward_2`,
    `${assetPaths.reward}/reward_3`,
    `${assetPaths.reward}/reward_4`,
    `${assetPaths.reward}/reward_5`,
  ];
}

/**
 * Path-traversal guard: true when targetPath sits under one of the allowed
 * directories. Matches both forward- and back-slash (Windows) variants.
 */
export function isPathAllowed(
  targetPath: string,
  allowedPaths: string[],
): boolean {
  const allowedPathsBackslash = allowedPaths.map((p) => p.replace(/\//g, "\\"));
  return (
    allowedPaths.some((allowedPath) => targetPath.startsWith(allowedPath)) ||
    allowedPathsBackslash.some((allowedPath) =>
      targetPath.startsWith(allowedPath),
    )
  );
}
