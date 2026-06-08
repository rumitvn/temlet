import { motion } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { Dispatch, SetStateAction } from "react";

type SortBy = "name" | "createDate";
type SortOrder = "asc" | "desc";

const channelOptions = [
  { value: "minimate", label: "MiniMate" },
  { value: "rumitx_studio", label: "RumitX Studio" },
  { value: "rumitx_shorts", label: "RumitX Shorts" },
  { value: "rumitx_nature", label: "RumitX Nature" },
  { value: "rumitx_science", label: "RumitX Science" },
  { value: "rumitx_history", label: "RumitX History" },
];

const topicOptions = [
  { value: "animals", label: "Animals" },
  { value: "plants", label: "Plants" },
  { value: "histories", label: "Histories" },
  { value: "science", label: "Science" },
  { value: "technology", label: "Technology" },
  { value: "nature", label: "Nature" },
  { value: "space", label: "Space" },
  { value: "ocean", label: "Ocean" },
  { value: "weather", label: "Weather" },
  { value: "geography", label: "Geography" },
];

interface AssetSearchFiltersProps {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  sortBy: SortBy;
  setSortBy: Dispatch<SetStateAction<SortBy>>;
  sortOrder: SortOrder;
  setSortOrder: Dispatch<SetStateAction<SortOrder>>;
  selectedChannel: string;
  setSelectedChannel: Dispatch<SetStateAction<string>>;
  selectedTopic: string;
  setSelectedTopic: Dispatch<SetStateAction<string>>;
  selectedAssets: string[];
  handleDeleteSelected: () => void;
  handleDeselectAll: () => void;
}

export default function AssetSearchFilters({
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  selectedChannel,
  setSelectedChannel,
  selectedTopic,
  setSelectedTopic,
  selectedAssets,
  handleDeleteSelected,
  handleDeselectAll,
}: AssetSearchFiltersProps) {
  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-4 mb-6"
  >
    {/* Search Bar */}
    <div className="flex gap-4">
      <div className="flex-1 relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5" />
        <input
          type="text"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-border focus:border-accent focus:outline-none"
        />
      </div>
      
      <div className="flex gap-2">
        {selectedAssets.length > 0 && (
          <>
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-danger text-white hover:opacity-90 rounded-lg transition-colors"
            >
              Delete ({selectedAssets.length})
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-4 py-2 bg-surface-raised hover:bg-surface rounded-lg transition-colors"
            >
              Deselect All
            </button>
          </>
        )}
      </div>
    </div>

    {/* Filter Bar */}
    <div className="flex gap-4 items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Channel:</span>
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
        >
          {channelOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Topic:</span>
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
        >
          {topicOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Sort by:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'createDate')}
          className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
        >
          <option value="createDate">Creation Date</option>
          <option value="name">Name</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-muted">Order:</span>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          className="bg-surface text-text rounded-lg px-3 py-2 border border-border focus:border-accent focus:outline-none text-sm"
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-text-muted">
        <span>📁</span>
        <span>{selectedChannel}/{selectedTopic}</span>
      </div>

      {/* Sort indicator */}
      <div className="flex items-center gap-2 text-sm text-accent bg-accent-muted bg-opacity-20 px-3 py-1 rounded-lg">
        <span>🔄</span>
        <span>
          {sortBy === 'createDate' ? 'Date' : 'Name'} 
          ({sortOrder === 'asc' ? 'A→Z' : 'Z→A'})
        </span>
      </div>
    </div>
  </motion.div>
  );
}
