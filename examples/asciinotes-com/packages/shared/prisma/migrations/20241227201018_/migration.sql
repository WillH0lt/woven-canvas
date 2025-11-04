/*
  Warnings:

  - Added the required column `isGroup` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "groupId" UUID,
ADD COLUMN     "isGroup" BOOLEAN NOT NULL default false;
