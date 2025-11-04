/*
  Warnings:

  - Added the required column `isDefault` to the `LinkStyle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LinkStyle" ADD COLUMN     "isDefault" BOOLEAN NOT NULL;
