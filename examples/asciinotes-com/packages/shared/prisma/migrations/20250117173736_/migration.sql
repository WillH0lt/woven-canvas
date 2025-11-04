/*
  Warnings:

  - You are about to drop the column `name` on the `Page` table. All the data in the column will be lost.
  - Added the required column `description` to the `Page` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Page` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Site` required. This step will fail if there are existing NULL values in that column.
  - Made the column `title` on table `Site` required. This step will fail if there are existing NULL values in that column.
  - Made the column `googleAnalyticsId` on table `Site` required. This step will fail if there are existing NULL values in that column.
  - Made the column `favicon` on table `Site` required. This step will fail if there are existing NULL values in that column.
  - Made the column `ogImage` on table `Site` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
-- ALTER TABLE "Page" DROP COLUMN "name",
-- ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
-- ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Site"
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "googleAnalyticsId" SET NOT NULL,
ALTER COLUMN "favicon" SET NOT NULL,
ALTER COLUMN "ogImage" SET NOT NULL;
