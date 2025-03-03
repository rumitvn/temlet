"use client";
import React from "react";

type JobDetailProps = {
  uid: string;          // the job UID
  job: any;             // the selected job's full data
  loading: boolean;     // are we loading the detail?
  onClose: () => void;  // callback for closing the detail panel
  getJobOutput: (job: any) => string; // to reuse the same fallback logic
};

export default function JobDetail({
  uid,
  job,
  loading,
  onClose,
  getJobOutput,
}: JobDetailProps) {
  if (!uid) {
    return null;
  }

  return (
    <div style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #aaa" }}>
      <h2>Job Detail for UID: {uid}</h2>

      {loading && <p>Loading detail...</p>}

      {!loading && job && (
        <div>
          <p>
            <strong>State:</strong> {job.state}
          </p>
          <p>
            <strong>Render Progress:</strong> {job.renderProgress}%
          </p>
          <p>
            <strong>Template Source:</strong> {job.template?.src}
          </p>
          <p>
            <strong>Composition:</strong> {job.template?.composition}
          </p>
          <p>
            <strong>Created At:</strong>{" "}
            {new Date(job.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Started At:</strong>{" "}
            {job.startedAt
              ? new Date(job.startedAt).toLocaleString()
              : "-"}
          </p>
          <p>
            <strong>Finished At:</strong>{" "}
            {job.finishedAt
              ? new Date(job.finishedAt).toLocaleString()
              : "-"}
          </p>
          <p>
            <strong>Output:</strong> {getJobOutput(job)}
          </p>

          {job.error && (
            <p style={{ color: "red" }}>
              <strong>Error:</strong> {job.error}
            </p>
          )}

          <h3>Assets</h3>
          {job.assets && job.assets.length > 0 ? (
            <ul>
              {job.assets.map((asset: any, index: number) => (
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
          {job.actions?.postrender && job.actions?.postrender.length > 0 ? (
            <ul>
              {job.actions.postrender.map((action: any, idx: number) => (
                <li key={idx}>
                  <p>
                    <strong>Module:</strong> {action.module}
                  </p>
                  <p>
                    <strong>Output:</strong> {action.output}
                  </p>
                  <p>
                    <strong>Use Job Id:</strong> {action.useJobId ? "true" : "false"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No postrender actions.</p>
          )}
        </div>
      )}

      <button onClick={onClose} style={{ marginTop: "1rem" }}>
        Close Detail
      </button>
    </div>
  );
}
