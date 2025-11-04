/*
  Warnings:

  - You are about to drop the column `hoverUnderline` on the `LinkStyle` table. All the data in the column will be lost.
  - You are about to drop the column `underline` on the `LinkStyle` table. All the data in the column will be lost.
  - Added the required column `decoration` to the `LinkStyle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hoverDecoration` to the `LinkStyle` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TextDecoration" AS ENUM ('None', 'Underline', 'Overline', 'LineThrough');

-- AlterTable
ALTER TABLE "LinkStyle" DROP COLUMN "hoverUnderline",
DROP COLUMN "underline",
ADD COLUMN     "decoration" "TextDecoration" NOT NULL,
ADD COLUMN     "hoverDecoration" "TextDecoration" NOT NULL;
