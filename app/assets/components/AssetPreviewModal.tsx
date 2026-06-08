import { motion } from "framer-motion";
import { XCircleIcon } from "@heroicons/react/24/solid";
import type { ReactNode } from "react";
import { formatFileSize } from "../utils";
import { logger } from "@/app/lib/logger";
import type { Asset } from "../types";

interface AssetPreviewModalProps {
  previewAsset: Asset;
  handleClosePreview: () => void;
  getAssetPreviewContent: (asset: Asset) => ReactNode;
  fetchAssets: (searchTerm?: string, isSearch?: boolean) => void;
}

export default function AssetPreviewModal({
  previewAsset,
  handleClosePreview,
  getAssetPreviewContent,
  fetchAssets,
}: AssetPreviewModalProps) {
  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
    onClick={handleClosePreview}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-surface rounded-lg p-6 w-full max-w-6xl max-h-[95vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-text">{previewAsset.name}</h3>
          <p className="text-sm text-text-muted">
            {previewAsset.type.toUpperCase()} • {formatFileSize(previewAsset.size || 0)}
          </p>
        </div>
        <button
          onClick={handleClosePreview}
          className="text-text-muted hover:text-text"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>
      </div>
      
      <div className="mb-4">
        {getAssetPreviewContent(previewAsset)}
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={() => {
            // Download functionality
            const link = document.createElement('a');
            link.href = `/api/assets/preview?path=${encodeURIComponent(previewAsset.path)}`;
            link.download = previewAsset.name;
            link.click();
          }}
          className="px-4 py-2 bg-info text-white hover:opacity-90 rounded transition-colors"
        >
          Download
        </button>
        <button
          onClick={async () => {
            if (confirm(`Are you sure you want to delete "${previewAsset.name}"?`)) {
              try {
                const response = await fetch('/api/assets', {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    assetIds: [previewAsset.id],
                    paths: [previewAsset.path]
                  }),
                });

                if (!response.ok) {
                  throw new Error('Failed to delete asset');
                }

                // Close the preview and refresh assets
                handleClosePreview();
                fetchAssets();
                alert('Asset deleted successfully!');
              } catch (error) {
                logger.error('Error deleting asset:', error);
                alert('Failed to delete asset. Please try again.');
              }
            }
          }}
          className="px-4 py-2 bg-danger text-white hover:opacity-90 rounded transition-colors"
        >
          Delete
        </button>
        <button
          onClick={handleClosePreview}
          className="px-4 py-2 bg-surface-raised hover:bg-surface rounded transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  </motion.div>
  );
}
