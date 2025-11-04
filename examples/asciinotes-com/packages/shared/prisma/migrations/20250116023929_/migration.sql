/*
  Warnings:

  - Made the column `slug` on table `Site` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Site" ALTER COLUMN "slug" SET NOT NULL;
