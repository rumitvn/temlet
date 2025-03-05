"use client";
import React from "react";

type JobTableProps = {
  jobs: any[];                     // array of job objects
  loading: boolean;               // are we loading the jobs?
  filter: string;                 // current filter value
  setFilter: (val: string) => void; 
  sortOrder: "asc" | "desc";
  toggleSortOrder: () => void;
  onSelectJob: (uid: string) => void;  // user clicks "View Detail"
  onDeleteJob: (uid: string) => void;  // user clicks "Delete"
};

export default function JobTable({
  jobs,
  loading,
  filter,
  setFilter,
  sortOrder,
  toggleSortOrder,
  onSelectJob,
  onDeleteJob,
}: JobTableProps) {
  // Filtering
  const filteredJobs = jobs.filter((job) =>
    filter ? job.state.toLowerCase().includes(filter.toLowerCase()) : true
  );

  // Sorting by createdAt
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  // Helper: if job.output is blank, read from first postrender action
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

  // Duration helper
  const getRenderDuration = (job: any): string => {
    if (!job.startedAt || !job.finishedAt) return "-";
    const startMs = new Date(job.startedAt).getTime();
    const finishMs = new Date(job.finishedAt).getTime();
    const diffMs = finishMs - startMs;
    if (diffMs <= 0) return "-";

    const totalSec = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const secStr = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutes}m${secStr}s`;
  };

  return (
    <div>
      <h2>All Jobs</h2>

      {/* Filter, Sort, Create New Job controls */}
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
            Sort by Created At ({sortOrder})
          </button>
        </div>

        {/* Create New Job button */}
        <div>
          <button
            style={styles.createButton}
            onClick={() => window.open("http://localhost:3001/render_reward_image", "_blank")}
          >
            Render Reward Image
          </button>
        </div>

        <div>
          <button
            style={styles.createButton}
            onClick={() => window.open("http://localhost:3001/render_quiz_animals", "_blank")}
          >
            Render Quiz Animals
          </button>
        </div>
      </div>

      {/* Loading or empty */}
      {loading && <p>Loading job list...</p>}
      {!loading && sortedJobs.length === 0 && <p>No jobs found.</p>}

      {/* Table */}
      {!loading && sortedJobs.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>UID</th>
              <th style={styles.th}>Composition</th>
              <th style={styles.th}>State</th>
              <th style={styles.th}>Progress</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Created</th>
              <th style={styles.th}>Output</th>
              <th style={styles.th} colSpan={2}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job) => {
              // Conditional background color for error/finished
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

              const outputPath = getJobOutput(job);
              const durationStr = getRenderDuration(job);

              return (
                <tr key={job.uid}>
                  <td style={styles.td}>{job.uid}</td>
                  <td style={styles.td}>{job.template?.composition || "-"}</td>
                  <td style={stateStyle}>{job.state}</td>
                  <td style={styles.td}>
                    <progress
                      value={job.renderProgress}
                      max={100}
                      style={{ width: "80px" }}
                    />
                    &nbsp;{job.renderProgress}%
                  </td>
                  <td style={styles.td}>{durationStr}</td>
                  <td style={styles.td}>
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td style={styles.td}>{outputPath}</td>
                  <td style={styles.td}>
                    <button
                      style={styles.detailButton}
                      onClick={() => onSelectJob(job.uid)}
                    >
                      View Detail
                    </button>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.deleteButton}
                      onClick={() => onDeleteJob(job.uid)}
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
    </div>
  );
}

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },
  th: {
    border: "1px solid #fff",
    padding: "8px",
    backgroundColor: "#222",
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
