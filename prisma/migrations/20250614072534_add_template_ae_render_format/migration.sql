/*
  Warnings:

  - Added the required column `templateAeRenderFormat` to the `RenderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RenderItem" ADD COLUMN     "templateAeRenderFormat" JSONB NOT NULL;
