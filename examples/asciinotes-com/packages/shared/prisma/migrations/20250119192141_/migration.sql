/*
  Warnings:

  - Added the required column `name` to the `Site` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Untitled';
