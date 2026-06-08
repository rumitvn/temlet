import { motion } from "framer-motion";
import {
  GlobeAltIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  PlayIcon,
} from "@heroicons/react/24/solid";
import { Card } from "@/app/components/ui";
import type { CrawlerStats } from "../types";

interface CrawlerStatsCardsProps {
  stats: CrawlerStats;
}

export default function CrawlerStatsCards({ stats }: CrawlerStatsCardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <GlobeAltIcon className="w-6 h-6 text-info" />
            <h3 className="text-lg font-medium text-text-muted">Total Jobs</h3>
          </div>
          <p className="text-3xl font-bold text-info">{stats.totalJobs}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <PlayIcon className="w-6 h-6 text-warning" />
            <h3 className="text-lg font-medium text-text-muted">Active Jobs</h3>
          </div>
          <p className="text-3xl font-bold text-warning">{stats.activeJobs}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-6 h-6 text-success" />
            <h3 className="text-lg font-medium text-text-muted">Completed</h3>
          </div>
          <p className="text-3xl font-bold text-success">
            {stats.completedJobs}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpTrayIcon className="w-6 h-6 text-accent" />
            <h3 className="text-lg font-medium text-text-muted">Downloaded</h3>
          </div>
          <p className="text-3xl font-bold text-accent">
            {stats.totalDownloaded}
          </p>
        </Card>
      </div>
    </motion.div>
  );
}
