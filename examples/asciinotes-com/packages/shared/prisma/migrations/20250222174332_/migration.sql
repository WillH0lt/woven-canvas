/*
  Warnings:

  - You are about to drop the column `deltaLeft` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `deltaTop` on the `Effect` table. All the data in the column will be lost.
  - Added the required column `deltaParallel` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deltaPerpendicular` to the `Effect` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Effect" DROP COLUMN "deltaLeft",
DROP COLUMN "deltaTop",
ADD COLUMN     "deltaParallel" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deltaPerpendicular" DOUBLE PRECISION NOT NULL DEFAULT 0;
