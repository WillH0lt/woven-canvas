/*
  Warnings:

  - You are about to drop the column `scalarScale` on the `Effect` table. All the data in the column will be lost.
  - Added the required column `scalarScaleX` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scalarScaleY` to the `Effect` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Use value from scalarScale as new value for scalarScaleX and scalarScaleY
ALTER TABLE "Effect" ADD COLUMN "scalarScaleX" REAL NOT NULL DEFAULT 1;
ALTER TABLE "Effect" ADD COLUMN "scalarScaleY" REAL NOT NULL DEFAULT 1;

UPDATE "Effect" SET "scalarScaleX" = "scalarScale", "scalarScaleY" = "scalarScale";

-- AlterTable
-- Drop scalarScale column
ALTER TABLE "Effect" DROP COLUMN "scalarScale";
