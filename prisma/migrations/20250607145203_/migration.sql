-- CreateTable
CREATE TABLE "RenderItem" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "nexrenderUid" TEXT NOT NULL,
    "jsonContent" JSONB NOT NULL,
    "mp4Link" TEXT NOT NULL,
    "youtubeMetadata" JSONB,
    "status" TEXT NOT NULL,
    "renderTime" INTEGER,
    "metadataTime" INTEGER,
    "uploadTime" INTEGER,
    "youtubeLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RenderItem_fileName_key" ON "RenderItem"("fileName");

-- CreateIndex
CREATE INDEX "RenderItem_fileName_idx" ON "RenderItem"("fileName");

-- CreateIndex
CREATE INDEX "RenderItem_status_idx" ON "RenderItem"("status");

-- CreateIndex
CREATE INDEX "RenderItem_nexrenderUid_idx" ON "RenderItem"("nexrenderUid");
