/*
  Warnings:

  - Added the required column `rank` to the `Effect` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Effect" ADD COLUMN     "rank" TEXT NOT NULL DEFAULT '';
