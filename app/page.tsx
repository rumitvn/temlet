"use client";

import { useEffect, useState, useCallback } from "react";

export default function Page() {
  // List state
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [filter, setFilter] = useState("");

  // Sorting state - default desc
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Detail state
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch function for reuse
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

  // Load job list on mount & set auto-refresh
  useEffect(() => {
    // Initial fetch
    fetchJobs();

    // Auto-refresh every 15s
    const interval = setInterval(() => {
      fetchJobs();
    }, 15000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [fetchJobs]);

  // When user selects a job, fetch detail
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

  // Filter jobs by `state`
  const filteredJobs = jobs.filter((job) =>
    filter ? job.state.toLowerCase().includes(filter.toLowerCase()) : true
  );

  // Sort jobs by `createdAt` (ascending or descending)
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  // Toggle sorting order
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Handle job deletion
  const handleDeleteJob = async (uid: string) => {
    // Optionally confirm:
    // if (!confirm(`Are you sure you want to delete job ${uid}?`)) return;

    try {
      const res = await fetch(`http://localhost:3000/api/v1/jobs/${uid}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Failed to delete job ${uid}`);
      }
      // After deletion, refresh the list or manually remove from state
      fetchJobs();
    } catch (error) {
      console.error(error);
    }
  };

  // Helper to get a job's "output" path
  // If job.output is blank, read from job.actions.postrender[0].output if available
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
      <h1>Nexrender Jobs</h1>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        {/* Filter input */}
        <div>
          <label htmlFor="filter">Filter by state:</label>
          <input
            id="filter"
            style={{ marginLeft: "0.5rem" }}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="e.g. finished, error"
          />
        </div>

        {/* Sort button */}
        <div>
          <button onClick={toggleSortOrder} style={styles.sortButton}>
            Sort by Created At ({sortOrder === "asc" ? "asc" : "desc"})
          </button>
        </div>

        {/* Create New Job button (example) */}
        <div>
          <button
            style={styles.createButton}
            onClick={() => window.open("http://localhost:3001/create_job", "_blank")}
          >
            Create New Job
          </button>
        </div>
      </div>

      {loadingJobs && <p>Loading job list...</p>}

      {!loadingJobs && sortedJobs.length === 0 && <p>No jobs found.</p>}

      {/* Job list table */}
      {!loadingJobs && sortedJobs.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>UID</th>
              <th style={styles.th}>Composition</th>
              <th style={styles.th}>State</th>
              <th style={styles.th}>Progress</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Output</th>
              <th style={styles.th} colSpan={2}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job) => {
              // Determine styling for state cell
              const stateStyle = {
                ...styles.td,
                backgroundColor:
                  job.state === "error"
                    ? "red"
                    : job.state === "finished"
                    ? "green"
                    : "inherit",
                color:
                  job.state === "error" || job.state === "finished"
                    ? "#fff"
                    : "inherit",
              };

              // Get the final output path
              const outputPath = getJobOutput(job);

              return (
                <tr key={job.uid}>
                  <td style={styles.td}>{job.uid}</td>
                  <td style={styles.td}>
                    {job.template?.composition || "-"}
                  </td>
                  <td style={stateStyle}>{job.state}</td>
                  <td style={styles.td}>
                    {/* Render progress bar */}
                    <progress
                      value={job.renderProgress}
                      max={100}
                      style={{ width: "80px" }}
                    />
                    &nbsp;{job.renderProgress}%
                  </td>
                  <td style={styles.td}>
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td style={styles.td}>{outputPath}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.detailButton}
                      onClick={() => setSelectedUid(job.uid)}
                    >
                      View Detail
                    </button>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.deleteButton}
                      onClick={() => handleDeleteJob(job.uid)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Detail section */}
      {selectedUid && (
        <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #aaa" }}>
          <h2>Job Detail for UID: {selectedUid}</h2>

          {loadingDetail && <p>Loading detail...</p>}

          {!loadingDetail && selectedJob && (
            <div>
              <p>
                <strong>State:</strong> {selectedJob.state}
              </p>
              <p>
                <strong>Render Progress:</strong>{" "}
                {selectedJob.renderProgress}%
              </p>
              <p>
                <strong>Template Source:</strong>{" "}
                {selectedJob.template?.src}
              </p>
              <p>
                <strong>Composition:</strong>{" "}
                {selectedJob.template?.composition}
              </p>
              <p>
                <strong>Created At:</strong>{" "}
                {new Date(selectedJob.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Started At:</strong>{" "}
                {selectedJob.startedAt
                  ? new Date(selectedJob.startedAt).toLocaleString()
                  : "-"}
              </p>
              <p>
                <strong>Finished At:</strong>{" "}
                {selectedJob.finishedAt
                  ? new Date(selectedJob.finishedAt).toLocaleString()
                  : "-"}
              </p>

              {/* Use the same fallback logic for output */}
              <p>
                <strong>Output:</strong> {getJobOutput(selectedJob)}
              </p>

              {selectedJob.error && (
                <p style={{ color: "red" }}>
                  <strong>Error:</strong> {selectedJob.error}
                </p>
              )}

              <h3>Assets</h3>
              {selectedJob.assets && selectedJob.assets.length > 0 ? (
                <ul>
                  {selectedJob.assets.map((asset: any, index: number) => (
                    <li key={index}>
                      <strong>Type:</strong> {asset.type},{" "}
                      <strong>Layer:</strong> {asset.layerName},{" "}
                      <strong>Property:</strong> {asset.property},{" "}
                      <strong>Value/Source:</strong>{" "}
                      {asset.value ? asset.value : asset.src}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No assets found.</p>
              )}

              <h3>Postrender Actions</h3>
              {selectedJob.actions?.postrender &&
              selectedJob.actions?.postrender.length > 0 ? (
                <ul>
                  {selectedJob.actions.postrender.map(
                    (action: any, idx: number) => (
                      <li key={idx}>
                        <p>
                          <strong>Module:</strong> {action.module}
                        </p>
                        <p>
                          <strong>Output:</strong> {action.output}
                        </p>
                        <p>
                          <strong>Use Job Id:</strong>{" "}
                          {action.useJobId ? "true" : "false"}
                        </p>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p>No postrender actions.</p>
              )}
            </div>
          )}

          <button
            onClick={() => {
              setSelectedUid(null);
              setSelectedJob(null);
            }}
            style={{ marginTop: "1rem" }}
          >
            Close Detail
          </button>
        </div>
      )}
    </div>
  );
}

/** Inline styling for demonstration */
const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    border: "1px solid #fff",
    padding: "8px",
    backgroundColor: "#222", // optional darker header
    color: "#fff",
    textAlign: "left" as const,
  },
  td: {
    border: "1px solid #fff",
    padding: "8px",
  },
  detailButton: {
    backgroundColor: "#0275d8",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 500,
  },
  deleteButton: {
    backgroundColor: "#d9534f",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 500,
  },
  sortButton: {
    backgroundColor: "#5cb85c",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 500,
  },
  createButton: {
    backgroundColor: "#f0ad4e",
    color: "#fff",
    padding: "6px 12px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 500,
  },
};
