import type { Dispatch, SetStateAction } from "react";
import { logger } from "@/app/lib/logger";
import { YOUTUBE_CATEGORY_ID } from "@/app/lib/constants";
import { createUploadHandlers } from "./uploadHandlers";
import type { RenderItem, RenderStatus } from "../types/render";

// Tracks the last known status per item id across render-polling intervals.
const renderStatusMap = new Map<string, RenderStatus>();

type StatusCounts = Partial<Record<RenderStatus, number>>;

export interface CreateRenderPayload {
  autoRender?: boolean;
  _autoUpload?: boolean;
  _fileCount?: number;
  [key: string]: unknown;
}

export interface RenderActionsDeps {
  items: RenderItem[];
  setItems: Dispatch<SetStateAction<RenderItem[]>>;
  setStatusCounts: Dispatch<SetStateAction<StatusCounts>>;
  selectedItems: string[];
  setSelectedItems: Dispatch<SetStateAction<string[]>>;
  tiktokConnected: boolean;
  setShowTikTokAuth: Dispatch<SetStateAction<boolean>>;
  setPendingUploadItems: Dispatch<SetStateAction<RenderItem[]>>;
  setPendingUploadType: Dispatch<SetStateAction<"youtube" | "tiktok">>;
  setShowScheduleDialog: Dispatch<SetStateAction<boolean>>;
  setCreatedItemsForScheduling: Dispatch<SetStateAction<RenderItem[]>>;
  setIsCreatingMultipleItems: Dispatch<SetStateAction<boolean>>;
  fetchItems: () => Promise<void>;
  fetchStatusCounts: () => Promise<void>;
}

/**
 * Encapsulates the render → metadata → upload action pipeline and the batch
 * action/create/delete handlers. State, fetching, and effects remain owned by
 * the page; this hook receives the relevant state and setters via `deps`.
 */
export function useRenderActions(deps: RenderActionsDeps) {
  const {
    items,
    setItems,
    setStatusCounts,
    selectedItems,
    setSelectedItems,
    tiktokConnected,
    setShowTikTokAuth,
    setPendingUploadItems,
    setPendingUploadType,
    setShowScheduleDialog,
    setCreatedItemsForScheduling,
    setIsCreatingMultipleItems,
    fetchItems,
    fetchStatusCounts,
  } = deps;

  const { handleUpload, handleTikTokUpload, handleScheduledUpload } =
    createUploadHandlers({
      setItems,
      setStatusCounts,
      tiktokConnected,
      setShowTikTokAuth,
    });

  const handleMetadata = async (item: RenderItem) => {
    try {
      // Always set to pending_metadata if not already
      let latestStatus: RenderStatus | undefined;
      setItems((prev) => {
        const found = prev.find((i) => i.id === item.id);
        latestStatus = found?.status;
        return prev;
      });

      if (latestStatus !== "pending_metadata") {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "pending_metadata" } : i,
          ),
        );
        setStatusCounts((prev) => ({
          ...prev,
          rendered: Math.max(0, (prev.rendered || 0) - 1),
          pending_metadata: (prev.pending_metadata || 0) + 1,
        }));
        await fetch(`/api/renders/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pending_metadata" }),
        });
      }

      // Immediately proceed to processing_metadata
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "processing_metadata" } : i,
        ),
      );
      setStatusCounts((prev) => ({
        ...prev,
        pending_metadata: Math.max(0, (prev.pending_metadata || 0) - 1),
        processing_metadata: (prev.processing_metadata || 0) + 1,
      }));
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing_metadata" }),
      });

      // Call metadata API
      const metadataResponse = await fetch("/api/youtube-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: item.jsonContent }),
      });

      if (!metadataResponse.ok) {
        throw new Error("Failed to generate metadata");
      }

      const metadataResult = await metadataResponse.json();

      // Ensure we have title and description
      if (!metadataResult.title || !metadataResult.description) {
        throw new Error(
          "Invalid metadata response: missing title or description",
        );
      }

      // Preserve existing metadata fields and update with new ones
      const updatedMetadata = {
        ...item.youtubeMetadata, // Preserve existing metadata
        title: metadataResult.title,
        description: metadataResult.description,
        tags: metadataResult.tags,
        // Preserve other required fields if they exist
        categoryId: item.youtubeMetadata?.categoryId || YOUTUBE_CATEGORY_ID,
        defaultLanguage: item.youtubeMetadata?.defaultLanguage || "vi",
        defaultAudioLanguage: item.youtubeMetadata?.defaultAudioLanguage || "vi",
        playlistId: item.youtubeMetadata?.playlistId || "",
        scheduleDate: item.youtubeMetadata?.scheduleDate || "",
      };

      // Update local state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "processed_metadata",
                youtubeMetadata: updatedMetadata,
                metadataTime: Math.floor(Date.now() / 1000),
              }
            : i,
        ),
      );
      // Update status counts
      setStatusCounts((prev) => ({
        ...prev,
        processing_metadata: (prev.processing_metadata || 0) - 1,
        processed_metadata: (prev.processed_metadata || 0) + 1,
      }));

      // Update item with metadata
      const updateResponse = await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtubeMetadata: updatedMetadata,
          status: "processed_metadata",
          metadataTime: Math.floor(Date.now() / 1000),
        }),
      });

      if (!updateResponse.ok) {
        throw new Error("Failed to update metadata");
      }

      // If autoUpload is true, trigger upload immediately
      if (item.autoUpload) {
        await handleUpload({
          ...item,
          status: "processed_metadata",
          youtubeMetadata: updatedMetadata,
        });
      }
    } catch (error) {
      logger.error("Error generating metadata:", error);
      // Update local state immediately
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: "declined" } : i)),
      );
      // Update status counts
      setStatusCounts((prev) => ({
        ...prev,
        processing_metadata: (prev.processing_metadata || 0) - 1,
        declined: (prev.declined || 0) + 1,
      }));

      // Update status to error
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "declined",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      });
    }
  };

  const handleRender = async (item: RenderItem) => {
    try {
      const response = await fetch(`/api/renders/${item.id}/render`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to start render");
      }

      // Update local state immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "pending_render" } : i,
        ),
      );
      // Update status counts
      setStatusCounts((prev) => ({
        ...prev,
        new: (prev.new || 0) - 1,
        pending_render: (prev.pending_render || 0) + 1,
      }));

      // Track last known status for this item
      renderStatusMap.set(item.id, "pending_render");

      // Start polling for render updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/renders/${item.id}`);
          if (!statusResponse.ok)
            throw new Error("Failed to fetch render status");

          const updatedItem = await statusResponse.json();
          const lastStatus = renderStatusMap.get(item.id);

          // Only update counts if status actually changed
          if (updatedItem.status !== lastStatus) {
            setStatusCounts((prevCounts) => {
              const newCounts = { ...prevCounts };
              // Decrement previous status
              if (lastStatus) {
                newCounts[lastStatus] = Math.max(
                  0,
                  (newCounts[lastStatus] || 0) - 1,
                );
              }
              // Increment new status
              if (updatedItem.status) {
                const newStatus = updatedItem.status as RenderStatus;
                newCounts[newStatus] = (newCounts[newStatus] || 0) + 1;
              }
              return newCounts;
            });
            renderStatusMap.set(item.id, updatedItem.status);
          }

          // Update local state
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? updatedItem : i)),
          );

          // If render is complete and autoCreateMetadata is true, trigger metadata generation
          if (
            updatedItem.status === "rendered" &&
            updatedItem.autoCreateMetadata
          ) {
            clearInterval(pollInterval);
            renderStatusMap.delete(item.id);
            await handleMetadata(updatedItem);
          }
          // If render failed or completed without auto metadata, stop polling
          else if (["rendered", "declined"].includes(updatedItem.status)) {
            clearInterval(pollInterval);
            renderStatusMap.delete(item.id);
            // Ensure final status counts are correct
            setStatusCounts((prevCounts) => {
              const newCounts = { ...prevCounts };
              newCounts.rendering = 0;
              return newCounts;
            });
          }
        } catch (error) {
          logger.error("Error polling render status:", error);
          clearInterval(pollInterval);
          renderStatusMap.delete(item.id);
        }
      }, 2000); // Poll every 2 seconds

      // Cleanup interval after 5 minutes (timeout)
      setTimeout(
        () => {
          clearInterval(pollInterval);
          renderStatusMap.delete(item.id);
        },
        5 * 60 * 1000,
      );
    } catch (error) {
      logger.error("Error starting render:", error);
      alert("Failed to start render. Please try again.");
    }
  };

  const handleCreateRender = async (
    data: CreateRenderPayload,
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/renders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw {
          type: "api",
          message: responseData.error || "Failed to create render item",
          status: response.status,
          details: responseData,
        };
      }

      // If autoRender is true, start the render immediately
      if (data.autoRender) {
        await handleRender(responseData);
      }

      // If we're creating multiple items with autoUpload, collect them
      if (data._autoUpload && (data._fileCount || 0) > 1) {
        setCreatedItemsForScheduling((prev) => [...prev, responseData]);
        setIsCreatingMultipleItems(true);
      }

      // Refresh the list
      fetchItems();
      return true;
    } catch (error: unknown) {
      logger.error("Error creating render item:", error);
      if (!(error as { type?: string })?.type) {
        throw {
          type: "network",
          message: "Network error occurred. Please try again.",
          originalError: error,
        };
      }
      throw error;
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;

    // Add confirmation dialog
    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.length} item(s)?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/renders/batch", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedItems }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete items");
      }

      setSelectedItems([]);
      await Promise.all([fetchItems(), fetchStatusCounts()]);
    } catch (error) {
      logger.error("Error deleting items:", error);
      alert("Failed to delete items. Please try again.");
    }
  };

  const handleActionClick = async (action: string) => {
    if (selectedItems.length === 0) return;

    // Add confirmation dialog
    const actionMap = {
      render: "render",
      metadata: "create metadata for",
      upload: "upload",
      "tiktok-upload": "upload to TikTok",
    };

    if (
      !confirm(
        `Are you sure you want to ${actionMap[action as keyof typeof actionMap]} ${selectedItems.length} item(s)?`,
      )
    ) {
      return;
    }

    try {
      if (action === "metadata") {
        // For metadata, trigger handleMetadata for each selected item directly
        const itemsToProcess = items.filter((i) =>
          selectedItems.includes(i.id),
        );
        for (const item of itemsToProcess) {
          handleMetadata(item);
        }
        setSelectedItems([]);
        return;
      }

      if (action === "upload") {
        // For upload, show scheduling dialog if multiple items selected
        // Maintain selection order by using selectedItems array order
        const itemsToProcess = selectedItems
          .map((id) => items.find((i) => i.id === id))
          .filter(
            (item): item is RenderItem =>
              item !== undefined && item.youtubeMetadata != null,
          );

        if (itemsToProcess.length > 1) {
          setPendingUploadItems(itemsToProcess);
          setPendingUploadType("youtube");
          setShowScheduleDialog(true);
          return;
        } else if (itemsToProcess.length === 1) {
          // Single item upload without scheduling
          await handleUpload(itemsToProcess[0]);
        }
        setSelectedItems([]);
        return;
      }

      if (action === "tiktok-upload") {
        // For TikTok upload, show scheduling dialog if multiple items selected
        // Maintain selection order by using selectedItems array order
        const itemsToProcess = selectedItems
          .map((id) => items.find((i) => i.id === id))
          .filter(
            (item): item is RenderItem =>
              item !== undefined && item.youtubeMetadata != null,
          );

        if (itemsToProcess.length > 1) {
          setPendingUploadItems(itemsToProcess);
          setPendingUploadType("tiktok");
          setShowScheduleDialog(true);
          return;
        } else if (itemsToProcess.length === 1) {
          // Single item upload without scheduling
          await handleTikTokUpload(itemsToProcess[0]);
        }
        setSelectedItems([]);
        return;
      }

      // For other actions, use the batch API
      const response = await fetch("/api/renders/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedItems,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} items`);
      }

      setSelectedItems([]);
      await Promise.all([fetchItems(), fetchStatusCounts()]);
    } catch (error) {
      logger.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action} items. Please try again.`);
    }
  };

  return {
    handleUpload,
    handleTikTokUpload,
    handleScheduledUpload,
    handleMetadata,
    handleRender,
    handleCreateRender,
    handleDeleteSelected,
    handleActionClick,
  };
}
