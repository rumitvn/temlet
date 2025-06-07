/*
  Warnings:

  - Added the required column `channelId` to the `RenderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channelName` to the `RenderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateAeComposition` to the `RenderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `templateAeUrl` to the `RenderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topic` to the `RenderItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `RenderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RenderItem" ADD COLUMN     "autoCreateMetadata" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoRender" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoUpload" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "channelId" TEXT NOT NULL,
ADD COLUMN     "channelName" TEXT NOT NULL,
ADD COLUMN     "templateAeComposition" TEXT NOT NULL,
ADD COLUMN     "templateAeUrl" TEXT NOT NULL,
ADD COLUMN     "topic" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "uploadFromHour" INTEGER,
ADD COLUMN     "uploadScheduleStart" TIMESTAMP(3),
ADD COLUMN     "uploadToHour" INTEGER,
ADD COLUMN     "videosPerDay" INTEGER DEFAULT 1;

-- CreateIndex
CREATE INDEX "RenderItem_type_idx" ON "RenderItem"("type");

-- CreateIndex
CREATE INDEX "RenderItem_topic_idx" ON "RenderItem"("topic");
