/*
  Warnings:

  - Added the required column `shapeHatchureAngle` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "shapeHatchureAngle" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "shapeHatchureGap" DROP DEFAULT;
