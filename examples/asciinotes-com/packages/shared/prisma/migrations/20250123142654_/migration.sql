/*
  Warnings:

  - You are about to drop the column `lastEditedAt` on the `Site` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Site" DROP COLUMN "lastEditedAt",
ADD COLUMN     "editedAt" TIMESTAMP(3);
