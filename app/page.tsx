"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import CreateRenderDialog from "./components/CreateRenderDialog";
import {
  RenderStatus,
  RenderItem,
  TemplateAeRenderFormat,
} from "./types/render";
import RenderDetailsDialog from "./components/RenderDetailsDialog";
import MetadataDetailsDialog from "./components/MetadataDetailsDialog";
import TikTokAuthDialog from "./components/TikTokAuthDialog";
import ScheduleUploadDialog from "./components/ScheduleUploadDialog";
import { Button } from "@/app/components/ui";
import { logger } from "@/app/lib/logger";
import { useDebounce } from "@/app/hooks/useDebounce";
import {
  types as filterTypes,
  topics as filterTopics,
  channels as filterChannels,
} from "@/app/data/filters";
import { useRenderActions } from "./renders/useRenderActions";
import { useIsDesktop } from "./hooks/useIsDesktop";
import SettingsDialog from "./components/SettingsDialog";
import RenderHeader from "./renders/components/RenderHeader";
import RenderStatusBar from "./renders/components/RenderStatusBar";
import RenderFilterBar from "./renders/components/RenderFilterBar";
import RenderCard from "./renders/components/RenderCard";
import RenderPagination from "./renders/components/RenderPagination";
import RenderSelectionToolbar from "./renders/components/RenderSelectionToolbar";

// Filter option lists (single source of truth: app/data/filters.ts)
const types = [...filterTypes];
const topics = [...filterTopics];
const channels = [...filterChannels];

export default function Page() {
  const [items, setItems] = useState<RenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 200); // 200ms delay
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isDesktop = useIsDesktop();
  const [templates, setTemplates] = useState<{ id: string; path: string }[]>(
    [],
  );
  const [outputFolders, setOutputFolders] = useState<
    { id: string; path: string }[]
  >([]);
  const [renderFormats, setRenderFormats] = useState<TemplateAeRenderFormat[]>(
    [],
  );
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<
    Partial<Record<RenderStatus, number>>
  >({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [selectedRenderItem, setSelectedRenderItem] =
    useState<RenderItem | null>(null);
  const [showRenderDetails, setShowRenderDetails] = useState(false);
  const [showMetadataDetails, setShowMetadataDetails] = useState(false);
  const [showTikTokAuth, setShowTikTokAuth] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [pendingUploadItems, setPendingUploadItems] = useState<RenderItem[]>([]);
  const [pendingUploadType, setPendingUploadType] = useState<
    "youtube" | "tiktok"
  >("youtube");
  const [createdItemsForScheduling, setCreatedItemsForScheduling] = useState<
    RenderItem[]
  >([]);
  const [isCreatingMultipleItems, setIsCreatingMultipleItems] = useState(false);

  // Track items that just changed status in the last poll
  const [recentlyChangedIds, setRecentlyChangedIds] = useState<string[]>([]);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedType) count++;
    if (selectedTopic) count++;
    if (selectedChannel) count++;
    return count;
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const fetchStatusCounts = useCallback(async () => {
    try {
      setLoadingCounts(true);
      const response = await fetch("/api/renders/status-counts");
      if (!response.ok) {
        throw new Error("Failed to fetch status counts");
      }
      const data = await response.json();
      setStatusCounts(data);
    } catch (error) {
      logger.error("Error fetching status counts:", error);
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      logger.error("Error fetching templates:", error);
    }
  }, []);

  const fetchOutputFolders = useCallback(async () => {
    try {
      const response = await fetch("/api/output-folders");
      if (!response.ok) throw new Error("Failed to fetch output folders");
      const data = await response.json();
      setOutputFolders(data);
    } catch (error) {
      logger.error("Error fetching output folders:", error);
    }
  }, []);

  const fetchRenderFormats = useCallback(async () => {
    try {
      const response = await fetch("/api/render-formats");
      if (!response.ok) throw new Error("Failed to fetch render formats");
      const data = await response.json();
      setRenderFormats(data);
    } catch (error) {
      logger.error("Error fetching render formats:", error);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sortBy,
        sortOrder,
        limit: itemsPerPage.toString(),
      });

      // If we have a search query, use the search endpoint
      if (debouncedSearchQuery) {
        params.append("q", debouncedSearchQuery);
        if (selectedType) params.append("type", selectedType);
        if (selectedTopic) params.append("topic", selectedTopic);
        if (selectedChannel) params.append("channelName", selectedChannel);
        if (selectedStatus) params.append("status", selectedStatus);
        const res = await fetch(`/api/renders/search?${params.toString()}`);
        const data = await res.json();
        setItems(data.items);
        setTotalPages(data.totalPages);
        return;
      }

      // If no search query but we have filters, use the main endpoint with filters
      if (selectedType || selectedTopic || selectedChannel || selectedStatus) {
        if (selectedType) params.append("type", selectedType);
        if (selectedTopic) params.append("topic", selectedTopic);
        if (selectedChannel) params.append("channelName", selectedChannel);
        if (selectedStatus) params.append("status", selectedStatus);
      }

      // Use the main endpoint
      const res = await fetch(`/api/renders?${params.toString()}`);
      const data = await res.json();
      setItems(data.items);
      setTotalPages(data.totalPages);
    } catch (error) {
      logger.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    debouncedSearchQuery,
    selectedType,
    selectedTopic,
    selectedChannel,
    selectedStatus,
    sortBy,
    sortOrder,
    itemsPerPage,
  ]);

  const {
    handleUpload,
    handleScheduledUpload,
    handleMetadata,
    handleRender,
    handleCreateRender,
    handleDeleteSelected,
    handleActionClick,
  } = useRenderActions({
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
  });

  // Check TikTok connection status on mount
  useEffect(() => {
    const token = localStorage.getItem("tiktok_access_token");
    const expiresAt = localStorage.getItem("tiktok_token_expires_at");

    if (token && expiresAt) {
      const expiryTime = parseInt(expiresAt);
      const now = Date.now();

      if (now < expiryTime) {
        // Token is still valid
        setTiktokConnected(true);
        logger.debug("TikTok token is valid, connected");
      } else {
        // Token has expired, remove it
        localStorage.removeItem("tiktok_access_token");
        localStorage.removeItem("tiktok_token_expires_at");
        setTiktokConnected(false);
        logger.debug("TikTok token has expired, removed");
      }
    } else {
      setTiktokConnected(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([
        fetchItems(),
        fetchStatusCounts(),
        fetchTemplates(),
        fetchOutputFolders(),
        fetchRenderFormats(),
      ]);
    };
    fetchInitialData();
  }, [
    fetchItems,
    fetchStatusCounts,
    fetchTemplates,
    fetchOutputFolders,
    fetchRenderFormats,
  ]);

  // Effect for refreshing data when filters change
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Effect to handle scheduling dialog after multiple items are created
  useEffect(() => {
    if (isCreatingMultipleItems && createdItemsForScheduling.length > 0) {
      // Check if we have all the items we expect
      const expectedCount =
        (createdItemsForScheduling[0] as { _fileCount?: number })?._fileCount ||
        0;
      if (createdItemsForScheduling.length >= expectedCount) {
        setPendingUploadItems(createdItemsForScheduling);
        setPendingUploadType("youtube");
        setShowScheduleDialog(true);
        setCreatedItemsForScheduling([]);
        setIsCreatingMultipleItems(false);
      }
    }
  }, [createdItemsForScheduling, isCreatingMultipleItems]);

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedTopic(null);
    setSelectedChannel(null);
    setSearchQuery("");
  };

  // Add polling for render updates
  useEffect(() => {
    const pollRenderUpdates = async () => {
      // Only check items that are actively being processed, or just changed status
      const itemsToCheck = items.filter(
        (item) =>
          [
            "pending_render",
            "rendering",
            "pending_metadata",
            "processing_metadata",
            "pending_upload",
            "processing_upload",
          ].includes(item.status) || recentlyChangedIds.includes(item.id),
      );

      if (itemsToCheck.length === 0) return;

      try {
        // Fetch updated items from the API
        const response = await fetch(
          `/api/renders?ids=${itemsToCheck.map((item) => item.id).join(",")}`,
        );
        if (!response.ok) throw new Error("Failed to fetch render updates");

        const data = await response.json();

        // Refactored: Detect status changes synchronously and update state
        const updatedItems: RenderItem[] = [];
        let statusChanged = false;
        const statusChanges: Record<string, number> = {};
        const changedIds: string[] = [];
        for (const item of items) {
          const updatedItem = data.items.find(
            (i: RenderItem) => i.id === item.id,
          );
          if (updatedItem) {
            if (updatedItem.status !== item.status) {
              statusChanged = true;
              changedIds.push(item.id);
              statusChanges[item.status] =
                (statusChanges[item.status] || 0) - 1;
              statusChanges[updatedItem.status] =
                (statusChanges[updatedItem.status] || 0) + 1;
            }
            updatedItems.push(updatedItem);
          } else {
            updatedItems.push(item);
          }
        }
        setItems(updatedItems);
        if (selectedRenderItem) {
          const updatedSelectedItem = data.items.find(
            (i: RenderItem) => i.id === selectedRenderItem.id,
          );
          if (updatedSelectedItem) {
            setSelectedRenderItem(updatedSelectedItem);
          }
        }
        if (Object.keys(statusChanges).length > 0) {
          setStatusCounts((prev) => {
            const newCounts = { ...prev };
            Object.entries(statusChanges).forEach(([status, change]) => {
              const currentCount = newCounts[status as RenderStatus] || 0;
              newCounts[status as RenderStatus] = Math.max(
                0,
                currentCount + change,
              );
            });
            return newCounts;
          });
        }
        setRecentlyChangedIds(changedIds);
        if (statusChanged) {
          fetchStatusCounts();

          // Check for autoUpload after metadata processing
          for (const updatedItem of data.items) {
            if (
              updatedItem.status === "processed_metadata" &&
              updatedItem.autoUpload
            ) {
              // Find the original item to get the current state
              const originalItem = items.find((i) => i.id === updatedItem.id);
              if (originalItem && originalItem.status !== "processed_metadata") {
                // This item just changed to processed_metadata, trigger autoUpload
                handleUpload(updatedItem);
              }
            }
          }
        }
      } catch (error) {
        logger.error("Error polling render updates:", error);
      }
    };

    const interval = setInterval(pollRenderUpdates, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selectedRenderItem, recentlyChangedIds]);

  const handleStatusClick = (status: string) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const handleItemSelect = (itemId: string, event: React.MouseEvent) => {
    // Don't select if clicking on a button or link
    if ((event.target as HTMLElement).closest("button, a")) {
      return;
    }

    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleSelectAll = () => {
    if (!items) return;
    // Sort items by creation date (oldest first) when using Select All
    const sortedItems = [...items].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });
    setSelectedItems(sortedItems.map((item) => item.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleRenderDetailsClick = (item: RenderItem) => {
    setSelectedRenderItem(item);
    setShowRenderDetails(true);
  };

  const handleMetadataDetailsClick = (item: RenderItem) => {
    setSelectedRenderItem(item);
    setShowMetadataDetails(true);
  };

  const handleRequestSingleUpload = (
    item: RenderItem,
    type: "youtube" | "tiktok",
  ) => {
    setPendingUploadItems([item]);
    setPendingUploadType(type);
    setShowScheduleDialog(true);
  };

  return (
    <div className="min-h-screen bg-bg text-text p-8">
      {/* Header - Sticky */}
      <RenderHeader
        onCreate={() => setIsCreateDialogOpen(true)}
        onSettings={isDesktop ? () => setShowSettings(true) : undefined}
      />

      {/* Status Counts Bar (not sticky) */}
      <RenderStatusBar
        statusCounts={statusCounts}
        loadingCounts={loadingCounts}
        selectedStatus={selectedStatus}
        onStatusClick={handleStatusClick}
        onClearStatus={() => setSelectedStatus(null)}
      />

      {/* Action Bar (remove Create New button) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end gap-2 mb-6"
      >
        {selectedItems.length > 0 && (
          <>
            <Button variant="danger" onClick={handleDeleteSelected}>
              Delete ({selectedItems.length})
            </Button>
            <Button variant="primary" onClick={() => handleActionClick("render")}>
              Render ({selectedItems.length})
            </Button>
            <Button
              variant="primary"
              onClick={() => handleActionClick("metadata")}
            >
              Metadata ({selectedItems.length})
            </Button>
            <Button variant="primary" onClick={() => handleActionClick("upload")}>
              Upload ({selectedItems.length})
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleActionClick("tiktok-upload")}
            >
              TikTok ({selectedItems.length})
            </Button>
          </>
        )}
      </motion.div>

      {/* Search and Filter Bar */}
      <RenderFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        activeFiltersCount={getActiveFiltersCount()}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        selectedType={selectedType}
        selectedTopic={selectedTopic}
        selectedChannel={selectedChannel}
        onSelectType={setSelectedType}
        onSelectTopic={setSelectedTopic}
        onSelectChannel={setSelectedChannel}
        onClearFilters={clearFilters}
      />

      {/* Render List */}
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {items &&
          items.map((item) => (
            <RenderCard
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={handleItemSelect}
              onRender={handleRender}
              onMetadata={handleMetadata}
              onRenderDetails={handleRenderDetailsClick}
              onMetadataDetails={handleMetadataDetailsClick}
              onRequestSingleUpload={handleRequestSingleUpload}
            />
          ))}
      </motion.div>

      {/* Pagination */}
      <RenderPagination
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {/* Selection Mode Toolbar - Fixed at bottom */}
      <RenderSelectionToolbar
        selectedCount={selectedItems.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onAction={handleActionClick}
        onDelete={handleDeleteSelected}
      />

      {/* Settings (desktop only) */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Create Render Dialog */}
      <CreateRenderDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        channels={channels.map((name) => ({ id: name, name }))}
        topics={topics}
        types={types}
        templates={templates}
        outputFolders={outputFolders}
        renderFormats={renderFormats}
        onSave={handleCreateRender}
        onTemplatesChange={fetchTemplates}
        onOutputFoldersChange={fetchOutputFolders}
        onRenderFormatsChange={fetchRenderFormats}
      />

      {/* TikTok Auth Dialog */}
      <TikTokAuthDialog
        isOpen={showTikTokAuth}
        onClose={() => setShowTikTokAuth(false)}
        onSuccess={() => {
          setTiktokConnected(true);
          setShowTikTokAuth(false);
        }}
      />

      {/* Schedule Upload Dialog */}
      <ScheduleUploadDialog
        isOpen={showScheduleDialog}
        onClose={() => {
          setShowScheduleDialog(false);
          setPendingUploadItems([]);
        }}
        onConfirm={(scheduleConfig) => {
          handleScheduledUpload(
            pendingUploadItems,
            scheduleConfig,
            pendingUploadType,
          );
          setShowScheduleDialog(false);
          setPendingUploadItems([]);
          setSelectedItems([]);
        }}
        itemCount={pendingUploadItems.length}
        items={pendingUploadItems}
      />

      {/* Add RenderDetailsDialog */}
      {selectedRenderItem && (
        <>
          <RenderDetailsDialog
            isOpen={showRenderDetails}
            onClose={() => {
              setShowRenderDetails(false);
              setSelectedRenderItem(null);
            }}
            renderItem={selectedRenderItem}
          />
          <MetadataDetailsDialog
            isOpen={showMetadataDetails}
            onClose={() => {
              setShowMetadataDetails(false);
              setSelectedRenderItem(null);
            }}
            renderItem={selectedRenderItem}
            onMetadataUpdate={(updated) => {
              setItems((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i)),
              );
              setSelectedRenderItem(updated);
            }}
          />
        </>
      )}
    </div>
  );
}
