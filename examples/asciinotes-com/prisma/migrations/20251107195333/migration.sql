/*
  Warnings:

  - You are about to drop the column `isPinned` on the `user_pages` table. All the data in the column will be lost.
  - Made the column `pinRank` on table `user_pages` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "user_pages" DROP COLUMN "isPinned",
ALTER COLUMN "pinRank" SET NOT NULL;
