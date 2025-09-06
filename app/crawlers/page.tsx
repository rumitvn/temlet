"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  ShieldCheckIcon,
  PhotoIcon,
  VideoCameraIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon
} from "@heroicons/react/24/solid";
import CreateCrawlerDialog from "../components/CreateCrawlerDialog";

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

// Default filter values
const defaultTypes = ["Image", "Video"];
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
  "MiniMate",
  "RumitX Studio",
  "RumitX Shorts",
  "RumitX Nature",
  "RumitX Science",
  "RumitX History"
];
const defaultSites = [
  "Pexels",
  "Pixabay",
  "Unsplash",
  "Pexels Videos",
  "Pixabay Videos"
];

// Try to import from filters file, fallback to defaults if it fails
let types = defaultTypes;
let topics = defaultTopics;
let channels = defaultChannels;
let sites = defaultSites;

try {
  const filters = require("@/app/data/filters");
  types = filters.types || defaultTypes;
  topics = filters.topics || defaultTopics;
  channels = filters.channels || defaultChannels;
  sites = filters.sites || defaultSites;
} catch (error) {
  console.warn("Failed to load filters from file, using defaults:", error);
}

const statusColors = {
  pending: "bg-blue-500/20 text-blue-400",
  crawling: "bg-orange-500/20 text-orange-400",
  downloading: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  paused: "bg-gray-500/20 text-gray-400"
};

const getProgressBarColor = (status: CrawlerJob['status']) => {
  switch (status) {
    case 'crawling':
      return 'bg-orange-500';
    case 'downloading':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    case 'paused':
      return 'bg-gray-500';
    default:
      return 'bg-purple-500';
  }
};

const statusGroups = {
  active: {
    title: "Active",
    icon: PlayIcon,
    statuses: ['pending', 'crawling', 'downloading'] as CrawlerStatus[]
  },
  completed: {
    title: "Completed",
    icon: CheckCircleIcon,
    statuses: ['completed'] as CrawlerStatus[]
  },
  issues: {
    title: "Issues",
    icon: ExclamationTriangleIcon,
    statuses: ['failed', 'paused'] as CrawlerStatus[]
  }
};

type CrawlerStatus = 'pending' | 'crawling' | 'downloading' | 'completed' | 'failed' | 'paused';

interface CrawlerJob {
  id: string;
  name: string;
  keyword: string;
  site: string;
  type: 'image' | 'video';
  channel: string;
  topic: string;
  status: CrawlerStatus;
  progress: number;
  totalItems: number;
  downloadedItems: number;
  failedItems: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  outputPath: string;
  settings: {
    maxItems: number;
    quality: 'low' | 'medium' | 'high';
    format: string;
  };
}

interface CrawlerStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalDownloaded: number;
  totalFailed: number;
  averageSpeed: number;
}

const getStatusIcon = (status: CrawlerStatus) => {
  switch (status) {
    case 'pending':
      return ClockIcon;
    case 'crawling':
      return GlobeAltIcon;
    case 'downloading':
      return ArrowUpTrayIcon;
    case 'completed':
      return CheckCircleIcon;
    case 'failed':
      return XCircleIcon;
    case 'paused':
      return PauseIcon;
    default:
      return ClockIcon;
  }
};

const isActiveStatus = (status: CrawlerJob['status']) => {
  return status === 'crawling' || status === 'downloading';
};

export default function CrawlersPage() {
  const [jobs, setJobs] = useState<CrawlerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
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
  const [statusCounts, setStatusCounts] = useState<Partial<Record<CrawlerStatus, number>>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [stats, setStats] = useState<CrawlerStats>({
    totalJobs: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    totalDownloaded: 0,
    totalFailed: 0,
    averageSpeed: 0
  });

  // SSE monitoring for real-time updates
  const [sseConnections, setSseConnections] = useState<Map<string, EventSource>>(new Map());

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sortBy,
        sortOrder,
        limit: itemsPerPage.toString()
      });

      if (debouncedSearchQuery) {
        params.append("q", debouncedSearchQuery);
      }
      if (selectedType) params.append("type", selectedType);
      if (selectedTopic) params.append("topic", selectedTopic);
      if (selectedChannel) params.append("channel", selectedChannel);
      if (selectedSite) params.append("site", selectedSite);
      if (selectedStatus) params.append("status", selectedStatus);

      const response = await fetch(`/api/crawlers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch crawler jobs');
      }
      const data = await response.json();
      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError('Failed to load crawler jobs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, sortBy, sortOrder, itemsPerPage, debouncedSearchQuery, selectedType, selectedTopic, selectedChannel, selectedSite, selectedStatus]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      setLoadingCounts(true);
      const response = await fetch('/api/crawlers/status-counts');
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

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/crawlers/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Function to start monitoring a specific job
  const startJobMonitoring = useCallback((jobId: string) => {
    // Close existing connection if any
    const existingConnection = sseConnections.get(jobId);
    if (existingConnection) {
      existingConnection.close();
    }

    // Create new SSE connection
    const eventSource = new EventSource(`/api/crawlers/stream?jobId=${jobId}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`SSE update received for job ${jobId}:`, {
          type: data.type,
          jobData: data.job,
          rawData: data
        });
        
        if (data.type === 'job_update' && data.job) {
          // Update the specific job in the UI immediately
          setJobs(prevJobs => {
            const updatedJobs = prevJobs.map(job => {
              if (job.id === data.job.id) {
                const oldStatus = job.status;
                const newStatus = data.job.status as CrawlerStatus;
                const statusChanged = oldStatus !== newStatus;

                console.log(`Job ${job.id} update:`, {
                  oldStatus,
                  newStatus,
                  oldProgress: job.progress,
                  newProgress: data.job.progress,
                  oldDownloaded: job.downloadedItems,
                  newDownloaded: data.job.downloadedItems,
                  statusChanged
                });
                
                // If status changed, update counts immediately
                if (statusChanged) {
                  console.log(`Status changed from ${oldStatus} to ${newStatus}, updating counts...`);
                  Promise.all([
                    fetchStatusCounts(),
                    fetchStats()
                  ]).catch(error => console.error('Error updating counts:', error));
                }
                
                // Create updated job object
                const updatedJob: CrawlerJob = {
                  ...job,
                  ...data.job,
                  // Ensure type safety for critical fields
                  status: data.job.status as CrawlerStatus,
                  type: data.job.type as 'image' | 'video',
                  progress: data.job.progress || 0,
                  downloadedItems: data.job.downloadedItems || 0,
                  totalItems: data.job.totalItems || 0,
                  failedItems: data.job.failedItems || 0,
                  settings: {
                    maxItems: data.job.settings.maxItems,
                    quality: data.job.settings.quality as 'low' | 'medium' | 'high',
                    format: data.job.settings.format
                  }
                };

                console.log('Updated job object:', updatedJob);
                return updatedJob;
              }
              return job;
            });

            return updatedJobs;
          });
        } else if (data.type === 'completed') {
          console.log(`Job ${jobId} completed event received:`, data);
          
          // Update job status one final time
          setJobs(prevJobs => {
            const updatedJobs = prevJobs.map(job => {
              if (job.id === jobId) {
                const finalJob: CrawlerJob = {
                  ...job,
                  status: 'completed' as CrawlerStatus,
                  progress: Math.floor((job.downloadedItems / (job.totalItems || 1)) * 100),
                  completedAt: new Date(),
                  type: job.type, // Preserve the original type
                  settings: { ...job.settings } // Preserve the original settings
                };
                console.log('Setting final job state:', finalJob);
                return finalJob;
              }
              return job;
            });
            return updatedJobs;
          });

          // Close SSE connection
          console.log(`Closing SSE connection for completed job ${jobId}`);
          eventSource.close();
          setSseConnections(prev => {
            const newMap = new Map(prev);
            newMap.delete(jobId);
            return newMap;
          });

          // Refresh all data
          Promise.all([
            fetchJobs(),
            fetchStatusCounts(),
            fetchStats()
          ]).catch(error => console.error('Error refreshing data after completion:', error));
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
        console.error('Raw event data:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error(`SSE connection error for job ${jobId}:`, error);
      
      // Only close on real errors, not disconnects
      if (error instanceof Error) {
        console.log(`Closing SSE connection for job ${jobId} due to error`);
        eventSource.close();
        setSseConnections(prev => {
          const newMap = new Map(prev);
          newMap.delete(jobId);
          return newMap;
        });
        
        // Refresh data on error to ensure UI is in sync
        Promise.all([
          fetchJobs(),
          fetchStatusCounts(),
          fetchStats()
        ]).catch(error => console.error('Error refreshing data after SSE error:', error));
      }
    };

    // Store the connection
    setSseConnections(prev => new Map(prev).set(jobId, eventSource));
  }, [fetchStatusCounts, fetchStats, fetchJobs]);

  // Monitor active jobs and start SSE connections
  useEffect(() => {
    // Get all jobs that should be monitored
    const jobsToMonitor = jobs.filter(job => 
      ['pending', 'crawling', 'downloading'].includes(job.status)
    );

    // Start monitoring for each job that needs it
    jobsToMonitor.forEach(job => {
      if (!sseConnections.has(job.id)) {
        console.log(`Starting SSE monitoring for job ${job.id}`);
        startJobMonitoring(job.id);
      }
    });

    // Clean up completed jobs
    Array.from(sseConnections.keys()).forEach(jobId => {
      const job = jobs.find(j => j.id === jobId);
      if (!job || !['pending', 'crawling', 'downloading'].includes(job.status)) {
        console.log(`Closing SSE connection for completed job ${jobId}`);
        const connection = sseConnections.get(jobId);
        if (connection) {
          connection.close();
          setSseConnections(prev => {
            const newMap = new Map(prev);
            newMap.delete(jobId);
            return newMap;
          });
        }
      }
    });

    // Cleanup on unmount
    return () => {
      sseConnections.forEach((eventSource, jobId) => {
        console.log(`Cleaning up SSE connection for job ${jobId}`);
        eventSource.close();
      });
    };
  }, [jobs, sseConnections, startJobMonitoring]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchStatusCounts();
    fetchStats();
  }, [fetchStatusCounts, fetchStats]);

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

  const formatDate = (dateString: string | number | Date | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleStatusClick = (status: string) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const handleItemSelect = (itemId: string, event: React.MouseEvent) => {
    // Prevent row click from triggering when clicking checkboxes or action buttons
    if ((event.target as HTMLElement).closest('button, input[type="checkbox"]')) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection with Ctrl/Cmd key
      setSelectedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    } else if (event.shiftKey && selectedItems.length > 0) {
      // Range selection with Shift key
      const allJobIds = jobs.map(job => job.id);
      const lastSelectedIndex = allJobIds.indexOf(selectedItems[selectedItems.length - 1]);
      const currentIndex = allJobIds.indexOf(itemId);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = allJobIds.slice(start, end + 1);
      
      setSelectedItems(prev => {
        const newSelection = [...new Set([...prev, ...rangeIds])];
        return newSelection;
      });
    } else {
      // Single selection without modifier keys
      setSelectedItems([itemId]);
    }
  };

  const handleCheckboxChange = (itemId: string, checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = () => {
    setSelectedItems(jobs.map(job => job.id));
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedItems.length} crawler job(s)?`)) {
      return;
    }

    try {
      const response = await fetch('/api/crawlers/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedItems })
      });

      if (!response.ok) {
        throw new Error('Failed to delete jobs');
      }

      // Refresh the jobs list instead of filtering locally
      fetchJobs();
      setSelectedItems([]);
      fetchStatusCounts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting jobs:', error);
      alert('Failed to delete jobs');
    }
  };

  const handleActionClick = async (action: string, jobId?: string) => {
    const ids = jobId ? [jobId] : selectedItems;
    if (ids.length === 0) return;

    try {
      if (action === 'delete') {
        // Handle delete separately
        if (!confirm(`Are you sure you want to delete ${ids.length} crawler job(s)?`)) {
          return;
        }

        const response = await fetch('/api/crawlers/batch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        });

        if (!response.ok) {
          throw new Error('Failed to delete jobs');
        }

        // Immediately update counts after deletion
        fetchJobs();
        fetchStatusCounts();
        fetchStats();
      } else {
        // Handle other actions (start, pause, resume)
        const response = await fetch('/api/crawlers/batch-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            ids, 
            action 
          })
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
      console.error(`Error ${action}ing jobs:`, error);
      alert(`Failed to ${action} jobs`);
    }
  };

  // Function to update a specific job in the UI
  const updateJobInUI = (jobId: string, action: string) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        const updatedJob = { ...job };
        
        switch (action) {
          case 'start':
            updatedJob.status = 'crawling';
            updatedJob.startedAt = new Date();
            updatedJob.progress = 0;
            updatedJob.downloadedItems = 0;
            updatedJob.failedItems = 0;
            updatedJob.totalItems = 0;
            break;
          case 'pause':
            updatedJob.status = 'paused';
            break;
          case 'resume':
            updatedJob.status = 'crawling';
            break;
          case 'delete':
            // Job will be removed from the list
            return null;
        }
        
        return updatedJob;
      }
      return job;
    }).filter(Boolean) as CrawlerJob[]);
  };

  // Function to update job progress from external updates
  const updateJobProgress = (jobId: string, updates: any) => {
    setJobs(prevJobs => prevJobs.map(job => {
      if (job.id === jobId) {
        return { ...job, ...updates };
      }
      return job;
    }));
  };

  const handleCreateCrawler = async (data: any) => {
    try {
      const response = await fetch('/api/crawlers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create crawler job');
      }

      const newJob = await response.json();
      
      // Refresh everything after creating a new job
      fetchJobs();
      fetchStatusCounts();
      fetchStats();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating crawler job:', error);
      alert('Failed to create crawler job');
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
            Web Crawlers
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-2 mt-1"
          >
            <span className="text-gray-400">Download images and videos from websites</span>
          </motion.div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            onClick={() => window.location.href = '/'}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Renders</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            onClick={() => window.location.href = '/assets'}
          >
            <DocumentTextIcon className="w-5 h-5" />
            <span>Assets</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <PlusIcon className="w-5 h-5" />
            <span>Create Crawler</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <GlobeAltIcon className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-medium text-gray-200">Total Jobs</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">{stats.totalJobs}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <PlayIcon className="w-6 h-6 text-orange-400" />
              <h3 className="text-lg font-medium text-gray-200">Active Jobs</h3>
            </div>
            <p className="text-3xl font-bold text-orange-400">{stats.activeJobs}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <h3 className="text-lg font-medium text-gray-200">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-green-400">{stats.completedJobs}</p>
          </div>
          
          <div className="bg-gray-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpTrayIcon className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-medium text-gray-200">Downloaded</h3>
            </div>
            <p className="text-3xl font-bold text-purple-400">{stats.totalDownloaded}</p>
          </div>
        </div>
      </motion.div>

      {/* Status Counts Bar */}
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

      {/* Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between gap-2 mb-6"
      >
        <div className="flex gap-2">
          <button
            onClick={() => {
              fetchJobs();
              fetchStatusCounts();
              fetchStats();
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4 inline mr-2" />
            Refresh
          </button>
          <button
            onClick={() => {
              console.log('Current jobs state:', jobs);
              console.log('Active jobs:', jobs.filter(job => ['pending', 'crawling', 'downloading'].includes(job.status)));
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
          >
            Debug Jobs
          </button>
        </div>
        
        {selectedItems.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Delete ({selectedItems.length})
            </button>
            <button
              onClick={() => handleActionClick('pause')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
            >
              Pause ({selectedItems.length})
            </button>
            <button
              onClick={() => handleActionClick('resume')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Resume ({selectedItems.length})
            </button>
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
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search crawler jobs..."
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
            onClick={() => handleSort("name")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === "name"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Name
            {sortBy === "name" && (
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
          <button
            onClick={() => handleSort("status")}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              sortBy === "status"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Status
            {sortBy === "status" && (
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {types.map((type) => (
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
                    {topics.map((topic) => (
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
                    {channels.map((channel) => (
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

                {/* Site Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Site
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sites.map((site) => (
                      <button
                        key={site}
                        onClick={() => setSelectedSite(selectedSite === site ? null : site)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedSite === site
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
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
      </motion.div>

      {/* Jobs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Crawler Jobs</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading crawler jobs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <GlobeAltIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No crawler jobs found</p>
            <button
              onClick={() => setIsCreateDialogOpen(true)}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Create Your First Crawler
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === jobs.length && jobs.length > 0}
                      onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Keyword</th>
                  <th className="px-4 py-3 text-left">Site</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Progress</th>
                  <th className="px-4 py-3 text-left">Channel</th>
                  <th className="px-4 py-3 text-left">Topic</th>
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const StatusIcon = getStatusIcon(job.status);
                  const isSelected = selectedItems.includes(job.id);
                  
                  return (
                    <motion.tr
                      key={job.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`border-b border-gray-700 hover:bg-gray-700/30 transition-colors ${
                        isSelected ? 'bg-purple-600/20' : ''
                      } cursor-pointer`}
                      onClick={(e) => handleItemSelect(job.id, e)}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleCheckboxChange(job.id, e.target.checked, e)}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {job.type === 'image' ? (
                            <PhotoIcon className="w-5 h-5 text-blue-400" />
                          ) : (
                            <VideoCameraIcon className="w-5 h-5 text-red-400" />
                          )}
                          <span className="font-medium">{job.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{job.keyword}</td>
                      <td className="px-4 py-3 text-gray-300">{job.site}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.type === 'image' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {job.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${isActiveStatus(job.status) ? 'animate-pulse' : ''}`} />
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            statusColors[job.status]
                          } ${isActiveStatus(job.status) ? 'animate-pulse' : ''}`}>
                            {job.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-700 rounded-full h-2">
                            <div 
                              className={`${getProgressBarColor(job.status)} h-2 rounded-full transition-all duration-300`}
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-400">
                            {job.downloadedItems}/{job.totalItems}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{job.channel}</td>
                      <td className="px-4 py-3 text-gray-300">{job.topic}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDate(job.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {/* No longer needed as SSE handles updates */}
                          {job.status === 'pending' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick('start', job.id);
                              }}
                              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
                            >
                              Start
                            </button>
                          )}
                          {(job.status === 'crawling' || job.status === 'downloading') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick('pause', job.id);
                              }}
                              className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
                            >
                              Pause
                            </button>
                          )}
                          {job.status === 'paused' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick('resume', job.id);
                              }}
                              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
                            >
                              Resume
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick('delete', job.id);
                            }}
                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center items-center gap-2 mt-6"
        >
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg transition-colors"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg transition-colors"
          >
            Next
          </button>
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