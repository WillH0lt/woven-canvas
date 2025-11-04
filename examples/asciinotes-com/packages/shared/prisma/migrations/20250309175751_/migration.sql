-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShapeKind" ADD VALUE 'Speech';
ALTER TYPE "ShapeKind" ADD VALUE 'Cloud';
ALTER TYPE "ShapeKind" ADD VALUE 'Rainbow';
ALTER TYPE "ShapeKind" ADD VALUE 'Kapow';
ALTER TYPE "ShapeKind" ADD VALUE 'Flower';
ALTER TYPE "ShapeKind" ADD VALUE 'Sticker';
ALTER TYPE "ShapeKind" ADD VALUE 'Flair';
