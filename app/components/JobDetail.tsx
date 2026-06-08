"use client";
import React from "react";
import { Badge, Button, Card } from "@/app/components/ui";

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
    <Card className="mt-8 p-4">
      <h2 className="text-lg font-semibold text-text">Job Detail for UID: {uid}</h2>

      {loading && <p className="mt-2 text-text-muted">Loading detail...</p>}

      {!loading && job && (
        <div className="mt-2 space-y-1 text-text">
          <p>
            <strong>State:</strong> <Badge status={job.state}>{job.state}</Badge>
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
            <p className="text-danger">
              <strong>Error:</strong> {job.error}
            </p>
          )}

          <h3 className="mt-4 text-base font-semibold text-text">Assets</h3>
          {job.assets && job.assets.length > 0 ? (
            <ul className="list-disc pl-5 text-text">
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
            <p className="text-text-muted">No assets found.</p>
          )}

          <h3 className="mt-4 text-base font-semibold text-text">Postrender Actions</h3>
          {job.actions?.postrender && job.actions?.postrender.length > 0 ? (
            <ul className="list-disc pl-5 text-text">
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
            <p className="text-text-muted">No postrender actions.</p>
          )}
        </div>
      )}

      <Button variant="secondary" onClick={onClose} className="mt-4">
        Close Detail
      </Button>
    </Card>
  );
}
