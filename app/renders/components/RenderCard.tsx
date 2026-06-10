import { motion } from "framer-motion";
import { CheckCircleIcon, FolderOpenIcon } from "@heroicons/react/24/solid";
import { Button, Badge } from "@/app/components/ui";
import { useIsDesktop } from "@/app/hooks/useIsDesktop";
import { revealPath } from "@/app/lib/desktop";
import { formatDate } from "../utils";
import type { RenderItem } from "../../types/render";

const RENDERED_STATUSES = [
  "rendered",
  "pending_metadata",
  "processing_metadata",
  "processed_metadata",
  "pending_upload",
  "processing_upload",
  "uploaded",
  "declined",
  "approved",
];

const METADATA_DONE_STATUSES = [
  "processed_metadata",
  "pending_upload",
  "processing_upload",
  "uploaded",
  "declined",
  "approved",
];

const UPLOAD_DONE_STATUSES = ["uploaded", "declined", "approved"];

interface RenderCardProps {
  item: RenderItem;
  isSelected: boolean;
  onSelect: (itemId: string, event: React.MouseEvent) => void;
  onRender: (item: RenderItem) => void;
  onMetadata: (item: RenderItem) => void;
  onRenderDetails: (item: RenderItem) => void;
  onMetadataDetails: (item: RenderItem) => void;
  onRequestSingleUpload: (item: RenderItem, type: "youtube" | "tiktok") => void;
}

export default function RenderCard({
  item,
  isSelected,
  onSelect,
  onRender,
  onMetadata,
  onRenderDetails,
  onMetadataDetails,
  onRequestSingleUpload,
}: RenderCardProps) {
  const desktop = useIsDesktop();
  const localVideoPath =
    item.mp4Link && !/^https?:/i.test(item.mp4Link) ? item.mp4Link : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-surface border border-border shadow-card rounded-lg p-6 space-y-4 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-accent-ring" : ""
      }`}
      onClick={(e) => onSelect(item.id, e)}
    >
      {/* Row 1: Type, Channel, Created */}
      <div className="flex justify-between items-center">
        <span className="text-accent font-medium">{item.type}</span>
        <span className="text-text-muted">{item.channelName}</span>
        <span className="text-text-faint text-sm">
          {formatDate(item.createdAt)}
        </span>
      </div>

      {/* Row 2: File Name and Status */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{item.fileName}</h3>
        <Badge status={item.status}>{item.status}</Badge>
      </div>

      {/* Row 3: Render Zone */}
      <div
        className={`rounded-lg p-4 ${
          RENDERED_STATUSES.includes(item.status)
            ? "bg-success-bg border border-success/30"
            : "bg-surface-sunken"
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text-muted">Render</h4>
            {RENDERED_STATUSES.includes(item.status) && (
              <CheckCircleIcon className="w-4 h-4 text-success" />
            )}
          </div>
          <button
            className="text-accent hover:text-accent-hover"
            onClick={(e) => {
              e.stopPropagation();
              onRenderDetails(item);
            }}
          >
            View Details
          </button>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-text-muted">{item.nexrenderUid}</span>
          <span className="text-text-faint">
            {item.renderTime ? formatDate(item.renderTime) : "-"}
          </span>
        </div>
        {item.status === "rendering" && item.renderProgress !== undefined && (
          <div className="mt-2">
            <div className="w-full bg-surface-raised rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-500"
                style={{ width: `${item.renderProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-text-muted mt-1 text-right">
              {item.renderProgress}%
            </p>
          </div>
        )}
        {item.status === "new" && (
          <button
            className="mt-2 w-full px-3 py-1 text-sm bg-accent hover:bg-accent-hover text-accent-fg rounded"
            onClick={(e) => {
              e.stopPropagation();
              onRender(item);
            }}
          >
            Start Render
          </button>
        )}
        {RENDERED_STATUSES.includes(item.status) && (
          <div className="mt-2 flex gap-2">
            <button
              className="flex-1 px-3 py-1 text-sm bg-success-bg text-success hover:bg-success-bg/80 rounded flex items-center justify-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                // Open the video file in a new tab (restore old behavior)
                if (item.mp4Link) {
                  window.open(item.mp4Link, "_blank");
                } else {
                  window.open(`/api/renders/${item.id}/video`, "_blank");
                }
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Open Video
            </button>
            {/* Desktop-only: reveal the rendered file in Finder / Explorer. */}
            {desktop && localVideoPath && (
              <button
                title="Reveal in file manager"
                className="px-3 py-1 text-sm bg-surface-raised text-text-muted hover:text-text rounded flex items-center justify-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  void revealPath(localVideoPath);
                }}
              >
                <FolderOpenIcon className="h-4 w-4" />
                Reveal
              </button>
            )}
          </div>
        )}
      </div>

      {/* Row 4: Metadata Zone */}
      <div
        className={`rounded-lg p-4 ${
          METADATA_DONE_STATUSES.includes(item.status)
            ? item.status === "processed_metadata"
              ? "bg-info-bg border border-info/30"
              : "bg-success-bg border border-success/30"
            : "bg-surface-sunken"
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text-muted">Metadata</h4>
            {METADATA_DONE_STATUSES.includes(item.status) && (
              <CheckCircleIcon className="w-4 h-4 text-info" />
            )}
          </div>
          <button
            className="text-accent hover:text-accent-hover"
            onClick={(e) => {
              e.stopPropagation();
              onMetadataDetails(item);
            }}
          >
            View Details
          </button>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          {item.youtubeMetadata ? (
            <>
              <span className="text-text-muted truncate">
                {item.youtubeMetadata.title}
              </span>
              <span className="text-text-muted truncate">
                {item.youtubeMetadata.description}
              </span>
            </>
          ) : (
            <span className="text-text-faint">No metadata generated</span>
          )}
          <span className="text-text-faint">
            {item.metadataTime ? formatDate(item.metadataTime) : "-"}
          </span>
        </div>
        {item.status === "rendered" && (
          <button
            className="mt-2 w-full px-3 py-1 text-sm bg-accent hover:bg-accent-hover text-accent-fg rounded"
            onClick={(e) => {
              e.stopPropagation();
              onMetadata(item);
            }}
          >
            Generate Metadata
          </button>
        )}
        {(item.status === "pending_metadata" ||
          item.status === "processing_metadata") && (
          <div className="mt-2">
            <div className="w-full bg-surface-raised rounded-full h-2 overflow-hidden">
              <div
                className="bg-progress h-2 rounded-full transition-all duration-500 animate-[loading_2s_ease-in-out_infinite]"
                style={{
                  width: "100%",
                  transform: "translateX(-100%)",
                }}
              ></div>
            </div>
            <p className="text-sm text-text-muted mt-1 text-right">
              {item.status === "pending_metadata" ? "Pending..." : "Processing..."}
            </p>
          </div>
        )}
      </div>

      {/* Row 5: Upload Zone */}
      <div
        className={`rounded-lg p-4 ${
          UPLOAD_DONE_STATUSES.includes(item.status)
            ? "bg-success-bg border border-success/30"
            : "bg-surface-sunken"
        }`}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text-muted">Upload</h4>
            {UPLOAD_DONE_STATUSES.includes(item.status) && (
              <CheckCircleIcon className="w-4 h-4 text-success" />
            )}
          </div>
          <button
            className="text-accent hover:text-accent-hover"
            onClick={(e) => {
              e.stopPropagation();
              if (item.youtubeLink) {
                window.open(item.youtubeLink, "_blank");
              }
            }}
          >
            View Details
          </button>
        </div>
        <div className="flex flex-col gap-1 text-sm">
          {item.youtubeLink && (
            <div className="flex items-center gap-2">
              <span className="text-danger text-xs">YouTube:</span>
              <a
                href={item.youtubeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline break-all text-xs"
              >
                {item.youtubeLink}
              </a>
            </div>
          )}
          {item.tiktokLink && (
            <div className="flex items-center gap-2">
              <span className="text-text bg-surface-raised border border-border px-1 rounded text-xs">
                TikTok:
              </span>
              <a
                href={item.tiktokLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline break-all text-xs"
              >
                {item.tiktokLink}
              </a>
            </div>
          )}
          {!item.youtubeLink && !item.tiktokLink && (
            <span className="text-text-muted">-</span>
          )}
          <span className="text-text-faint">
            {item.uploadTime ? formatDate(item.uploadTime) : "-"}
          </span>
        </div>
        {item.status === "processed_metadata" && (
          <div className="mt-2 space-y-2">
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              leftIcon={
                <svg height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
                  <path d="M23.498 6.186a2.994 2.994 0 0 0-2.112-2.12C19.228 3.5 12 3.5 12 3.5s-7.228 0-9.386.566A2.994 2.994 0 0 0 .502 6.186C0 8.344 0 12 0 12s0 3.656.502 5.814a2.994 2.994 0 0 0 2.112 2.12C4.772 20.5 12 20.5 12 20.5s7.228 0 9.386-.566a2.994 2.994 0 0 0 2.112-2.12C24 15.656 24 12 24 12s0-3.656-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              }
              onClick={(e) => {
                e.stopPropagation();
                if (
                  !item.youtubeMetadata ||
                  !item.youtubeMetadata.title ||
                  !item.youtubeMetadata.title.trim()
                ) {
                  alert("Cannot upload: Missing or empty YouTube title.");
                  return;
                }
                if ([...item.youtubeMetadata.title].length > 100) {
                  alert(
                    "Cannot upload: YouTube title must be 100 characters or fewer. Current count: " +
                      [...item.youtubeMetadata.title].length,
                  );
                  return;
                }
                // Show scheduling dialog for single item
                onRequestSingleUpload(item, "youtube");
              }}
            >
              Upload to YouTube
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              leftIcon={
                <svg height="20" viewBox="0 0 24 24" width="20" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              }
              onClick={(e) => {
                e.stopPropagation();
                if (
                  !item.youtubeMetadata ||
                  !item.youtubeMetadata.title ||
                  !item.youtubeMetadata.title.trim()
                ) {
                  alert("Cannot upload: Missing or empty TikTok title.");
                  return;
                }
                if ([...item.youtubeMetadata.title].length > 150) {
                  alert(
                    "Cannot upload: TikTok title must be 150 characters or fewer. Current count: " +
                      [...item.youtubeMetadata.title].length,
                  );
                  return;
                }
                // Show scheduling dialog for single item
                onRequestSingleUpload(item, "tiktok");
              }}
            >
              Upload to TikTok
            </Button>
          </div>
        )}
        {(item.status === "pending_upload" ||
          item.status === "processing_upload") && (
          <div className="mt-2">
            <div className="w-full bg-surface-raised rounded-full h-2 overflow-hidden">
              <div
                className="bg-progress h-2 rounded-full transition-all duration-500 animate-[loading_2s_ease-in-out_infinite]"
                style={{
                  width: "100%",
                  transform: "translateX(-100%)",
                }}
              ></div>
            </div>
            <p className="text-sm text-text-muted mt-1 text-right">
              {item.status === "pending_upload" ? "Pending..." : "Uploading..."}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
