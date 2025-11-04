/*
  Warnings:

  - Added the required column `pageId` to the `Effect` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Effect" ADD COLUMN     "pageId" UUID NOT NULL DEFAULT 'f5fec4ef-2902-4705-a160-51efd8fbb75d';

-- AddForeignKey
ALTER TABLE "Effect" ADD CONSTRAINT "Effect_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
