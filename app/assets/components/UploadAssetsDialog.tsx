import { motion } from "framer-motion";
import { XCircleIcon } from "@heroicons/react/24/solid";
import type { Dispatch, SetStateAction } from "react";
import { getUploadKey } from "../utils";
import type { GroupUploadItem, MissingResource } from "../types";

type UploadResourceFilter = "all" | "image" | "video" | "quiz3-image" | "reward";
type UploadSortBy = "priority" | "name" | "count";
type UploadSortOrder = "asc" | "desc";

interface UploadAssetsDialogProps {
  baseMissingResources: GroupUploadItem[];
  filteredMissingResources: GroupUploadItem[];
  uploadSearchQuery: string;
  uploadResourceFilter: UploadResourceFilter;
  uploadSortBy: UploadSortBy;
  uploadSortOrder: UploadSortOrder;
  uploadingStates: { [key: string]: boolean };
  setShowUploadDialog: Dispatch<SetStateAction<boolean>>;
  setUploadSearchQuery: Dispatch<SetStateAction<string>>;
  setUploadResourceFilter: Dispatch<SetStateAction<UploadResourceFilter>>;
  setUploadSortBy: Dispatch<SetStateAction<UploadSortBy>>;
  setUploadSortOrder: Dispatch<SetStateAction<UploadSortOrder>>;
  handleUploadSpecificAsset: (
    groupKey: string,
    resourceType: MissingResource["type"],
    files: FileList,
    jsonOrder?: number,
    imageName?: string,
  ) => void;
}

export default function UploadAssetsDialog({
  baseMissingResources,
  filteredMissingResources,
  uploadSearchQuery,
  uploadResourceFilter,
  uploadSortBy,
  uploadSortOrder,
  uploadingStates,
  setShowUploadDialog,
  setUploadSearchQuery,
  setUploadResourceFilter,
  setUploadSortBy,
  setUploadSortOrder,
  handleUploadSpecificAsset,
}: UploadAssetsDialogProps) {
  return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-surface rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">📤 Upload Missing Assets</h2>
          <p className="text-sm text-text-muted mt-1">
            {baseMissingResources.length} groups with missing assets • {baseMissingResources.reduce((sum, group) => sum + group.missingResources.reduce((s, r) => s + r.count, 0), 0)} total items to upload
          </p>
        </div>
        <button
          onClick={() => setShowUploadDialog(false)}
          className="text-text-muted hover:text-text transition-colors"
        >
          <XCircleIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Stats */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { type: 'image', icon: '🖼️', label: 'Images', color: 'bg-danger' },
            { type: 'video', icon: '🎥', label: 'Videos', color: 'bg-danger' },
            { type: 'quiz3-image', icon: '🖼️', label: 'Quiz 3 Images', color: 'bg-info' },
            { type: 'reward', icon: '🏆', label: 'Rewards', color: 'bg-warning' }
          ].map(({ type, icon, label, color }) => {
            const count = baseMissingResources.reduce((sum, group) => 
              sum + group.missingResources.filter(r => r.type === type).reduce((s, r) => s + r.count, 0), 0
            );
            return (
              <div key={type} className={`${color} rounded-lg p-3 text-white`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-lg font-bold">{count}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Simple Group Selection */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-muted">Group:</label>
            <select
              value={uploadSearchQuery}
              onChange={(e) => setUploadSearchQuery(e.target.value)}
              className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-info"
            >
              <option value="">All Groups</option>
              {baseMissingResources.map(group => (
                <option key={group.key} value={group.name.toLowerCase()}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          {/* Resource Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-muted">Filter:</label>
            <select
              value={uploadResourceFilter}
              onChange={(e) => setUploadResourceFilter(e.target.value as any)}
              className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-info"
            >
              <option value="all">All Resources</option>
              <option value="image">🖼️ Images</option>
              <option value="video">🎥 Videos</option>
              <option value="quiz3-image">🖼️ Quiz 3 Images</option>
              <option value="reward">🏆 Rewards</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-muted">Sort by:</label>
            <select
              value={uploadSortBy}
              onChange={(e) => setUploadSortBy(e.target.value as any)}
              className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text focus:outline-none focus:ring-2 focus:ring-info"
            >
              <option value="priority">Priority</option>
              <option value="name">Name</option>
              <option value="count">Count</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-muted">Order:</label>
            <button
              onClick={() => setUploadSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text hover:bg-surface focus:outline-none focus:ring-2 focus:ring-info"
            >
              {uploadSortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>

          {/* Reset Filters */}
          {(uploadSearchQuery || uploadResourceFilter !== 'all') && (
            <button
              onClick={() => {
                setUploadSearchQuery("");
                setUploadResourceFilter('all');
              }}
              className="px-3 py-1 bg-surface-raised border border-border rounded text-sm text-text hover:bg-surface focus:outline-none focus:ring-2 focus:ring-info"
            >
              Clear Filters
            </button>
          )}

          {/* Results Count */}
          <div className="ml-auto text-sm text-text-muted">
            {filteredMissingResources.length} of {baseMissingResources.length} groups
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {filteredMissingResources.length === 0 ? (
          <div className="text-center py-12">
            {baseMissingResources.length === 0 ? (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-success mb-2">All Assets Complete!</h3>
                <p className="text-text-muted">No missing assets found. All groups are ready for rendering.</p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-text-muted mb-2">No Results Found</h3>
                <p className="text-text-muted">Try adjusting your search or filter criteria.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredMissingResources.map((group) => (
              <div key={group.key} className="bg-surface-raised rounded-lg p-4 border border-border hover:border-border-strong transition-colors">
                {/* Group Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-text capitalize">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Priority:</span>
                    <span className="px-2 py-1 bg-accent text-accent-fg text-xs rounded font-medium">
                      {group.priority}
                    </span>
                  </div>
                </div>

                {/* Missing Resources Count */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <span>📦</span>
                    <span>{group.missingResources.length} resource{group.missingResources.length !== 1 ? 's' : ''} missing</span>
                    <span className="text-text-muted">•</span>
                    <span>{group.missingResources.reduce((sum, resource) => sum + resource.count, 0)} total items</span>
                  </div>
                </div>

                {/* Missing Resources */}
                <div className="space-y-3">
                  {group.missingResources.map((resource, index) => (
                    <div
                      key={`${group.key}-${resource.type}-${index}`}
                      className="bg-surface-raised rounded-lg p-3 border border-border hover:border-border-strong transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{resource.icon}</span>
                          <span className="font-medium text-text text-sm">{resource.label}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded text-white font-medium ${resource.color}`}>
                          {resource.count}
                        </span>
                      </div>
                      
                      <p className="text-xs text-text-muted mb-3 leading-relaxed">
                        {resource.description}
                      </p>

                      {/* Show individual items for all resource types that have specific items */}
                      {resource.items && resource.items.length > 0 ? (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {resource.items.map((item, itemIndex) => (
                            <div
                              key={`${group.key}-${resource.type}-${item.key}-${itemIndex}`}
                              className="bg-surface-raised rounded p-2 border border-border hover:border-border-strong transition-colors"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-text truncate">
                                  {item.name}
                                </span>
                                <button
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.multiple = false;
                                    
                                    // Set file type restrictions
                                    if (resource.type === 'image' || resource.type === 'quiz3-image') {
                                      input.accept = 'image/*';
                                    } else if (resource.type === 'video' || resource.type === 'reward') {
                                      input.accept = 'video/*';
                                    }
                                    
                                    input.onchange = (e) => {
                                      const files = (e.target as HTMLInputElement).files;
                                      if (files && files.length > 0) {
                                        if (resource.type === 'reward' && item.jsonOrder) {
                                          handleUploadSpecificAsset(group.key, resource.type, files, item.jsonOrder);
                                        } else if (resource.type === 'quiz3-image') {
                                          // For quiz3-image, we need to handle the specific image name
                                          handleUploadSpecificAsset(group.key, resource.type, files, undefined, item.name);
                                        } else if (resource.type === 'image' && item.jsonOrder) {
                                          // For images, we need to handle the JSON order
                                          handleUploadSpecificAsset(group.key, resource.type, files, item.jsonOrder);
                                        } else if (resource.type === 'video' && item.jsonOrder) {
                                          // For videos, we need to handle the JSON order
                                          handleUploadSpecificAsset(group.key, resource.type, files, item.jsonOrder);
                                        }
                                      }
                                    };
                                    
                                    input.click();
                                  }}
                                  disabled={uploadingStates[getUploadKey(group.key, resource.type, item.jsonOrder)]}
                                  className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                                    uploadingStates[getUploadKey(group.key, resource.type, item.jsonOrder)]
                                      ? 'bg-surface-raised cursor-not-allowed text-text-muted' 
                                      : 'bg-info hover:opacity-90 text-white'
                                  }`}
                                >
                                  {uploadingStates[getUploadKey(group.key, resource.type, item.jsonOrder)] ? (
                                    <>
                                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>📤</span>
                                      <span>Upload</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-xs text-text-muted leading-tight">
                                {item.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Default upload button for resource types without specific items */
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.multiple = resource.type === 'quiz3-image';
                            
                            // Set file type restrictions
                            if (resource.type === 'image' || resource.type === 'quiz3-image') {
                              input.accept = 'image/*';
                            } else if (resource.type === 'video') {
                              input.accept = 'video/*';
                            } else if (resource.type === 'reward') {
                              input.accept = 'video/*';
                            }
                            
                            input.onchange = (e) => {
                              const files = (e.target as HTMLInputElement).files;
                              if (files && files.length > 0) {
                                if (resource.type === 'reward') {
                                  // For rewards, ask for JSON order
                                  const order = prompt(`Enter JSON order number for reward (available orders: ${group.jsonOrders.join(', ')})`);
                                  if (order && !isNaN(parseInt(order))) {
                                    handleUploadSpecificAsset(group.key, resource.type, files, parseInt(order));
                                  }
                                } else {
                                  handleUploadSpecificAsset(group.key, resource.type, files);
                                }
                              }
                            };
                            
                            input.click();
                          }}
                          disabled={uploadingStates[getUploadKey(group.key, resource.type)]}
                          className={`w-full px-3 py-2 rounded transition-colors flex items-center justify-center gap-2 text-sm ${
                            uploadingStates[getUploadKey(group.key, resource.type)]
                              ? 'bg-surface-raised cursor-not-allowed' 
                              : 'bg-info hover:opacity-90 text-white'
                          }`}
                        >
                          {uploadingStates[getUploadKey(group.key, resource.type)] ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <span>📤</span>
                              <span>Upload {resource.label}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
        <button
          onClick={() => setShowUploadDialog(false)}
          className="px-4 py-2 bg-surface-raised hover:bg-surface rounded transition-colors"
        >
          Close
        </button>
      </div>
    </motion.div>
  </motion.div>
  );
}
