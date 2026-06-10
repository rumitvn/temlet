-- CreateTable
CREATE TABLE "RenderFormat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RenderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "nexrenderUid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "templateAeUrl" TEXT NOT NULL,
    "templateAeComposition" TEXT NOT NULL,
    "templateAeRenderFormat" JSONB NOT NULL,
    "templateAeAssets" JSONB,
    "renderOutputFolder" TEXT,
    "autoRender" BOOLEAN NOT NULL DEFAULT false,
    "autoCreateMetadata" BOOLEAN NOT NULL DEFAULT false,
    "autoUpload" BOOLEAN NOT NULL DEFAULT false,
    "uploadScheduleStart" DATETIME,
    "uploadFromHour" INTEGER,
    "uploadToHour" INTEGER,
    "videosPerDay" INTEGER DEFAULT 1,
    "jsonContent" JSONB NOT NULL,
    "mp4Link" TEXT NOT NULL,
    "youtubeMetadata" JSONB,
    "status" TEXT NOT NULL,
    "renderTime" INTEGER,
    "metadataTime" INTEGER,
    "uploadTime" INTEGER,
    "youtubeLink" TEXT,
    "tiktokLink" TEXT,
    "tiktokPublishId" TEXT,
    "error" TEXT,
    "renderProgress" REAL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OutputFolder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CrawlerJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" REAL NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "downloadedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "error" TEXT,
    "outputPath" TEXT,
    "settings" JSONB NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "RenderFormat_name_key" ON "RenderFormat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RenderFormat_code_key" ON "RenderFormat"("code");

-- CreateIndex
CREATE INDEX "RenderFormat_name_idx" ON "RenderFormat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RenderItem_fileName_key" ON "RenderItem"("fileName");

-- CreateIndex
CREATE INDEX "RenderItem_fileName_idx" ON "RenderItem"("fileName");

-- CreateIndex
CREATE INDEX "RenderItem_status_idx" ON "RenderItem"("status");

-- CreateIndex
CREATE INDEX "RenderItem_nexrenderUid_idx" ON "RenderItem"("nexrenderUid");

-- CreateIndex
CREATE INDEX "RenderItem_type_idx" ON "RenderItem"("type");

-- CreateIndex
CREATE INDEX "RenderItem_topic_idx" ON "RenderItem"("topic");

-- CreateIndex
CREATE INDEX "Template_type_idx" ON "Template"("type");

-- CreateIndex
CREATE INDEX "OutputFolder_type_idx" ON "OutputFolder"("type");

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
