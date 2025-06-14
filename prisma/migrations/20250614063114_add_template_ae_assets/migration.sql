/*
  Warnings:

  - Added the required column `templateAeAssets` to the `RenderItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RenderItem" ADD COLUMN     "templateAeAssets" JSONB NOT NULL;
