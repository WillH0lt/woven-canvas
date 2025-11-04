/*
  Warnings:

  - Added the required column `description` to the `Site` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Site` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';
