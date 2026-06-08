import { useCallback, useEffect, useState } from "react";
import { logger } from "@/app/lib/logger";
import type {
  CrawlerJob,
  CrawlerStats,
  CrawlerStatus,
  SSEEvent,
  SSEJobUpdate,
} from "./types";

export interface CrawlerDataParams {
  currentPage: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
  itemsPerPage: number;
  debouncedSearchQuery: string;
  selectedType: string | null;
  selectedTopic: string | null;
  selectedChannel: string | null;
  selectedSite: string | null;
  selectedStatus: string | null;
}

const EMPTY_STATS: CrawlerStats = {
  totalJobs: 0,
  activeJobs: 0,
  completedJobs: 0,
  failedJobs: 0,
  totalDownloaded: 0,
  totalFailed: 0,
  averageSpeed: 0,
};

/**
 * Owns all crawler job data: list fetching, live SSE monitoring, status
 * polling, aggregate stats, and status counts. The page provides the active
 * filter/pagination params and consumes the resulting data plus refetchers.
 */
export function useCrawlerData(params: CrawlerDataParams) {
  const {
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
  } = params;

  const [jobs, setJobs] = useState<CrawlerJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<
    Partial<Record<CrawlerStatus, number>>
  >({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [stats, setStats] = useState<CrawlerStats>(EMPTY_STATS);

  // SSE monitoring for real-time updates
  const [sseConnections, setSseConnections] = useState<
    Map<string, EventSource>
  >(new Map());

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        sortBy,
        sortOrder,
        limit: itemsPerPage.toString(),
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
        throw new Error("Failed to fetch crawler jobs");
      }
      const data = await response.json();
      logger.debug("Fetched jobs data:", data.jobs); // Log fetched jobs
      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      logger.error("Error fetching jobs:", error);
      setError("Failed to load crawler jobs");
    } finally {
      setLoading(false);
    }
  }, [
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
  ]);

  const fetchStatusCounts = useCallback(async () => {
    try {
      setLoadingCounts(true);
      const response = await fetch("/api/crawlers/status-counts");
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

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/crawlers/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      logger.error("Error fetching stats:", error);
    }
  }, []);

  // Add a polling mechanism to ensure job status stays in sync
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/crawlers/${jobId}/status`); // Update endpoint to match your API
        if (!response.ok) {
          if (response.status === 404) {
            logger.debug(`Job ${jobId} not found, stopping polling`);
            return; // Stop polling if job doesn't exist
          }
          throw new Error(`Failed to fetch job status: ${response.statusText}`);
        }
        const jobData = await response.json();

        logger.debug(`Polled status for job ${jobId}:`, jobData);

        // Update only this specific job in state
        setJobs((prevJobs) => {
          const jobIndex = prevJobs.findIndex((j) => j.id === jobId);
          if (jobIndex === -1) return prevJobs; // Job not in list

          const updatedJobs = [...prevJobs];
          updatedJobs[jobIndex] = {
            ...prevJobs[jobIndex],
            ...jobData,
            // Ensure we keep the type field
            type: jobData.type || prevJobs[jobIndex].type,
          };
          return updatedJobs;
        });

        // If job is still active, schedule next poll
        if (["pending", "crawling", "downloading"].includes(jobData.status)) {
          setTimeout(() => pollJobStatus(jobId), 5000); // Poll every 5 seconds
        } else {
          // Job is complete/failed, only update counts
          Promise.all([fetchStatusCounts(), fetchStats()]).catch((error) =>
            logger.error("Error updating counts:", error),
          );
        }
      } catch (error) {
        logger.error(`Error polling job ${jobId}:`, error);
        // Schedule next poll even on error, but with a longer delay
        setTimeout(() => pollJobStatus(jobId), 10000); // Retry after 10 seconds
      }
    },
    [fetchStatusCounts, fetchStats],
  ); // Remove fetchJobs from dependencies

  // Function to update a single job's data
  const updateJobInState = useCallback(
    (jobId: string, jobData: Partial<CrawlerJob>) => {
      setJobs((prevJobs) => {
        const jobIndex = prevJobs.findIndex((j) => j.id === jobId);
        if (jobIndex === -1) return prevJobs; // Job not in list

        const updatedJobs = [...prevJobs];
        updatedJobs[jobIndex] = {
          ...prevJobs[jobIndex],
          ...jobData,
          // Ensure we keep the type field
          type: jobData.type || prevJobs[jobIndex].type,
        };
        return updatedJobs;
      });
    },
    [],
  );

  // Function to start monitoring a specific job
  const startJobMonitoring = useCallback(
    (jobId: string) => {
      // Close existing connection if any
      const existingConnection = sseConnections.get(jobId);
      if (existingConnection) {
        existingConnection.close();
      }

      logger.debug(`Starting new SSE connection for job ${jobId}`);

      // Create new SSE connection
      const eventSource = new EventSource(
        `/api/crawlers/stream?jobId=${jobId}`,
      );

      // Handle connection open
      eventSource.onopen = () => {
        logger.debug(`SSE connection opened for job ${jobId}`);
        // Start polling as backup
        pollJobStatus(jobId);
      };

      eventSource.onmessage = (event: SSEEvent) => {
        try {
          const data = JSON.parse(event.data) as SSEJobUpdate;
          logger.debug(`SSE update received for job ${jobId}:`, {
            type: data.type,
            jobData: data.job,
            rawData: data,
          });

          if (data.type === "job_update" && data.job) {
            // Update the specific job in the UI immediately
            updateJobInState(jobId, data.job);

            // If job is completed or failed, clean up
            if (
              data.job.status === "completed" ||
              data.job.status === "failed"
            ) {
              logger.debug(
                `Job ${jobId} finished with status ${data.job.status}, closing connection`,
              );
              eventSource.close();
              setSseConnections((prev) => {
                const newMap = new Map(prev);
                newMap.delete(jobId);
                return newMap;
              });

              // Only update counts, not full job list
              Promise.all([fetchStatusCounts(), fetchStats()]).catch((error) =>
                logger.error("Error updating counts:", error),
              );
            }
          }
        } catch (error) {
          logger.error("Error parsing SSE data:", error);
          logger.error("Raw event data:", event.data);
        }
      };

      eventSource.onerror = (error: Event) => {
        logger.error(`SSE connection error for job ${jobId}:`, error);

        // Only close on real errors, not disconnects
        if ((error.target as EventSource)?.readyState === EventSource.CLOSED) {
          logger.debug(`SSE connection closed for job ${jobId}`);
          eventSource.close();
          setSseConnections((prev) => {
            const newMap = new Map(prev);
            newMap.delete(jobId);
            return newMap;
          });

          // Start polling as backup
          pollJobStatus(jobId);
        }
      };

      // Store the connection
      setSseConnections((prev) => new Map(prev).set(jobId, eventSource));
    },
    [updateJobInState, fetchStatusCounts, fetchStats, pollJobStatus],
  ); // Remove fetchJobs from dependencies

  // Monitor active jobs and start SSE connections
  useEffect(() => {
    // Get all jobs that should be monitored
    const jobsToMonitor = jobs.filter((job) =>
      ["pending", "crawling", "downloading"].includes(job.status),
    );

    logger.debug(
      "Jobs to monitor:",
      jobsToMonitor.map((j) => ({ id: j.id, status: j.status })),
    );

    // Start monitoring for each job that needs it
    jobsToMonitor.forEach((job) => {
      if (!sseConnections.has(job.id)) {
        logger.debug(
          `Starting SSE monitoring for job ${job.id} (status: ${job.status})`,
        );
        startJobMonitoring(job.id);
      }
    });

    // Only clean up connections for jobs that are definitely done
    Array.from(sseConnections.keys()).forEach((jobId) => {
      const job = jobs.find((j) => j.id === jobId);
      if (job && ["completed", "failed"].includes(job.status)) {
        logger.debug(
          `Closing SSE connection for completed/failed job ${jobId} (status: ${job.status})`,
        );
        const connection = sseConnections.get(jobId);
        if (connection) {
          connection.close();
          setSseConnections((prev) => {
            const newMap = new Map(prev);
            newMap.delete(jobId);
            return newMap;
          });
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (document.visibilityState === "hidden") {
        logger.debug("Page is being unloaded, cleaning up all SSE connections");
        sseConnections.forEach((eventSource, jobId) => {
          logger.debug(`Cleaning up SSE connection for job ${jobId}`);
          eventSource.close();
        });
      }
    };
  }, [jobs, sseConnections, startJobMonitoring]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    fetchStatusCounts();
    fetchStats();
  }, [fetchStatusCounts, fetchStats]);

  return {
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
  };
}
