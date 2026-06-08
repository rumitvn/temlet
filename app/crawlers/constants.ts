import {
  ClockIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
} from "@heroicons/react/24/solid";
import type { CrawlerStatus } from "./types";

/**
 * Filter options for the crawler Type facet. Crawler jobs are stored with a
 * lowercase `type` of `image` / `video`, so the label is shown to the user
 * while the value is what gets sent to the API.
 */
export const crawlerTypes = [
  { label: "Image", value: "image" },
  { label: "Video", value: "video" },
] as const;

export const statusGroups = {
  active: {
    title: "Active",
    icon: PlayIcon,
    statuses: ["pending", "crawling", "downloading"] as CrawlerStatus[],
  },
  completed: {
    title: "Completed",
    icon: CheckCircleIcon,
    statuses: ["completed"] as CrawlerStatus[],
  },
  issues: {
    title: "Issues",
    icon: ExclamationTriangleIcon,
    statuses: ["failed", "paused"] as CrawlerStatus[],
  },
} as const;

export const getStatusIcon = (status: CrawlerStatus) => {
  switch (status) {
    case "pending":
      return ClockIcon;
    case "crawling":
      return GlobeAltIcon;
    case "downloading":
      return ArrowUpTrayIcon;
    case "completed":
      return CheckCircleIcon;
    case "failed":
      return XCircleIcon;
    case "paused":
      return PauseIcon;
    default:
      return ClockIcon;
  }
};

export const isActiveStatus = (status: CrawlerStatus): boolean => {
  return status === "crawling" || status === "downloading";
};

export const getProgressBarColor = (_status: CrawlerStatus): string => {
  return "bg-accent";
};

export const formatDate = (
  dateString: string | number | Date | null | undefined,
): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString();
};
