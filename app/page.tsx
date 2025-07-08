"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import { 
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/solid";
import CreateRenderDialog from './components/CreateRenderDialog';
import { RenderStatus, RenderItem, TemplateAeRenderFormat } from './types/render';
import RenderDetailsDialog from './components/RenderDetailsDialog';
import MetadataDetailsDialog from './components/MetadataDetailsDialog';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Default filter values in case imports fail
const defaultTypes = ["Short", "Long"];
const defaultTopics = [
  "Animals",
  "Plants",
  "Histories",
  "Science",
  "Technology",
  "Nature",
  "Space",
  "Ocean",
  "Weather",
  "Geography"
];
const defaultChannels = [
  "RumitX Studio",
  "RumitX Shorts",
  "RumitX Nature",
  "RumitX Science",
  "RumitX History"
];

// Try to import from filters file, fallback to defaults if it fails
let types = defaultTypes;
let topics = defaultTopics;
let channels = defaultChannels;

try {
  const filters = require("@/app/data/filters");
  types = filters.types || defaultTypes;
  topics = filters.topics || defaultTopics;
  channels = filters.channels || defaultChannels;
} catch (error) {
  console.warn("Failed to load filters from file, using defaults:", error);
}

const statusColors = {
  new: "bg-blue-500/20 text-blue-400",
  pending_render: "bg-orange-500/20 text-orange-400",
  rendering: "bg-yellow-500/20 text-yellow-400",
  rendered: "bg-green-500/20 text-green-400",
  pending_metadata: "bg-purple-500/20 text-purple-400",
  processing_metadata: "bg-indigo-500/20 text-indigo-400",
  processed_metadata: "bg-teal-500/20 text-teal-400",
  pending_upload: "bg-pink-500/20 text-pink-400",
  processing_upload: "bg-rose-500/20 text-rose-400",
  uploaded: "bg-emerald-500/20 text-emerald-400",
  declined: "bg-red-500/20 text-red-400",
  approved: "bg-teal-500/20 text-teal-400"
};

const statusGroups = {
  render: {
    title: "Render",
    icon: DocumentTextIcon,
    statuses: ['new', 'pending_render', 'rendering', 'rendered'] as RenderStatus[]
  },
  metadata: {
    title: "Metadata",
    icon: ArrowPathIcon,
    statuses: ['pending_metadata', 'processing_metadata', 'processed_metadata'] as RenderStatus[]
  },
  upload: {
    title: "Upload",
    icon: ArrowUpTrayIcon,
    statuses: ['pending_upload', 'processing_upload', 'uploaded'] as RenderStatus[]
  },
  owner: {
    title: "Owner",
    icon: ShieldCheckIcon,
    statuses: ['declined', 'approved'] as RenderStatus[]
  }
};

const getStatusIcon = (status: RenderStatus) => {
  if (status.includes('pending')) return ClockIcon;
  if (status.includes('ing')) return ArrowPathIcon;
  if (status.includes('ed')) return CheckCircleIcon;
  if (status === 'declined') return XCircleIcon;
  if (status === 'approved') return CheckCircleIcon;
  return ClockIcon;
};

// Add this at the top-level of the file, outside the Page component
const renderStatusMap = new Map<string, RenderStatus>();

export default function Page() {
  const [items, setItems] = useState<RenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 200); // 200ms delay
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; path: string }[]>([]);
  const [outputFolders, setOutputFolders] = useState<{ id: string; path: string }[]>([]);
  const [renderFormats, setRenderFormats] = useState<TemplateAeRenderFormat[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Partial<Record<RenderStatus, number>>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [selectedRenderItem, setSelectedRenderItem] = useState<RenderItem | null>(null);
  const [showRenderDetails, setShowRenderDetails] = useState(false);
  const [showMetadataDetails, setShowMetadataDetails] = useState(false);

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
      const response = await fetch('/api/renders/status-counts');
      if (!response.ok) {
        throw new Error('Failed to fetch status counts');
      }
      const data = await response.json();
      setStatusCounts(data);
    } catch (error) {
      console.error('Error fetching status counts:', error);
    } finally {
      setLoadingCounts(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch('/api/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  const fetchOutputFolders = useCallback(async () => {
    try {
      const response = await fetch('/api/output-folders');
      if (!response.ok) throw new Error('Failed to fetch output folders');
      const data = await response.json();
      setOutputFolders(data);
    } catch (error) {
      console.error('Error fetching output folders:', error);
    }
  }, []);

  const fetchRenderFormats = useCallback(async () => {
    try {
      const response = await fetch('/api/render-formats');
      if (!response.ok) throw new Error('Failed to fetch render formats');
      const data = await response.json();
      setRenderFormats(data);
    } catch (error) {
      console.error('Error fetching render formats:', error);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sortBy,
        sortOrder,
        limit: "20"
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
      console.error("Error fetching items:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, selectedType, selectedTopic, selectedChannel, selectedStatus, sortBy, sortOrder]);

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      await Promise.all([
        fetchItems(),
        fetchStatusCounts(),
        fetchTemplates(),
        fetchOutputFolders(),
        fetchRenderFormats()
      ]);
    };
    fetchInitialData();
  }, [fetchItems, fetchStatusCounts, fetchTemplates, fetchOutputFolders, fetchRenderFormats]);

  // Effect for refreshing data when filters change
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedTopic(null);
    setSelectedChannel(null);
    setSearchQuery("");
  };

  const formatDate = (dateString: string | number | Date | null | undefined) => {
    if (!dateString) return '-';
    const date = typeof dateString === 'number' ? new Date(dateString * 1000) : new Date(dateString);
    return date.toLocaleString();
  };

  // Add polling for render updates
  useEffect(() => {
    const pollRenderUpdates = async () => {
      // Only check items that are actively being processed, or just changed status
      const itemsToCheck = items.filter(item => 
        [
          'pending_render',
          'rendering',
          'pending_metadata',
          'processing_metadata',
          'pending_upload',
          'processing_upload'
        ].includes(item.status) ||
        recentlyChangedIds.includes(item.id)
      );

      if (itemsToCheck.length === 0) return;

      try {
        // Fetch updated items from the API
        const response = await fetch(`/api/renders?ids=${itemsToCheck.map(item => item.id).join(',')}`);
        if (!response.ok) throw new Error('Failed to fetch render updates');
        
        const data = await response.json();
        
        // Refactored: Detect status changes synchronously and update state
        const updatedItems: RenderItem[] = [];
        let statusChanged = false;
        const statusChanges: Record<string, number> = {};
        const changedIds: string[] = [];
        for (const item of items) {
          const updatedItem = data.items.find((i: RenderItem) => i.id === item.id);
          if (updatedItem) {
            if (updatedItem.status !== item.status) {
              statusChanged = true;
              changedIds.push(item.id);
              statusChanges[item.status] = (statusChanges[item.status] || 0) - 1;
              statusChanges[updatedItem.status] = (statusChanges[updatedItem.status] || 0) + 1;
            }
            updatedItems.push(updatedItem);
          } else {
            updatedItems.push(item);
          }
        }
        setItems(updatedItems);
        if (selectedRenderItem) {
          const updatedSelectedItem = data.items.find((i: RenderItem) => i.id === selectedRenderItem.id);
          if (updatedSelectedItem) {
            setSelectedRenderItem(updatedSelectedItem);
          }
        }
        if (Object.keys(statusChanges).length > 0) {
          setStatusCounts(prev => {
            const newCounts = { ...prev };
            Object.entries(statusChanges).forEach(([status, change]) => {
              const currentCount = newCounts[status as RenderStatus] || 0;
              newCounts[status as RenderStatus] = Math.max(0, currentCount + change);
            });
            return newCounts;
          });
        }
        setRecentlyChangedIds(changedIds);
        if (statusChanged) {
          fetchStatusCounts();
          
          // Check for autoUpload after metadata processing
          for (const updatedItem of data.items) {
            if (updatedItem.status === 'processed_metadata' && updatedItem.autoUpload) {
              // Find the original item to get the current state
              const originalItem = items.find(i => i.id === updatedItem.id);
              if (originalItem && originalItem.status !== 'processed_metadata') {
                // This item just changed to processed_metadata, trigger autoUpload
                handleUpload(updatedItem);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error polling render updates:', error);
      }
    };

    const interval = setInterval(pollRenderUpdates, 2000);
    return () => clearInterval(interval);
  }, [items, selectedRenderItem, recentlyChangedIds]);

  const handleCreateRender = async (data: any) => {
    try {
      const response = await fetch('/api/renders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw {
          type: 'api',
          message: responseData.error || 'Failed to create render item',
          status: response.status,
          details: responseData
        };
      }

      // If autoRender is true, start the render immediately
      if (data.autoRender) {
        await handleRender(responseData);
      }

      // Refresh the list
      fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error creating render item:', error);
      if (!error?.type) {
        throw {
          type: 'network',
          message: 'Network error occurred. Please try again.',
          originalError: error
        };
      }
      throw error;
    }
  };

  const handleStatusClick = (status: string) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const handleItemSelect = (itemId: string, event: React.MouseEvent) => {
    // Don't select if clicking on a button or link
    if ((event.target as HTMLElement).closest('button, a')) {
      return;
    }

    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    // Add confirmation dialog
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/renders/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: selectedItems }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete items');
      }

      setSelectedItems([]);
      await Promise.all([fetchItems(), fetchStatusCounts()]);
    } catch (error) {
      console.error('Error deleting items:', error);
      alert('Failed to delete items. Please try again.');
    }
  };

  const handleActionClick = async (action: string) => {
    if (selectedItems.length === 0) return;

    // Add confirmation dialog
    const actionMap = {
      render: 'render',
      metadata: 'create metadata for',
      upload: 'upload'
    };
    
    if (!confirm(`Are you sure you want to ${actionMap[action as keyof typeof actionMap]} ${selectedItems.length} item(s)?`)) {
      return;
    }

    try {
      if (action === 'metadata') {
        // For metadata, trigger handleMetadata for each selected item directly
        const itemsToProcess = items.filter(i => selectedItems.includes(i.id));
        for (const item of itemsToProcess) {
          handleMetadata(item);
        }
        setSelectedItems([]);
        return;
      }

      if (action === 'upload') {
        // For upload, trigger handleUpload for each selected item directly
        const itemsToProcess = items.filter(i => selectedItems.includes(i.id) && i.youtubeMetadata != null);
        for (const item of itemsToProcess) {
          await handleUpload(item);
        }
        setSelectedItems([]);
        return;
      }

      // For other actions, use the batch API
      const response = await fetch('/api/renders/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ids: selectedItems,
          action 
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} items`);
      }

      setSelectedItems([]);
      await Promise.all([fetchItems(), fetchStatusCounts()]);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert(`Failed to ${action} items. Please try again.`);
    }
  };

  const handleSelectAll = () => {
    if (!items) return;
    setSelectedItems(items.map(item => item.id));
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

  const handleRender = async (item: RenderItem) => {
    try {
      const response = await fetch(`/api/renders/${item.id}/render`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start render');
      }

      // Update local state immediately
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'pending_render' } : i
      ));
      // Update status counts
      setStatusCounts(prev => ({
        ...prev,
        new: (prev.new || 0) - 1,
        pending_render: (prev.pending_render || 0) + 1
      }));

      // Track last known status for this item
      renderStatusMap.set(item.id, 'pending_render');

      // Start polling for render updates
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/renders/${item.id}`);
          if (!statusResponse.ok) throw new Error('Failed to fetch render status');
          
          const updatedItem = await statusResponse.json();
          const lastStatus = renderStatusMap.get(item.id);
          
          // Only update counts if status actually changed
          if (updatedItem.status !== lastStatus) {
            setStatusCounts(prevCounts => {
              const newCounts = { ...prevCounts };
              // Decrement previous status
              if (lastStatus) {
                newCounts[lastStatus] = Math.max(0, (newCounts[lastStatus] || 0) - 1);
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
          setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));

          // If render is complete and autoCreateMetadata is true, trigger metadata generation
          if (updatedItem.status === 'rendered' && updatedItem.autoCreateMetadata) {
            clearInterval(pollInterval);
            renderStatusMap.delete(item.id);
            await handleMetadata(updatedItem);
          }
          // If render failed or completed without auto metadata, stop polling
          else if (['rendered', 'declined'].includes(updatedItem.status)) {
            clearInterval(pollInterval);
            renderStatusMap.delete(item.id);
            // Ensure final status counts are correct
            setStatusCounts(prevCounts => {
              const newCounts = { ...prevCounts };
              newCounts.rendering = 0;
              return newCounts;
            });
          }
        } catch (error) {
          console.error('Error polling render status:', error);
          clearInterval(pollInterval);
          renderStatusMap.delete(item.id);
        }
      }, 2000); // Poll every 2 seconds

      // Cleanup interval after 5 minutes (timeout)
      setTimeout(() => {
        clearInterval(pollInterval);
        renderStatusMap.delete(item.id);
      }, 5 * 60 * 1000);

    } catch (error) {
      console.error('Error starting render:', error);
      alert('Failed to start render. Please try again.');
    }
  };

  const handleMetadata = async (item: RenderItem) => {
    try {
      // Always set to pending_metadata if not already
      let latestStatus: RenderStatus | undefined;
      setItems(prev => {
        const found = prev.find(i => i.id === item.id);
        latestStatus = found?.status;
        return prev;
      });

      if (latestStatus !== 'pending_metadata') {
        setItems(prev => prev.map(i =>
          i.id === item.id ? { ...i, status: 'pending_metadata' } : i
        ));
        setStatusCounts(prev => ({
          ...prev,
          rendered: Math.max(0, (prev.rendered || 0) - 1),
          pending_metadata: (prev.pending_metadata || 0) + 1
        }));
        await fetch(`/api/renders/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pending_metadata' }),
        });
      }

      // Immediately proceed to processing_metadata
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'processing_metadata' } : i
      ));
      setStatusCounts(prev => ({
        ...prev,
        pending_metadata: Math.max(0, (prev.pending_metadata || 0) - 1),
        processing_metadata: (prev.processing_metadata || 0) + 1
      }));
      await fetch(`/api/renders/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'processing_metadata' }),
      });

      // Call metadata API
      const metadataResponse = await fetch('/api/youtube-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: item.jsonContent }),
      });

      if (!metadataResponse.ok) {
        throw new Error('Failed to generate metadata');
      }

      const metadataResult = await metadataResponse.json();
      
      // Ensure we have title and description
      if (!metadataResult.title || !metadataResult.description) {
        throw new Error('Invalid metadata response: missing title or description');
      }

      // Preserve existing metadata fields and update with new ones
      const updatedMetadata = {
        ...item.youtubeMetadata, // Preserve existing metadata
        title: metadataResult.title,
        description: metadataResult.description,
        tags: metadataResult.tags,
        // Preserve other required fields if they exist
        categoryId: item.youtubeMetadata?.categoryId || "27",
        defaultLanguage: item.youtubeMetadata?.defaultLanguage || "vi",
        defaultAudioLanguage: item.youtubeMetadata?.defaultAudioLanguage || "vi",
        playlistId: item.youtubeMetadata?.playlistId || "",
        scheduleDate: item.youtubeMetadata?.scheduleDate || "",
      };

      // Update local state immediately
      setItems(prev => prev.map(i => 
        i.id === item.id ? { 
          ...i, 
          status: 'processed_metadata',
          youtubeMetadata: updatedMetadata,
          metadataTime: Math.floor(Date.now() / 1000)
        } : i
      ));
      // Update status counts
      setStatusCounts(prev => ({
        ...prev,
        processing_metadata: (prev.processing_metadata || 0) - 1,
        processed_metadata: (prev.processed_metadata || 0) + 1
      }));

      // Update item with metadata
      const updateResponse = await fetch(`/api/renders/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeMetadata: updatedMetadata,
          status: 'processed_metadata',
          metadataTime: Math.floor(Date.now() / 1000),
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update metadata');
      }

      // If autoUpload is true, trigger upload immediately
      if (item.autoUpload) {
        await handleUpload({ ...item, status: 'processed_metadata', youtubeMetadata: updatedMetadata });
      }

    } catch (error) {
      console.error('Error generating metadata:', error);
      // Update local state immediately
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, status: 'declined' } : i
      ));
      // Update status counts
      setStatusCounts(prev => ({
        ...prev,
        processing_metadata: (prev.processing_metadata || 0) - 1,
        declined: (prev.declined || 0) + 1
      }));

      // Update status to error
      await fetch(`/api/renders/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'declined',
          error: error instanceof Error ? error.message : 'Unknown error'
        }),
      });
    }
  };

  const handleUpload = async (item: RenderItem) => {
    if (!item.youtubeMetadata) {
      console.error('Missing YouTube metadata');
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
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'pending_upload' } : i
      ));
      setStatusCounts(prev => ({
        ...prev,
        processed_metadata: Math.max(0, (prev.processed_metadata || 0) - 1),
        pending_upload: (prev.pending_upload || 0) + 1
      }));

      // Update status to processing_upload and update local state immediately
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing_upload" }),
      });
      
      // Update local state immediately
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'processing_upload' } : i
      ));
      setStatusCounts(prev => ({
        ...prev,
        pending_upload: Math.max(0, (prev.pending_upload || 0) - 1),
        processing_upload: (prev.processing_upload || 0) + 1
      }));

      // Get the video file
      const videoResponse = await fetch(`/api/renders/${item.id}/video`);
      if (!videoResponse.ok) {
        throw new Error('Failed to fetch video file');
      }
      const videoBlob = await videoResponse.blob();
      const videoFile = new File([videoBlob], `${item.fileName}.mp4`, { type: 'video/mp4' });

      // Prepare form data
      const form = new FormData();
      form.append("mp4", videoFile);
      form.append("title", item.youtubeMetadata.title);
      form.append("description", item.youtubeMetadata.description);
      form.append("playlistId", "");
      form.append("tags", item.youtubeMetadata.tags);
      form.append("categoryId", "27");
      form.append("defaultLanguage", "vi");
      form.append("defaultAudioLanguage", "vi");
      form.append("scheduleDate", "");

      // Upload to YouTube
      const res = await fetch("/api/youtube-upload", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
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
      setItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, status: 'uploaded', youtubeLink: `https://youtube.com/watch?v=${data.videoId}`, uploadTime }
          : i
      ));
      setStatusCounts(prev => ({
        ...prev,
        processing_upload: Math.max(0, (prev.processing_upload || 0) - 1),
        uploaded: (prev.uploaded || 0) + 1
      }));

    } catch (error) {
      console.error('Upload failed:', error);
      
      // Update local state to declined immediately
      setItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'declined' } : i
      ));
      setStatusCounts(prev => ({
        ...prev,
        processing_upload: Math.max(0, (prev.processing_upload || 0) - 1),
        declined: (prev.declined || 0) + 1
      }));
      
      // Update status to declined on error
      await fetch(`/api/renders/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      {/* Header - Sticky */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8 h-24 sticky top-0 z-40 bg-gradient-to-br from-gray-900 to-gray-800 bg-opacity-95 backdrop-blur"
        style={{ backdropFilter: 'blur(8px)' }}
      >
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 bg-clip-text text-transparent"
          >
            RumitX Studio
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-2 mt-1"
          >
            <span className="text-gray-400">made by</span>
            <motion.span
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              className="text-purple-400 font-medium"
            >
              rumitx
            </motion.span>
          </motion.div>
        </div>

        {/* New Render Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Render</span>
        </motion.button>
      </motion.div>

      {/* Status Counts Bar (not sticky) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {Object.entries(statusGroups).map(([groupKey, group]) => (
            <div key={groupKey} className="flex-1 bg-gray-800/50 rounded-xl p-3 mb-4 lg:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <group.icon className="w-6 h-6 text-purple-400" />
                <h3 className="text-2xl font-bold text-gray-200 flex items-center">
                  {group.title}
                  {loadingCounts && (
                    <svg className="animate-spin ml-2 h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  )}
                </h3>
                {/* Clear Status Filter Button */}
                {selectedStatus && (
                  <button
                    onClick={() => setSelectedStatus(null)}
                    className="ml-4 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
                  >
                    Clear Status Filter
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {group.statuses.map((status) => {
                  const Icon = getStatusIcon(status);
                  const count = statusCounts[status] || 0;
                  return (
                    <motion.button
                      key={status}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStatusClick(status)}
                      className={`flex items-center justify-between p-2 rounded-lg text-lg font-medium transition-all ${
                        statusColors[status]
                      } ${selectedStatus === status ? 'ring-2 ring-white' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <span>{status.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-2xl font-extrabold">{count}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Action Bar (remove Create New button) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end gap-2 mb-6"
      >
        {selectedItems.length > 0 && (
          <>
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Delete ({selectedItems.length})
            </button>
            <button
              onClick={() => handleActionClick('render')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Render ({selectedItems.length})
            </button>
            <button
              onClick={() => handleActionClick('metadata')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Metadata ({selectedItems.length})
            </button>
            <button
              onClick={() => handleActionClick('upload')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Upload ({selectedItems.length})
            </button>
          </>
        )}
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 mb-6"
      >
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search renders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters ? "bg-purple-600" : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            <span>Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-sm">
                {getActiveFiltersCount()}
              </span>
            )}
          </motion.button>
        </div>

        {/* Sorting buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSort("createdAt")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === "createdAt"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Date
            {sortBy === "createdAt" && (
              <span className="ml-1">
                {sortOrder === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
          <button
            onClick={() => handleSort("fileName")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === "fileName"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Name
            {sortBy === "fileName" && (
              <span className="ml-1">
                {sortOrder === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
          <button
            onClick={() => handleSort("type")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === "type"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Type
            {sortBy === "type" && (
              <span className="ml-1">
                {sortOrder === "asc" ? "↑" : "↓"}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-800 rounded-lg p-4 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-gray-300"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {types && types.map((type) => (
                      <button
                        key={type}
                        onClick={(e) => setSelectedType(selectedType === type ? null : type)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedType === type
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Topic
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {topics && topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={(e) => setSelectedTopic(selectedTopic === topic ? null : topic)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTopic === topic
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Channel
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {channels && channels.map((channel) => (
                      <button
                        key={channel}
                        onClick={(e) => setSelectedChannel(selectedChannel === channel ? null : channel)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedChannel === channel
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Main Content Area - No fixed height, scrolls with page */}
      {/* Render List */}
      <motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {items && items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-gray-800 rounded-lg p-6 space-y-4 cursor-pointer transition-all ${
              selectedItems.includes(item.id) ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={(e) => handleItemSelect(item.id, e)}
          >
            {/* Row 1: Type, Channel, Created */}
            <div className="flex justify-between items-center">
              <span className="text-purple-400 font-medium">{item.type}</span>
              <span className="text-gray-400">{item.channelName}</span>
              <span className="text-gray-500 text-sm">{formatDate(item.createdAt)}</span>
            </div>

            {/* Row 2: File Name and Status */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">{item.fileName}</h3>
              <span className={`px-3 py-1 rounded-full text-sm ${statusColors[item.status as keyof typeof statusColors]}`}>
                {item.status}
              </span>
            </div>

            {/* Row 3: Render Zone */}
            <div className={`rounded-lg p-4 ${
              ['rendered', 'pending_metadata', 'processing_metadata', 'processed_metadata', 'pending_upload', 'processing_upload', 'uploaded', 'declined', 'approved'].includes(item.status) 
                ? 'bg-green-900/30 border border-green-500/30' 
                : 'bg-gray-700/50'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-400">Render</h4>
                  {['rendered', 'pending_metadata', 'processing_metadata', 'processed_metadata', 'pending_upload', 'processing_upload', 'uploaded', 'declined', 'approved'].includes(item.status) && (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <button 
                  className="text-purple-400 hover:text-purple-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenderDetailsClick(item);
                  }}
                >
                  View Details
                </button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{item.nexrenderUid}</span>
                <span className="text-gray-500">{item.renderTime ? formatDate(item.renderTime) : '-'}</span>
              </div>
              {(item.status === 'rendering') && item.renderProgress !== undefined && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${item.renderProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 text-right">
                    {item.renderProgress}%
                  </p>
                </div>
              )}
              {item.status === 'new' && (
                <button
                  className="mt-2 w-full px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRender(item);
                  }}
                >
                  Start Render
                </button>
              )}
              {['rendered', 'pending_metadata', 'processing_metadata', 'processed_metadata', 'pending_upload', 'processing_upload', 'uploaded', 'declined', 'approved'].includes(item.status) && (
                <button
                  className="mt-2 w-full px-3 py-1 text-sm bg-green-600 hover:bg-green-500 rounded flex items-center justify-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open the video file in a new tab (restore old behavior)
                    if (item.mp4Link) {
                      window.open(item.mp4Link, '_blank');
                    } else {
                      window.open(`/api/renders/${item.id}/video`, '_blank');
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Open Video
                </button>
              )}
            </div>

            {/* Row 4: Metadata Zone */}
            <div className={`rounded-lg p-4 ${
              ['processed_metadata', 'pending_upload', 'processing_upload', 'uploaded', 'declined', 'approved'].includes(item.status) 
                ? item.status === 'processed_metadata'
                  ? 'bg-teal-900/30 border border-teal-500/30'
                  : 'bg-green-900/30 border border-green-500/30'
                : 'bg-gray-700/50'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-400">Metadata</h4>
                  {['processed_metadata', 'pending_upload', 'processing_upload', 'uploaded', 'declined', 'approved'].includes(item.status) && (
                    <CheckCircleIcon className="w-4 h-4 text-teal-500" />
                  )}
                </div>
                <button 
                  className="text-purple-400 hover:text-purple-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMetadataDetailsClick(item);
                  }}
                >
                  View Details
                </button>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                {item.youtubeMetadata ? (
                  <>
                    <span className="text-gray-300 truncate">
                      {item.youtubeMetadata.title}
                    </span>
                    <span className="text-gray-400 truncate">
                      {item.youtubeMetadata.description}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">No metadata generated</span>
                )}
                <span className="text-gray-500">{item.metadataTime ? formatDate(item.metadataTime) : '-'}</span>
              </div>
              {item.status === 'rendered' && (
                <button
                  className="mt-2 w-full px-3 py-1 text-sm bg-purple-600 hover:bg-purple-500 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMetadata(item);
                  }}
                >
                  Generate Metadata
                </button>
              )}
              {(item.status === 'pending_metadata' || item.status === 'processing_metadata') && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-500 animate-[loading_2s_ease-in-out_infinite]"
                      style={{ 
                        width: '100%',
                        transform: 'translateX(-100%)',
                        background: 'linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.8), transparent)',
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 text-right">
                    {item.status === 'pending_metadata' ? 'Pending...' : 'Processing...'}
                  </p>
                </div>
              )}
            </div>

            {/* Row 5: Upload Zone */}
            <div className={`rounded-lg p-4 ${
              ['uploaded', 'declined', 'approved'].includes(item.status) 
                ? 'bg-green-900/30 border border-green-500/30'
                : 'bg-gray-700/50'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-400">Upload</h4>
                  {['uploaded', 'declined', 'approved'].includes(item.status) && (
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <button 
                  className="text-purple-400 hover:text-purple-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.youtubeLink) {
                      window.open(item.youtubeLink, '_blank');
                    }
                  }}
                >
                  View Details
                </button>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                {item.youtubeLink ? (
                  <a
                    href={item.youtubeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-all"
                  >
                    {item.youtubeLink}
                  </a>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
                <span className="text-gray-500">{item.uploadTime ? formatDate(item.uploadTime) : '-'}</span>
              </div>
              {item.status === 'processed_metadata' && (
                <button
                  className="mt-2 w-full px-3 py-2 text-sm font-semibold rounded flex items-center justify-center gap-2 transition-colors"
                  style={{ background: '#FF0000', color: '#fff' }}
                  onMouseOver={e => e.currentTarget.style.background = '#ff4d4d'}
                  onMouseOut={e => e.currentTarget.style.background = '#FF0000'}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!item.youtubeMetadata || !item.youtubeMetadata.title || !item.youtubeMetadata.title.trim()) {
                      alert('Cannot upload: Missing or empty YouTube title.');
                      return;
                    }
                    if ([...item.youtubeMetadata.title].length > 100) {
                      alert('Cannot upload: YouTube title must be 100 characters or fewer. Current count: ' + [...item.youtubeMetadata.title].length);
                      return;
                    }
                    // Call the actual upload function
                    await handleUpload(item);
                  }}
                >
                  <svg height="20" viewBox="0 0 24 24" width="20" fill="#fff" style={{ marginRight: 6 }}>
                    <path d="M23.498 6.186a2.994 2.994 0 0 0-2.112-2.12C19.228 3.5 12 3.5 12 3.5s-7.228 0-9.386.566A2.994 2.994 0 0 0 .502 6.186C0 8.344 0 12 0 12s0 3.656.502 5.814a2.994 2.994 0 0 0 2.112 2.12C4.772 20.5 12 20.5 12 20.5s7.228 0 9.386-.566a2.994 2.994 0 0 0 2.112-2.12C24 15.656 24 12 24 12s0-3.656-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Upload to YouTube
                </button>
              )}
              {(item.status === 'pending_upload' || item.status === 'processing_upload') && (
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500 animate-[loading_2s_ease-in-out_infinite]"
                      style={{ 
                        width: '100%',
                        transform: 'translateX(-100%)',
                        background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.8), transparent)',
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 text-right">
                    {item.status === 'pending_upload' ? 'Pending...' : 'Uploading...'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center gap-2 mt-6 mb-6"
      >
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <motion.button
            key={pageNum}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentPage(pageNum)}
            className={`w-10 h-10 rounded-lg ${
              currentPage === pageNum
                ? "bg-purple-600"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            {pageNum}
          </motion.button>
        ))}
      </motion.div>

      {/* Selection Mode Toolbar - Fixed at bottom */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 flex justify-between items-center z-50">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded"
            >
              Deselect All
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleActionClick('render')}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 rounded"
            >
              Render
            </button>
            <button
              onClick={() => handleActionClick('metadata')}
              className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-500 rounded"
            >
              Metadata
            </button>
            <button
              onClick={() => handleActionClick('upload')}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-500 rounded"
            >
              Upload
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Create Render Dialog */}
      <CreateRenderDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        channels={channels.map(name => ({ id: name, name }))}
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
              setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
              setSelectedRenderItem(updated);
            }}
          />
        </>
      )}
    </div>
  );
}
