import { AnimatePresence, motion } from "framer-motion";
import { Label } from "@/app/components/ui";
import {
  topics as filterTopics,
  channels as filterChannels,
  sites as filterSites,
} from "@/app/data/filters";
import { crawlerTypes } from "../constants";

const topics = [...filterTopics];
const channels = [...filterChannels];
const sites = [...filterSites];

interface CrawlerFiltersProps {
  show: boolean;
  selectedType: string | null;
  selectedTopic: string | null;
  selectedChannel: string | null;
  selectedSite: string | null;
  onSelectType: (value: string | null) => void;
  onSelectTopic: (value: string | null) => void;
  onSelectChannel: (value: string | null) => void;
  onSelectSite: (value: string | null) => void;
  onClearAll: () => void;
}

const pillClass = (active: boolean): string =>
  `px-3 py-1 rounded-full text-sm transition-colors ${
    active
      ? "bg-accent text-accent-fg hover:bg-accent-hover"
      : "bg-surface-raised text-text-muted hover:bg-surface-sunken"
  }`;

export default function CrawlerFilters({
  show,
  selectedType,
  selectedTopic,
  selectedChannel,
  selectedSite,
  onSelectType,
  onSelectTopic,
  onSelectChannel,
  onSelectSite,
  onClearAll,
}: CrawlerFiltersProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-surface border border-border rounded-lg p-4 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-text">Filters</h3>
            <button
              onClick={onClearAll}
              className="text-text-muted hover:text-text"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Type Filter */}
            <div>
              <Label className="mb-2">Type</Label>
              <div className="flex flex-wrap gap-2">
                {crawlerTypes.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() =>
                      onSelectType(selectedType === value ? null : value)
                    }
                    className={pillClass(selectedType === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Filter */}
            <div>
              <Label className="mb-2">Topic</Label>
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
              <Label className="mb-2">Channel</Label>
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

            {/* Site Filter */}
            <div>
              <Label className="mb-2">Site</Label>
              <div className="flex flex-wrap gap-2">
                {sites.map((site) => (
                  <button
                    key={site}
                    onClick={() =>
                      onSelectSite(selectedSite === site ? null : site)
                    }
                    className={pillClass(selectedSite === site)}
                  >
                    {site}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
