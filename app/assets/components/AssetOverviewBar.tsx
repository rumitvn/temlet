import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import type { OverviewStatus } from "../types";

type StatusFilter =
  | "all"
  | "complete"
  | "missing-json"
  | "missing-image"
  | "missing-videos"
  | "missing-voices"
  | "missing-rewards"
  | "missing-quiz3-images"
  | "incomplete";

interface AssetOverviewBarProps {
  calculateOverviewStatus: OverviewStatus;
  statusFilter: StatusFilter;
  setStatusFilter: Dispatch<SetStateAction<StatusFilter>>;
}

export default function AssetOverviewBar({
  calculateOverviewStatus,
  statusFilter,
  setStatusFilter,
}: AssetOverviewBarProps) {
  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-6 p-4 bg-surface rounded-lg border border-border"
  >
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-semibold text-accent">📊 Overview Status</h2>
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Overall Completion:</span>
        <span className={`text-lg font-bold ${calculateOverviewStatus.completionRate >= 75 ? 'text-success' : calculateOverviewStatus.completionRate >= 50 ? 'text-warning' : 'text-danger'}`}>
          {calculateOverviewStatus.completionRate}%
        </span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3">
      {/* Total Groups */}
      <button
        onClick={() => setStatusFilter('all')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'all'
            ? 'bg-accent border-accent text-accent-fg'
            : 'bg-surface-raised border-border text-text-muted hover:bg-surface'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">📁</div>
          <div className="text-sm font-medium">Total Groups</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.totalGroups}</div>
        </div>
      </button>

      {/* Complete Groups */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'complete' ? 'all' : 'complete')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'complete'
            ? 'bg-success border-4 ring-2 ring-success text-white shadow-lg'
            : calculateOverviewStatus.completeGroups > 0
            ? 'bg-success-bg border border-success text-success hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-sm font-medium">Complete</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.completeGroups}</div>
        </div>
      </button>

      {/* Missing JSON */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'missing-json' ? 'all' : 'missing-json')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'missing-json' 
            ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
            : calculateOverviewStatus.missingJson > 0
            ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">📄</div>
          <div className="text-sm font-medium">Missing JSON</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.missingJson}</div>
        </div>
      </button>

      {/* Missing Image */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'missing-image' ? 'all' : 'missing-image')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'missing-image' 
            ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
            : calculateOverviewStatus.missingImage > 0
            ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-sm font-medium">Missing Image</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.missingImage}</div>
        </div>
      </button>

      {/* Missing Videos */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'missing-videos' ? 'all' : 'missing-videos')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'missing-videos' 
            ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
            : calculateOverviewStatus.missingVideos > 0
            ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">🎥</div>
          <div className="text-sm font-medium">Missing Videos</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.missingVideos}</div>
        </div>
      </button>

      {/* Missing Voices */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'missing-voices' ? 'all' : 'missing-voices')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'missing-voices'
            ? 'bg-warning border-4 ring-2 ring-warning text-white shadow-lg'
            : calculateOverviewStatus.missingVoices > 0
            ? 'bg-warning-bg border border-warning text-warning hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">🎵</div>
          <div className="text-sm font-medium">Missing Voices</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.missingVoices}</div>
        </div>
      </button>

      {/* Missing Rewards */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'missing-rewards' ? 'all' : 'missing-rewards')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'missing-rewards'
            ? 'bg-warning border-4 ring-2 ring-warning text-white shadow-lg'
            : calculateOverviewStatus.missingRewards > 0
            ? 'bg-warning-bg border border-warning text-warning hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-sm font-medium">Missing Rewards</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.missingRewards}</div>
        </div>
      </button>

      {/* Missing Quiz 3 Images */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'missing-quiz3-images' ? 'all' : 'missing-quiz3-images')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'missing-quiz3-images'
            ? 'bg-info border-4 ring-2 ring-info text-white shadow-lg'
            : calculateOverviewStatus.missingQuiz3Images > 0
            ? 'bg-info-bg border border-info text-info hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">🖼️</div>
          <div className="text-sm font-medium">Missing Quiz 3 Images</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.missingQuiz3Images}</div>
        </div>
      </button>

      {/* Incomplete Groups */}
      <button
        onClick={() => setStatusFilter(statusFilter === 'incomplete' ? 'all' : 'incomplete')}
        className={`p-3 rounded-lg border transition-all hover:scale-105 ${
          statusFilter === 'incomplete'
            ? 'bg-danger border-4 ring-2 ring-danger text-white shadow-lg'
            : calculateOverviewStatus.incompleteGroups > 0
            ? 'bg-danger-bg border border-danger text-danger hover:bg-surface'
            : 'bg-surface-raised border border-border text-text-muted'
        }`}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">⚠️</div>
          <div className="text-sm font-medium">Incomplete</div>
          <div className="text-lg font-bold">{calculateOverviewStatus.incompleteGroups}</div>
        </div>
      </button>
    </div>


  </motion.div>
  );
}
