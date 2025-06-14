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
import { checkRenderStatus } from './services/render';

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
  processed_metadata: "bg-violet-500/20 text-violet-400",
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

  // Add SSE connection
  useEffect(() => {
    console.log('Setting up SSE connection...');
    const eventSource = new EventSource('/api/renders/updates');

    eventSource.onmessage = (event) => {
      console.log('Received SSE message:', event.data);
      const data = JSON.parse(event.data) as { type: string; render: RenderItem };
      
      if (data.type === 'render_update') {
        console.log('Processing render update:', data.render);
        // Update specific item in the list
        setItems(prevItems => {
          const newItems = prevItems.map(item => 
            item.id === data.render.id ? { ...item, ...data.render } : item
          );
          console.log('Updated items list:', newItems);
          return newItems;
        });

        // If the updated item is currently selected in the details dialog, update it
        if (selectedRenderItem?.id === data.render.id) {
          console.log('Updating selected render item:', data.render);
          setSelectedRenderItem(data.render);
        }
        // Always refresh status counts from backend
        fetchStatusCounts();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      console.log('Cleaning up SSE connection...');
      eventSource.close();
    };
  }, []);

  // Add polling for render progress
  useEffect(() => {
    const pollRenderProgress = async () => {
      const itemsToCheck = items.filter(item => 
        item.status === 'pending_render' || item.status === 'rendering'
      );

      for (const item of itemsToCheck) {
        try {
          const status = await checkRenderStatus(item.nexrenderUid);
          // Update the item with new status and progress
          setItems(prevItems => 
            prevItems.map(prevItem => 
              prevItem.id === item.id 
                ? { ...prevItem, renderProgress: status.renderProgress }
                : prevItem
            )
          );
        } catch (error) {
          console.error(`Error checking progress for ${item.id}:`, error);
        }
      }
    };

    const interval = setInterval(pollRenderProgress, 2000);
    return () => clearInterval(interval);
  }, [items]);

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

  const handleRender = async (item: RenderItem) => {
    try {
      const response = await fetch(`/api/renders/${item.id}/render`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start render');
      }

      // Refresh the list
      fetchItems();
      // Always refresh status counts from backend
      await fetchStatusCounts();
    } catch (error) {
      console.error('Error starting render:', error);
      alert('Failed to start render. Please try again.');
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
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-400">Render</h4>
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
              {(item.status === 'pending_render' || item.status === 'rendering') && item.renderProgress !== undefined && (
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
            </div>

            {/* Row 4: Metadata Zone */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-400">Metadata</h4>
                <button className="text-purple-400 hover:text-purple-300">
                  View Details
                </button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300 truncate max-w-[70%]">
                  {item.youtubeMetadata ? JSON.stringify(item.youtubeMetadata).slice(0, 50) + '...' : '-'}
                </span>
                <span className="text-gray-500">{item.metadataTime ? formatDate(item.metadataTime) : '-'}</span>
              </div>
            </div>

            {/* Row 5: Upload Zone */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-400">Upload</h4>
                <button className="text-purple-400 hover:text-purple-300">
                  View Details
                </button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300 truncate max-w-[70%]">
                  {item.youtubeLink || '-'}
                </span>
                <span className="text-gray-500">{item.uploadTime ? formatDate(item.uploadTime) : '-'}</span>
              </div>
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
        <RenderDetailsDialog
          isOpen={showRenderDetails}
          onClose={() => {
            setShowRenderDetails(false);
            setSelectedRenderItem(null);
          }}
          renderItem={selectedRenderItem}
        />
      )}
    </div>
  );
}
