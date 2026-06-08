"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowPathIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/solid";
import CreateCrawlerDialog, {
  type CreateCrawlerData,
} from "../components/CreateCrawlerDialog";
import { Button, Input } from "@/app/components/ui";
import { logger } from "@/app/lib/logger";
import { useDebounce } from "@/app/hooks/useDebounce";
import { useCrawlerData } from "./useCrawlerData";
import CrawlerStatsCards from "./components/CrawlerStatsCards";
import CrawlerStatusBar from "./components/CrawlerStatusBar";
import CrawlerFilters from "./components/CrawlerFilters";
import CrawlerJobsTable from "./components/CrawlerJobsTable";

export default function CrawlersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const {
    jobs,
    loading,
    error,
    totalPages,
    statusCounts,
    loadingCounts,
    stats,
    fetchJobs,
    fetchStatusCounts,
    fetchStats,
  } = useCrawlerData({
    currentPage,
    sortBy,
    sortOrder,
    itemsPerPage,
    debouncedSearchQuery,
    selectedType,
    selectedTopic,
    selectedChannel,
    selectedSite,
    selectedStatus,
  });

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedType) count++;
    if (selectedTopic) count++;
    if (selectedChannel) count++;
    if (selectedSite) count++;
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

  const clearFilters = () => {
    setSelectedType(null);
    setSelectedTopic(null);
    setSelectedChannel(null);
    setSelectedSite(null);
    setSelectedStatus(null);
  };

  const handleStatusClick = (status: string) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const handleItemSelect = (itemId: string, event: React.MouseEvent) => {
    // Prevent row click from triggering when clicking checkboxes or action buttons
    if (
      (event.target as HTMLElement).closest('button, input[type="checkbox"]')
    ) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection with Ctrl/Cmd key
      setSelectedItems((prev) =>
        prev.includes(itemId)
          ? prev.filter((id) => id !== itemId)
          : [...prev, itemId],
      );
    } else if (event.shiftKey && selectedItems.length > 0) {
      // Range selection with Shift key
      const allJobIds = jobs.map((job) => job.id);
      const lastSelectedIndex = allJobIds.indexOf(
        selectedItems[selectedItems.length - 1],
      );
      const currentIndex = allJobIds.indexOf(itemId);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = allJobIds.slice(start, end + 1);

      setSelectedItems((prev) => {
        const newSelection = [...new Set([...prev, ...rangeIds])];
        return newSelection;
      });
    } else {
      // Single selection without modifier keys
      setSelectedItems([itemId]);
    }
  };

  const handleCheckboxChange = (
    itemId: string,
    checked: boolean,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    event.stopPropagation();

    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleSelectAll = () => {
    setSelectedItems(jobs.map((job) => job.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleDeleteSelected = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedItems.length} crawler job(s)?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/crawlers/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedItems }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete jobs");
      }

      // Refresh the jobs list instead of filtering locally
      fetchJobs();
      setSelectedItems([]);
      fetchStatusCounts();
      fetchStats();
    } catch (error) {
      logger.error("Error deleting jobs:", error);
      alert("Failed to delete jobs");
    }
  };

  const handleActionClick = async (action: string, jobId?: string) => {
    const ids = jobId ? [jobId] : selectedItems;
    if (ids.length === 0) return;

    try {
      if (action === "delete") {
        // Handle delete separately
        if (
          !confirm(
            `Are you sure you want to delete ${ids.length} crawler job(s)?`,
          )
        ) {
          return;
        }

        const response = await fetch("/api/crawlers/batch", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete jobs");
        }

        // Immediately update counts after deletion
        fetchJobs();
        fetchStatusCounts();
        fetchStats();
      } else {
        // Handle other actions (start, pause, resume)
        const response = await fetch("/api/crawlers/batch-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids,
            action,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to ${action} jobs`);
        }

        // For single job actions, let SSE handle the updates
        if (!jobId) {
          // For batch actions, refresh everything immediately
          fetchJobs();
          fetchStatusCounts();
          fetchStats();
          setSelectedItems([]);
        }
      }
    } catch (error) {
      logger.error(`Error ${action}ing jobs:`, error);
      alert(`Failed to ${action} jobs`);
    }
  };

  const handleCreateCrawler = async (data: CreateCrawlerData) => {
    try {
      logger.debug("Received form data:", data); // Log incoming data

      // Create a crawler job for each selected site
      await Promise.all(
        data.sites.map(async (site: string) => {
          // Create a clean job data object with explicit type
          const jobData = {
            name: data.name,
            keyword: data.keyword,
            site: site,
            type: data.type,
            channel: data.channel,
            topic: data.topic,
            settings: {
              maxItems: data.settings.maxItems,
              quality: data.settings.quality,
              format: data.settings.format,
            },
          };

          logger.debug("Creating crawler job with data:", jobData); // Log job data before sending

          const response = await fetch("/api/crawlers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(jobData),
          });

          if (!response.ok) {
            throw new Error(`Failed to create crawler job for site ${site}`);
          }

          const responseData = await response.json();
          logger.debug("API response:", responseData); // Log API response
          return responseData;
        }),
      );

      // Refresh everything after creating all jobs
      await fetchJobs(); // Add await here
      await fetchStatusCounts(); // Add await here
      await fetchStats(); // Add await here
      setIsCreateDialogOpen(false);
    } catch (error) {
      logger.error("Error creating crawler jobs:", error);
      alert("Failed to create one or more crawler jobs");
    }
  };

  const sortButtons: { field: string; label: string }[] = [
    { field: "createdAt", label: "Date" },
    { field: "name", label: "Name" },
    { field: "type", label: "Type" },
    { field: "status", label: "Status" },
  ];

  return (
    <div className="min-h-screen bg-bg text-text p-8">
      {/* Header - Sticky */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8 h-24 sticky top-0 z-40 bg-bg/95 backdrop-blur"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl font-bold text-accent"
          >
            Web Crawlers
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-2 mt-1"
          >
            <span className="text-text-muted">
              Download images and videos from websites
            </span>
          </motion.div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="secondary"
              leftIcon={<DocumentTextIcon className="w-5 h-5" />}
              onClick={() => (window.location.href = "/")}
            >
              Renders
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="secondary"
              leftIcon={<DocumentTextIcon className="w-5 h-5" />}
              onClick={() => (window.location.href = "/assets")}
            >
              Assets
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="primary"
              leftIcon={<PlusIcon className="w-5 h-5" />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Create Crawler
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <CrawlerStatsCards stats={stats} />

      {/* Status Counts Bar */}
      <CrawlerStatusBar
        statusCounts={statusCounts}
        loadingCounts={loadingCounts}
        selectedStatus={selectedStatus}
        onStatusClick={handleStatusClick}
        onClearStatus={() => setSelectedStatus(null)}
      />

      {/* Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between gap-2 mb-6"
      >
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            onClick={() => {
              fetchJobs();
              fetchStatusCounts();
              fetchStats();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              logger.debug("Current jobs state:", jobs);
              logger.debug(
                "Active jobs:",
                jobs.filter((job) =>
                  ["pending", "crawling", "downloading"].includes(job.status),
                ),
              );
            }}
          >
            Debug Jobs
          </Button>
        </div>

        {selectedItems.length > 0 && (
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleDeleteSelected}>
              Delete ({selectedItems.length})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleActionClick("pause")}
            >
              Pause ({selectedItems.length})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleActionClick("resume")}
            >
              Resume ({selectedItems.length})
            </Button>
          </div>
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
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-faint w-5 h-5 z-10" />
            <Input
              type="text"
              placeholder="Search crawler jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showFilters
                ? "bg-accent text-accent-fg hover:bg-accent-hover"
                : "bg-surface hover:bg-surface-raised text-text"
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            <span>Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="bg-accent text-accent-fg px-2 py-0.5 rounded-full text-sm">
                {getActiveFiltersCount()}
              </span>
            )}
          </motion.button>
        </div>

        {/* Sorting buttons */}
        <div className="flex gap-2">
          {sortButtons.map(({ field, label }) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                sortBy === field
                  ? "bg-accent text-accent-fg hover:bg-accent-hover"
                  : "bg-surface text-text-muted hover:bg-surface-raised"
              }`}
            >
              {label}
              {sortBy === field && (
                <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
              )}
            </button>
          ))}
        </div>

        <CrawlerFilters
          show={showFilters}
          selectedType={selectedType}
          selectedTopic={selectedTopic}
          selectedChannel={selectedChannel}
          selectedSite={selectedSite}
          onSelectType={setSelectedType}
          onSelectTopic={setSelectedTopic}
          onSelectChannel={setSelectedChannel}
          onSelectSite={setSelectedSite}
          onClearAll={clearFilters}
        />
      </motion.div>

      {/* Jobs Table */}
      <CrawlerJobsTable
        jobs={jobs}
        loading={loading}
        error={error}
        selectedItems={selectedItems}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onItemSelect={handleItemSelect}
        onCheckboxChange={handleCheckboxChange}
        onActionClick={handleActionClick}
        onCreateClick={() => setIsCreateDialogOpen(true)}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center items-center gap-2 mt-6"
        >
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <span className="px-3 py-2 text-text-muted">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="secondary"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </motion.div>
      )}

      {/* Create Crawler Dialog */}
      <CreateCrawlerDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateCrawler}
      />
    </div>
  );
}
