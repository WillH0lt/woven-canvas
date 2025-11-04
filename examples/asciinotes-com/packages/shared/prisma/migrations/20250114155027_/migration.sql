/*
  Warnings:

  - You are about to drop the column `name` on the `Site` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `Site` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Site` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Site" DROP COLUMN "name",
ADD COLUMN     "slug" TEXT NOT NULL DEFAULT 'site-' || substr(md5(random()::text), 1, 6);

-- CreateIndex
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");
