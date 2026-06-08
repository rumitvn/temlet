export type CrawlerStatus =
  | "pending"
  | "crawling"
  | "downloading"
  | "completed"
  | "failed"
  | "paused";

export interface CrawlerJob {
  id: string;
  name: string;
  keyword: string;
  site: string;
  type: "image" | "video";
  channel: string;
  topic: string;
  status: CrawlerStatus;
  progress: number;
  totalItems: number;
  downloadedItems: number;
  failedItems: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  outputPath: string;
  settings: {
    maxItems: number;
    quality: "low" | "medium" | "high";
    format: string;
  };
}

export interface CrawlerStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalDownloaded: number;
  totalFailed: number;
  averageSpeed: number;
}

export interface SSEEvent extends Event {
  data: string;
}

export interface SSEJobUpdate {
  type: "job_update" | "completed" | "error";
  job?: Partial<CrawlerJob>;
  error?: string;
}
