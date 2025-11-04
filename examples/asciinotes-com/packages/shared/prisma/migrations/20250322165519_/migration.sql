/*
  Warnings:

  - Added the required column `buttonKind` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ButtonKind" AS ENUM ('Standard', 'Rounded');

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "buttonKind" "ButtonKind" NOT NULL DEFAULT 'Standard';
