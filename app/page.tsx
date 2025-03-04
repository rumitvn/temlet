"use client";

import { useEffect, useState, useCallback } from "react";
import JobTable from "./components/JobTable";
import JobDetail from "./components/JobDetail";

export default function Page() {
  // List state
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Filtering, Sorting
  const [filter, setFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Detail state
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // -----------------------------
  // Fetching All Jobs
  // -----------------------------
  const fetchJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const res = await fetch("http://localhost:3000/api/v1/jobs");
      if (!res.ok) {
        throw new Error("Failed to fetch jobs");
      }
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchJobs();

    // Auto-refresh every 15s
    const interval = setInterval(() => {
      fetchJobs();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchJobs]);

  // -----------------------------
  // Fetching Detail
  // -----------------------------
  useEffect(() => {
    if (!selectedUid) {
      setSelectedJob(null);
      return;
    }

    async function fetchJobDetail(uid: string) {
      try {
        setLoadingDetail(true);
        const res = await fetch(`http://localhost:3000/api/v1/jobs/${uid}`);
        if (!res.ok) {
          throw new Error("Failed to fetch job detail");
        }
        const data = await res.json();
        setSelectedJob(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    }

    fetchJobDetail(selectedUid);
  }, [selectedUid]);

  // -----------------------------
  // Handlers
  // -----------------------------
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Delete one job
  const handleDeleteJob = async (uid: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/jobs/${uid}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Failed to delete job ${uid}`);
      }
      // Refresh job list
      fetchJobs();
    } catch (error) {
      console.error(error);
    }
  };

  // Delete all jobs
  const handleDeleteAllJobs = async () => {
    if (jobs.length === 0) {
      alert("No jobs to delete.");
      return;
    }
    // Optional confirmation
    if (!confirm(`Are you sure you want to delete all ${jobs.length} jobs?`)) {
      return;
    }

    try {
      // Fire off all deletion requests in parallel
      await Promise.all(
        jobs.map((job) =>
          fetch(`http://localhost:3000/api/v1/jobs/${job.uid}`, {
            method: "DELETE",
          })
        )
      );
      // Refresh the list
      fetchJobs();
    } catch (error) {
      console.error("Error deleting all jobs:", error);
    }
  };

  // Reuse the fallback logic for output
  const getJobOutput = (job: any): string => {
    const directOutput = (job.output || "").trim();
    if (directOutput) return directOutput;

    const postrender = job.actions?.postrender;
    if (Array.isArray(postrender) && postrender.length > 0) {
      const maybeOutput = (postrender[0].output || "").trim();
      return maybeOutput || "-";
    }
    return "-";
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Auto Render AE Tools - made by rumitx</h1>

      {/* "Delete All" button */}
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={handleDeleteAllJobs} style={styles.deleteAllButton}>
          Delete All Jobs
        </button>
      </div>

      {/* Job Table */}
      <JobTable
        jobs={jobs}
        loading={loadingJobs}
        filter={filter}
        setFilter={setFilter}
        sortOrder={sortOrder}
        toggleSortOrder={toggleSortOrder}
        onSelectJob={(uid) => setSelectedUid(uid)}
        onDeleteJob={handleDeleteJob}
      />

      {/* Job Detail */}
      {selectedUid && (
        <JobDetail
          uid={selectedUid}
          job={selectedJob}
          loading={loadingDetail}
          onClose={() => {
            setSelectedUid(null);
            setSelectedJob(null);
          }}
          getJobOutput={getJobOutput}
        />
      )}
    </div>
  );
}

const styles = {
  deleteAllButton: {
    backgroundColor: "red",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 500,
  },
};
