/*
  Warnings:

  - You are about to drop the `Shape` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `shapeCornerRadius` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeFillColor` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeFillKind` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeKind` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeRoughness` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeStrokeColor` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeStrokeKind` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shapeStrokeWidth` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShapeStrokeKind" AS ENUM ('Solid', 'Dashed', 'Dotted');

-- CreateEnum
CREATE TYPE "ShapeFillKind" AS ENUM ('Solid', 'Hatchure', 'CrossHatch');

-- DropForeignKey
ALTER TABLE "Shape" DROP CONSTRAINT "Shape_pageId_fkey";

-- DropForeignKey
ALTER TABLE "Shape" DROP CONSTRAINT "Shape_partId_fkey";

-- AlterTable
ALTER TABLE "Part" ADD COLUMN     "shapeCornerRadius" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shapeFillColor" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shapeFillKind" "ShapeFillKind" NOT NULL DEFAULT 'Solid',
ADD COLUMN     "shapeKind" "ShapeKind" NOT NULL DEFAULT 'Rectangle',
ADD COLUMN     "shapeRoughness" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "shapeStrokeColor" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "shapeStrokeKind" "ShapeStrokeKind" NOT NULL DEFAULT 'Solid',
ADD COLUMN     "shapeStrokeWidth" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Shape";
