import {
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/solid";
import type { RenderStatus } from "../types/render";

export const statusGroups = {
  render: {
    title: "Render",
    icon: DocumentTextIcon,
    statuses: [
      "new",
      "pending_render",
      "rendering",
      "rendered",
    ] as RenderStatus[],
  },
  metadata: {
    title: "Metadata",
    icon: ArrowPathIcon,
    statuses: [
      "pending_metadata",
      "processing_metadata",
      "processed_metadata",
    ] as RenderStatus[],
  },
  upload: {
    title: "Upload",
    icon: ArrowUpTrayIcon,
    statuses: [
      "pending_upload",
      "processing_upload",
      "uploaded",
    ] as RenderStatus[],
  },
  owner: {
    title: "Owner",
    icon: ShieldCheckIcon,
    statuses: ["declined", "approved"] as RenderStatus[],
  },
} as const;

export const getStatusIcon = (status: RenderStatus) => {
  if (status.includes("pending")) return ClockIcon;
  if (status.includes("ing")) return ArrowPathIcon;
  if (status.includes("ed")) return CheckCircleIcon;
  if (status === "declined") return XCircleIcon;
  if (status === "approved") return CheckCircleIcon;
  return ClockIcon;
};
