/*
  Warnings:

  - Added the required column `shapeFillWidth` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "shapeFillWidth" DOUBLE PRECISION NOT NULL DEFAULT 2;
