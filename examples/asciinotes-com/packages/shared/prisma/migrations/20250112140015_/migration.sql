/*
  Warnings:

  - A unique constraint covering the columns `[domain]` on the table `Site` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "domain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");
