/**
 * Shared application constants.
 *
 * Centralizes values that were previously hardcoded across many files so they
 * have a single, documented source of truth.
 */

/** YouTube video category id for "Films & Animation" (the channels' default). */
export const YOUTUBE_CATEGORY_ID = "27";

/**
 * Base URL of the nexrender render engine. Override with NEXT_PUBLIC_NEXRENDER_URL;
 * falls back to the local default the app has always used.
 */
export const NEXRENDER_BASE_URL =
  process.env.NEXT_PUBLIC_NEXRENDER_URL || "http://localhost:3000";

/**
 * Base URL of this app, used for server/client fetches to its own API routes.
 * Mirrors the existing NEXT_PUBLIC_BASE_URL convention used in services/metadata.ts.
 */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001";
