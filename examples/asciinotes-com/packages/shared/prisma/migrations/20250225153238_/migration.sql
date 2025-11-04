/*
  Warnings:

  - You are about to drop the column `endDeltaParallel` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `endDeltaPerpendicular` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `endDeltaRotateZ` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `endScalarOpacity` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `endScalarScale` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `startDeltaParallel` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `startDeltaPerpendicular` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `startDeltaRotateZ` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `startScalarOpacity` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `startScalarScale` on the `Effect` table. All the data in the column will be lost.
  - Added the required column `deltaParallel` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deltaPerpendicular` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `deltaRotateZ` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `direction` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scalarOpacity` to the `Effect` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scalarScale` to the `Effect` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EffectDirection" AS ENUM ('Forwards', 'Backwards');

-- AlterTable
ALTER TABLE "Effect" DROP COLUMN "endDeltaParallel",
DROP COLUMN "endDeltaPerpendicular",
DROP COLUMN "endDeltaRotateZ",
DROP COLUMN "endScalarOpacity",
DROP COLUMN "endScalarScale",
DROP COLUMN "startDeltaParallel",
DROP COLUMN "startDeltaPerpendicular",
DROP COLUMN "startDeltaRotateZ",
DROP COLUMN "startScalarOpacity",
DROP COLUMN "startScalarScale",
ADD COLUMN     "deltaParallel" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "deltaPerpendicular" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "deltaRotateZ" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "direction" "EffectDirection" NOT NULL,
ADD COLUMN     "scalarOpacity" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "scalarScale" DOUBLE PRECISION NOT NULL;
