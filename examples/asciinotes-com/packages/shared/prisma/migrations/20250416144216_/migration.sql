/*
  Warnings:

  - You are about to drop the column `scalarScaleX` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `scalarScaleY` on the `Effect` table. All the data in the column will be lost.
  - Added the required column `scalarScale` to the `Effect` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- use scalarScaleX value as the defualt value for scalarScale
ALTER TABLE "Effect" ADD COLUMN "scalarScale" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
UPDATE "Effect" SET "scalarScale" = "scalarScaleX";

ALTER TABLE "Effect" DROP COLUMN "scalarScaleX";
ALTER TABLE "Effect" DROP COLUMN "scalarScaleY";
