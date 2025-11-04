/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Version` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Version_slug_key" ON "Version"("slug");
