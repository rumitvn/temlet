import { motion } from "framer-motion";
import {
  GlobeAltIcon,
  PhotoIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/solid";
import {
  Button,
  Badge,
  Table,
  THead,
  TBody,
  TD,
  TH,
} from "@/app/components/ui";
import {
  getStatusIcon,
  isActiveStatus,
  getProgressBarColor,
  formatDate,
} from "../constants";
import type { CrawlerJob } from "../types";

interface CrawlerJobsTableProps {
  jobs: CrawlerJob[];
  loading: boolean;
  error: string | null;
  selectedItems: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onItemSelect: (itemId: string, event: React.MouseEvent) => void;
  onCheckboxChange: (
    itemId: string,
    checked: boolean,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onActionClick: (action: string, jobId?: string) => void;
  onCreateClick: () => void;
}

export default function CrawlerJobsTable({
  jobs,
  loading,
  error,
  selectedItems,
  onSelectAll,
  onDeselectAll,
  onItemSelect,
  onCheckboxChange,
  onActionClick,
  onCreateClick,
}: CrawlerJobsTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl overflow-hidden shadow-card"
    >
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-text">Crawler Jobs</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onSelectAll}>
              Select All
            </Button>
            <Button variant="secondary" size="sm" onClick={onDeselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p className="mt-2 text-text-muted">Loading crawler jobs...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-danger">{error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-8 text-center">
          <GlobeAltIcon className="w-12 h-12 text-text-faint mx-auto mb-4" />
          <p className="text-text-muted">No crawler jobs found</p>
          <Button variant="primary" className="mt-4" onClick={onCreateClick}>
            Create Your First Crawler
          </Button>
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>
                <input
                  type="checkbox"
                  checked={
                    selectedItems.length === jobs.length && jobs.length > 0
                  }
                  onChange={(e) =>
                    e.target.checked ? onSelectAll() : onDeselectAll()
                  }
                  className="rounded border-border bg-surface-sunken accent-accent"
                />
              </TH>
              <TH>Name</TH>
              <TH>Keyword</TH>
              <TH>Site</TH>
              <TH>Type</TH>
              <TH>Status</TH>
              <TH>Progress</TH>
              <TH>Channel</TH>
              <TH>Topic</TH>
              <TH>Created</TH>
              <TH>Actions</TH>
            </tr>
          </THead>
          <TBody>
            {jobs.map((job) => {
              const StatusIcon = getStatusIcon(job.status);
              const isSelected = selectedItems.includes(job.id);

              return (
                <motion.tr
                  key={job.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`border-b border-border hover:bg-surface-raised/50 transition-colors ${
                    isSelected ? "bg-accent-muted" : ""
                  } cursor-pointer`}
                  onClick={(e) => onItemSelect(job.id, e)}
                >
                  <TD onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) =>
                        onCheckboxChange(job.id, e.target.checked, e)
                      }
                      className="rounded border-border bg-surface-sunken accent-accent"
                    />
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      {job.type === "image" ? (
                        <PhotoIcon className="w-5 h-5 text-info" />
                      ) : (
                        <VideoCameraIcon className="w-5 h-5 text-danger" />
                      )}
                      <span className="font-medium">{job.name}</span>
                    </div>
                  </TD>
                  <TD className="text-text-muted">{job.keyword}</TD>
                  <TD className="text-text-muted">{job.site}</TD>
                  <TD>
                    <Badge
                      tone={
                        job.type === "image"
                          ? "info"
                          : job.type === "video"
                            ? "danger"
                            : "neutral"
                      }
                      className="text-xs"
                    >
                      {job.type === "image"
                        ? "Image"
                        : job.type === "video"
                          ? "Video"
                          : "Unknown"}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <StatusIcon
                        className={`w-4 h-4 ${isActiveStatus(job.status) ? "animate-pulse" : ""}`}
                      />
                      <Badge
                        status={job.status}
                        className={`text-xs ${isActiveStatus(job.status) ? "animate-pulse" : ""}`}
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-surface-sunken rounded-full h-2">
                        <div
                          className={`${getProgressBarColor(job.status)} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-text-muted">
                        {job.downloadedItems}/{job.totalItems}
                      </span>
                    </div>
                  </TD>
                  <TD className="text-text-muted">{job.channel}</TD>
                  <TD className="text-text-muted">{job.topic}</TD>
                  <TD className="text-text-muted">{formatDate(job.createdAt)}</TD>
                  <TD>
                    <div className="flex gap-2">
                      {/* No longer needed as SSE handles updates */}
                      {job.status === "pending" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionClick("start", job.id);
                          }}
                        >
                          Start
                        </Button>
                      )}
                      {(job.status === "crawling" ||
                        job.status === "downloading") && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionClick("pause", job.id);
                          }}
                        >
                          Pause
                        </Button>
                      )}
                      {job.status === "paused" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionClick("resume", job.id);
                          }}
                        >
                          Resume
                        </Button>
                      )}
                      {job.status === "failed" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onActionClick("start", job.id);
                          }}
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionClick("delete", job.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </motion.tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </motion.div>
  );
}
