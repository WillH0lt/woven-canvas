/*
  Warnings:

  - Added the required column `fontFamily` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PartTag" ADD VALUE 'MenuFont';

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "fontFamily" TEXT NOT NULL DEFAULT 'Roboto';
