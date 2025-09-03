-- CreateTable
CREATE TABLE "CrawlerJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "downloadedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "outputPath" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawlerJob_status_idx" ON "CrawlerJob"("status");

-- CreateIndex
CREATE INDEX "CrawlerJob_type_idx" ON "CrawlerJob"("type");

-- CreateIndex
CREATE INDEX "CrawlerJob_site_idx" ON "CrawlerJob"("site");

-- CreateIndex
CREATE INDEX "CrawlerJob_channel_idx" ON "CrawlerJob"("channel");

-- CreateIndex
CREATE INDEX "CrawlerJob_topic_idx" ON "CrawlerJob"("topic");

-- CreateIndex
CREATE INDEX "CrawlerJob_createdAt_idx" ON "CrawlerJob"("createdAt");
