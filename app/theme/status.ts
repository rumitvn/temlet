/**
 * Single source of truth for status colors across the app.
 *
 * Statuses (render pipeline, crawler jobs, AE render jobs) map to a small set of
 * semantic TONES; each tone maps to token-based Tailwind classes that flip with
 * the active theme. Consumed by the Badge primitive, the dashboard, crawlers,
 * and JobTable — replacing the previously duplicated `statusColors` objects.
 */
export type SemanticTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "progress"
  | "neutral";

export const STATUS_TONE: Record<string, SemanticTone> = {
  // Render pipeline (dashboard)
  new: "info",
  pending_render: "warning",
  rendering: "warning",
  rendered: "success",
  pending_metadata: "progress",
  processing_metadata: "progress",
  processed_metadata: "info",
  pending_upload: "progress",
  processing_upload: "progress",
  uploaded: "success",
  declined: "danger",
  approved: "success",

  // Crawler jobs
  pending: "info",
  crawling: "warning",
  downloading: "warning",
  completed: "success",
  failed: "danger",
  paused: "neutral",

  // AE render job states (JobTable)
  error: "danger",
  finished: "success",
  processing: "warning",
  queued: "info",

  // Render helper pages (quiz / reward / youtube)
  creating: "progress",
  uploading: "progress",
  success: "success",
};

export const TONE_CLASS: Record<SemanticTone, string> = {
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  progress: "bg-progress-bg text-progress",
  neutral: "bg-surface-raised text-text-muted",
};

export function toneForStatus(status: string): SemanticTone {
  return STATUS_TONE[status] ?? "neutral";
}

export function statusClass(status: string): string {
  return TONE_CLASS[toneForStatus(status)];
}
