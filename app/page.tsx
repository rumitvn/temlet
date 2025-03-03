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

  const handleDeleteJob = async (uid: string) => {
    try {
      const res = await fetch(`http://localhost:3000/api/v1/jobs/${uid}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Failed to delete job ${uid}`);
      }
      // refresh job list
      fetchJobs();
    } catch (error) {
      console.error(error);
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
