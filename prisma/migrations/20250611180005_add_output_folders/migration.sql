-- CreateTable
CREATE TABLE "OutputFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutputFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutputFolder_type_idx" ON "OutputFolder"("type");
