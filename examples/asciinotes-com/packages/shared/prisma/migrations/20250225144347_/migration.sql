/*
  Warnings:

  - You are about to drop the column `deltaParallel` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `deltaPerpendicular` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `deltaRotateZ` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `scalarOpacity` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `scalarScale` on the `Effect` table. All the data in the column will be lost.
  - Added the required column `endDeltaParallel` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDeltaPerpendicular` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endDeltaRotateZ` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endScalarOpacity` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endScalarScale` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDeltaParallel` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDeltaPerpendicular` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDeltaRotateZ` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startScalarOpacity` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startScalarScale` to the `Effect` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Effect" DROP COLUMN "deltaParallel",
DROP COLUMN "deltaPerpendicular",
DROP COLUMN "deltaRotateZ",
DROP COLUMN "scalarOpacity",
DROP COLUMN "scalarScale",
ADD COLUMN     "endDeltaParallel" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "endDeltaPerpendicular" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "endDeltaRotateZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "endScalarOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "endScalarScale" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "startDeltaParallel" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "startDeltaPerpendicular" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "startDeltaRotateZ" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "startScalarOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "startScalarScale" DOUBLE PRECISION NOT NULL DEFAULT 0;
