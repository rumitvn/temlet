import { AnimatePresence, motion } from "framer-motion";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { Input } from "@/app/components/ui";
import {
  types as filterTypes,
  topics as filterTopics,
  channels as filterChannels,
} from "@/app/data/filters";

const types = [...filterTypes];
const topics = [...filterTopics];
const channels = [...filterChannels];

const sortButtons: { field: string; label: string }[] = [
  { field: "createdAt", label: "Date" },
  { field: "fileName", label: "Name" },
  { field: "type", label: "Type" },
];

interface RenderFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFiltersCount: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  selectedType: string | null;
  selectedTopic: string | null;
  selectedChannel: string | null;
  onSelectType: (value: string | null) => void;
  onSelectTopic: (value: string | null) => void;
  onSelectChannel: (value: string | null) => void;
  onClearFilters: () => void;
}

const pillClass = (active: boolean): string =>
  `px-3 py-1 rounded-full text-sm transition-colors ${
    active
      ? "bg-accent text-accent-fg"
      : "bg-surface-raised border border-border text-text-muted hover:border-border-strong"
  }`;

export default function RenderFilterBar({
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  activeFiltersCount,
  sortBy,
  sortOrder,
  onSort,
  selectedType,
  selectedTopic,
  selectedChannel,
  onSelectType,
  onSelectTopic,
  onSelectChannel,
  onClearFilters,
}: RenderFilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 mb-6"
    >
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-5 h-5 z-10" />
          <Input
            type="text"
            placeholder="Search renders..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleFilters}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showFilters
              ? "bg-accent text-accent-fg"
              : "bg-surface-raised border border-border hover:border-border-strong text-text"
          }`}
        >
          <FunnelIcon className="w-5 h-5" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-accent text-accent-fg px-2 py-0.5 rounded-full text-sm">
              {activeFiltersCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Sorting buttons */}
      <div className="flex gap-2">
        {sortButtons.map(({ field, label }) => (
          <button
            key={field}
            onClick={() => onSort(field)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === field
                ? "bg-accent text-accent-fg"
                : "bg-surface-raised border border-border text-text-muted hover:border-border-strong"
            }`}
          >
            {label}
            {sortBy === field && (
              <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-surface border border-border rounded-lg p-4 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Filters</h3>
              <button
                onClick={onClearFilters}
                className="text-text-muted hover:text-text"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {types.map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        onSelectType(selectedType === type ? null : type)
                      }
                      className={pillClass(selectedType === type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Filter */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Topic
                </label>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => (
                    <button
                      key={topic}
                      onClick={() =>
                        onSelectTopic(selectedTopic === topic ? null : topic)
                      }
                      className={pillClass(selectedTopic === topic)}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel Filter */}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-2">
                  Channel
                </label>
                <div className="flex flex-wrap gap-2">
                  {channels.map((channel) => (
                    <button
                      key={channel}
                      onClick={() =>
                        onSelectChannel(
                          selectedChannel === channel ? null : channel,
                        )
                      }
                      className={pillClass(selectedChannel === channel)}
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
  );
}
