import type { Dispatch, SetStateAction } from "react";
import { logger } from "@/app/lib/logger";
import { YOUTUBE_CATEGORY_ID } from "@/app/lib/constants";
import { calculateScheduledDate } from "./utils";
import type { RenderItem, RenderStatus } from "../types/render";
import type { ScheduleConfig } from "../components/ScheduleUploadDialog";

type StatusCounts = Partial<Record<RenderStatus, number>>;

export interface UploadHandlerDeps {
  setItems: Dispatch<SetStateAction<RenderItem[]>>;
  setStatusCounts: Dispatch<SetStateAction<StatusCounts>>;
  tiktokConnected: boolean;
  setShowTikTokAuth: Dispatch<SetStateAction<boolean>>;
}

export interface UploadHandlers {
  handleUpload: (
    item: RenderItem,
    scheduleConfig?: ScheduleConfig,
    itemIndex?: number,
  ) => Promise<void>;
  handleTikTokUpload: (
    item: RenderItem,
    scheduleConfig?: ScheduleConfig,
    itemIndex?: number,
  ) => Promise<void>;
  handleScheduledUpload: (
    items: RenderItem[],
    scheduleConfig: ScheduleConfig,
    uploadType: "youtube" | "tiktok",
  ) => Promise<void>;
}

/**
 * Builds the YouTube / TikTok upload handlers. Extracted from useRenderActions
 * to keep each module focused; they share the same optimistic state updates.
 */
export function createUploadHandlers(deps: UploadHandlerDeps): UploadHandlers {
  const { setItems, setStatusCounts, tiktokConnected, setShowTikTokAuth } =
    deps;

  const handleUpload = async (
    item: RenderItem,
    scheduleConfig?: ScheduleConfig,
    itemIndex?: number,
  ) => {
    if (!item.youtubeMetadata) {
      logger.error("Missing YouTube metadata");
      return;
    }

    try {
      // Update status to pending_upload and update local state immediately
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending_upload" }),
      });

      // Update local state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "pending_upload" } : i,
        ),
      );
      setStatusCounts((prev) => ({
        ...prev,
        processed_metadata: Math.max(0, (prev.processed_metadata || 0) - 1),
        pending_upload: (prev.pending_upload || 0) + 1,
      }));

      // Update status to processing_upload and update local state immediately
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing_upload" }),
      });

      // Update local state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "processing_upload" } : i,
        ),
      );
      setStatusCounts((prev) => ({
        ...prev,
        pending_upload: Math.max(0, (prev.pending_upload || 0) - 1),
        processing_upload: (prev.processing_upload || 0) + 1,
      }));

      // Get the video file
      const videoResponse = await fetch(`/api/renders/${item.id}/video`);
      if (!videoResponse.ok) {
        throw new Error("Failed to fetch video file");
      }
      const videoBlob = await videoResponse.blob();
      const videoFile = new File([videoBlob], `${item.fileName}.mp4`, {
        type: "video/mp4",
      });

      // Calculate scheduled date if provided
      let scheduleDate = "";
      if (scheduleConfig && itemIndex !== undefined) {
        scheduleDate = calculateScheduledDate(scheduleConfig, itemIndex);
      }

      // Prepare form data
      const form = new FormData();
      form.append("mp4", videoFile);
      form.append("title", item.youtubeMetadata.title);
      form.append("description", item.youtubeMetadata.description);
      form.append("playlistId", "");
      form.append("tags", item.youtubeMetadata.tags);
      form.append("categoryId", YOUTUBE_CATEGORY_ID);
      form.append("defaultLanguage", "vi");
      form.append("defaultAudioLanguage", "vi");
      form.append("scheduleDate", scheduleDate);

      // Upload to YouTube
      const res = await fetch("/api/youtube-upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      // Update status to uploaded and store YouTube link and upload time
      const uploadTime = Math.floor(Date.now() / 1000);
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "uploaded",
          youtubeLink: `https://youtube.com/watch?v=${data.videoId}`,
          uploadTime,
        }),
      });

      // Update local state for this item and statusCounts
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "uploaded",
                youtubeLink: `https://youtube.com/watch?v=${data.videoId}`,
                uploadTime,
              }
            : i,
        ),
      );
      setStatusCounts((prev) => ({
        ...prev,
        processing_upload: Math.max(0, (prev.processing_upload || 0) - 1),
        uploaded: (prev.uploaded || 0) + 1,
      }));
    } catch (error) {
      logger.error("Upload failed:", error);

      // Update local state to declined immediately
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "declined" } : i)),
      );
      setStatusCounts((prev) => ({
        ...prev,
        processing_upload: Math.max(0, (prev.processing_upload || 0) - 1),
        declined: (prev.declined || 0) + 1,
      }));

      // Update status to declined on error
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
    }
  };

  const handleTikTokUpload = async (
    item: RenderItem,
    scheduleConfig?: ScheduleConfig,
    itemIndex?: number,
  ) => {
    if (!item.youtubeMetadata) {
      logger.error("Missing YouTube metadata");
      return;
    }

    // Check if TikTok is connected
    if (!tiktokConnected) {
      setShowTikTokAuth(true);
      return;
    }

    try {
      // Update status to pending_upload and update local state immediately
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending_upload" }),
      });

      // Update local state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "pending_upload" } : i,
        ),
      );
      setStatusCounts((prev) => ({
        ...prev,
        processed_metadata: Math.max(0, (prev.processed_metadata || 0) - 1),
        pending_upload: (prev.pending_upload || 0) + 1,
      }));

      // Update status to processing_upload and update local state immediately
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing_upload" }),
      });

      // Update local state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "processing_upload" } : i,
        ),
      );
      setStatusCounts((prev) => ({
        ...prev,
        pending_upload: Math.max(0, (prev.pending_upload || 0) - 1),
        processing_upload: (prev.processing_upload || 0) + 1,
      }));

      // Get the video file
      const videoResponse = await fetch(`/api/renders/${item.id}/video`);
      if (!videoResponse.ok) {
        throw new Error("Failed to fetch video file");
      }
      const videoBlob = await videoResponse.blob();
      const videoFile = new File([videoBlob], `${item.fileName}.mp4`, {
        type: "video/mp4",
      });

      // Prepare form data for TikTok
      const form = new FormData();
      form.append("mp4", videoFile);
      form.append("title", item.youtubeMetadata.title);
      form.append("description", item.youtubeMetadata.description);
      form.append("tags", item.youtubeMetadata.tags);

      // Upload to TikTok
      const res = await fetch("/api/tiktok-upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "TikTok upload failed");
      }

      // Update status to uploaded and store TikTok link and upload time
      const uploadTime = Math.floor(Date.now() / 1000);
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "uploaded",
          tiktokLink: `https://www.tiktok.com/inbox?publish_id=${data.publishId}`,
          tiktokPublishId: data.publishId,
          uploadTime,
        }),
      });

      // Update local state for this item and statusCounts
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "uploaded",
                tiktokLink: `https://www.tiktok.com/inbox?publish_id=${data.publishId}`,
                tiktokPublishId: data.publishId,
                uploadTime,
              }
            : i,
        ),
      );
      setStatusCounts((prev) => ({
        ...prev,
        processing_upload: Math.max(0, (prev.processing_upload || 0) - 1),
        uploaded: (prev.uploaded || 0) + 1,
      }));
    } catch (error) {
      logger.error("TikTok upload failed:", error);

      // Update local state to declined immediately
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "declined" } : i)),
      );
      setStatusCounts((prev) => ({
        ...prev,
        processing_upload: Math.max(0, (prev.processing_upload || 0) - 1),
        declined: (prev.declined || 0) + 1,
      }));

      // Update status to declined on error
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
    }
  };

  const handleScheduledUpload = async (
    items: RenderItem[],
    scheduleConfig: ScheduleConfig,
    uploadType: "youtube" | "tiktok",
  ) => {
    try {
      // Process items in the order they were passed (maintaining selection order)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (uploadType === "youtube") {
          await handleUpload(item, scheduleConfig, i);
        } else {
          await handleTikTokUpload(item, scheduleConfig, i);
        }
      }
    } catch (error) {
      logger.error("Scheduled upload failed:", error);
    }
  };

  return { handleUpload, handleTikTokUpload, handleScheduledUpload };
}
