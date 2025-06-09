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

interface RenderItem {
  id: string;
  fileName: string;
  type: string;
  topic: string;
  status: string;
  createdAt: string;
  channelName: string;
  nexrenderUid: string;
  renderTime?: string;
  metadataTime?: string;
  uploadTime?: string;
  youtubeMetadata?: any;
  youtubeLink?: string;
}

const statusColors = {
  new: "bg-blue-500/20 text-blue-400",
  processing: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  uploaded: "bg-purple-500/20 text-purple-400"
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

  const fetchItems = async () => {
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
        
        const res = await fetch(`/api/renders/search?${params.toString()}`);
        const data = await res.json();
        setItems(data.items);
        setTotalPages(data.totalPages);
        return;
      }

      // If no search query but we have filters, use the main endpoint with filters
      if (selectedType || selectedTopic || selectedChannel) {
        if (selectedType) params.append("type", selectedType);
        if (selectedTopic) params.append("topic", selectedTopic);
        if (selectedChannel) params.append("channelName", selectedChannel);
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
  };

  useEffect(() => {
    fetchItems();
  }, [currentPage, debouncedSearchQuery, selectedType, selectedTopic, selectedChannel, sortBy, sortOrder]);

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedTopic(null);
    setSelectedChannel(null);
    setSearchQuery("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
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

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Render</span>
        </motion.button>
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
                        onClick={() => setSelectedType(selectedType === type ? null : type)}
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
                        onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
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
                        onClick={() => setSelectedChannel(selectedChannel === channel ? null : channel)}
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

      {/* Render List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {items && items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-6 space-y-4"
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
                <button className="text-purple-400 hover:text-purple-300">
                  View Details
                </button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{item.nexrenderUid}</span>
                <span className="text-gray-500">{item.renderTime ? formatDate(item.renderTime) : '-'}</span>
              </div>
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
        className="flex justify-center gap-2 mt-6"
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
    </div>
  );
}
