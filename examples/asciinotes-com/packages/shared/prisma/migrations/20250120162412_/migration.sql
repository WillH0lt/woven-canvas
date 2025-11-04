/*
  Warnings:

  - Added the required column `backgroundColor` to the `Page` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff';
