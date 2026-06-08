"use client";
import React from "react";
import {
  Badge,
  Button,
  Input,
  Label,
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "./ui";

type Job = {
  uid: string;
  state: string;
  output?: string;
  renderProgress?: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  template?: { composition?: string };
  actions?: { postrender?: Array<{ output?: string }> };
};

type JobTableProps = {
  jobs: Job[];
  loading: boolean;
  filter: string;
  setFilter: (val: string) => void;
  sortOrder: "asc" | "desc";
  toggleSortOrder: () => void;
  onSelectJob: (uid: string) => void;
  onDeleteJob: (uid: string) => void;
};

const RENDER_BASE_URL = "http://localhost:3001";

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
    filter ? job.state.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  // Sorting by createdAt
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });

  // Helper: if job.output is blank, read from first postrender action
  const getJobOutput = (job: Job): string => {
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
  const getRenderDuration = (job: Job): string => {
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
      <h2 className="mb-4 text-xl font-semibold text-text">All Jobs</h2>

      {/* Filter, Sort, Create New Job controls */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        {/* Filter input */}
        <div>
          <Label htmlFor="filter" className="mb-1">
            Filter by state:
          </Label>
          <Input
            id="filter"
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="e.g. finished, error"
            className="w-56"
          />
        </div>

        {/* Sort button */}
        <Button variant="secondary" onClick={toggleSortOrder}>
          Sort by Created At ({sortOrder})
        </Button>

        {/* Create New Job buttons */}
        <Button
          variant="primary"
          onClick={() =>
            window.open(`${RENDER_BASE_URL}/render_reward_image`, "_blank")
          }
        >
          Render Reward Image
        </Button>
        <Button
          variant="primary"
          onClick={() =>
            window.open(`${RENDER_BASE_URL}/render_quiz_animals`, "_blank")
          }
        >
          Render Quiz Animals
        </Button>
      </div>

      {/* Loading or empty */}
      {loading && <p className="text-text-muted">Loading job list...</p>}
      {!loading && sortedJobs.length === 0 && (
        <p className="text-text-muted">No jobs found.</p>
      )}

      {/* Table */}
      {!loading && sortedJobs.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>UID</TH>
              <TH>Composition</TH>
              <TH>State</TH>
              <TH>Progress</TH>
              <TH>Duration</TH>
              <TH>Created</TH>
              <TH>Output</TH>
              <TH colSpan={2}>Action</TH>
            </TR>
          </THead>
          <TBody>
            {sortedJobs.map((job) => {
              const outputPath = getJobOutput(job);
              const durationStr = getRenderDuration(job);

              return (
                <TR key={job.uid}>
                  <TD className="font-mono text-text-muted">{job.uid}</TD>
                  <TD>{job.template?.composition || "-"}</TD>
                  <TD>
                    <Badge status={job.state}>{job.state}</Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <progress
                        value={job.renderProgress}
                        max={100}
                        className="h-2 w-20 overflow-hidden rounded-full"
                      />
                      <span className="text-text-muted">
                        {job.renderProgress}%
                      </span>
                    </div>
                  </TD>
                  <TD>{durationStr}</TD>
                  <TD className="text-text-muted">
                    {new Date(job.createdAt).toLocaleString()}
                  </TD>
                  <TD className="max-w-xs truncate text-text-muted">
                    {outputPath}
                  </TD>
                  <TD>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSelectJob(job.uid)}
                    >
                      View Detail
                    </Button>
                  </TD>
                  <TD>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => onDeleteJob(job.uid)}
                    >
                      Delete
                    </Button>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
