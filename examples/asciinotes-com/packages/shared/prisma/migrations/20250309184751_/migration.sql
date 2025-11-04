/*
  Warnings:

  - Added the required column `shapeHatchureGap` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "shapeHatchureGap" DOUBLE PRECISION NOT NULL DEFAULT 10;
