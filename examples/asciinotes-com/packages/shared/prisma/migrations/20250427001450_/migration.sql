/*
  Warnings:

  - Added the required column `srcHeight` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `srcWidth` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "srcHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "srcWidth" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
