/*
  Warnings:

  - Added the required column `href` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "href" TEXT NOT NULL DEFAULT '';
