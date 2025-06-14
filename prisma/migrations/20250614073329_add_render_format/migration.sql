-- CreateTable
CREATE TABLE "RenderFormat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderFormat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RenderFormat_name_key" ON "RenderFormat"("name");

-- CreateIndex
CREATE INDEX "RenderFormat_name_idx" ON "RenderFormat"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RenderFormat_code_key" ON "RenderFormat"("code");

-- Add code field with default value
UPDATE "RenderFormat" SET "code" = 'format_' || id WHERE "code" IS NULL;
ALTER TABLE "RenderFormat" ALTER COLUMN "code" SET NOT NULL;
