import { motion } from "framer-motion";
import { Card } from "@/app/components/ui";
import { statusClass } from "@/app/theme/status";
import { statusGroups, getStatusIcon } from "../constants";
import type { RenderStatus } from "../../types/render";

interface RenderStatusBarProps {
  statusCounts: Partial<Record<RenderStatus, number>>;
  loadingCounts: boolean;
  selectedStatus: string | null;
  onStatusClick: (status: string) => void;
  onClearStatus: () => void;
}

export default function RenderStatusBar({
  statusCounts,
  loadingCounts,
  selectedStatus,
  onStatusClick,
  onClearStatus,
}: RenderStatusBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {Object.entries(statusGroups).map(([groupKey, group]) => (
          <Card key={groupKey} className="flex-1 p-3 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <group.icon className="w-6 h-6 text-accent" />
              <h3 className="text-2xl font-bold text-text flex items-center">
                {group.title}
                {loadingCounts && (
                  <svg
                    className="animate-spin ml-2 h-4 w-4 text-accent"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    ></path>
                  </svg>
                )}
              </h3>
              {/* Clear Status Filter Button */}
              {selectedStatus && (
                <button
                  onClick={onClearStatus}
                  className="ml-4 px-2 py-1 text-xs bg-surface-raised border border-border hover:border-border-strong rounded text-text-muted"
                >
                  Clear Status Filter
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {group.statuses.map((status) => {
                const Icon = getStatusIcon(status);
                const count = statusCounts[status] || 0;
                return (
                  <motion.button
                    key={status}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onStatusClick(status)}
                    className={`flex items-center justify-between p-2 rounded-lg text-lg font-medium transition-all ${statusClass(
                      status,
                    )} ${selectedStatus === status ? "ring-2 ring-accent-ring" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      <span>{status.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-2xl font-extrabold">{count}</span>
                  </motion.button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
