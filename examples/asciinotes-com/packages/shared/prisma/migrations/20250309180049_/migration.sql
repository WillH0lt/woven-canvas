/*
  Warnings:

  - The values [Flair] on the enum `ShapeKind` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShapeKind_new" AS ENUM ('Ellipse', 'Rectangle', 'Triangle', 'Pentagon', 'Hexagon', 'Star', 'Heart', 'Diamond', 'Explosion', 'Crescent', 'Speech', 'Cloud', 'Rainbow', 'Kapow', 'Flower', 'Sticker', 'Flare');
ALTER TABLE "Part" ALTER COLUMN "shapeKind" TYPE "ShapeKind_new" USING ("shapeKind"::text::"ShapeKind_new");
ALTER TYPE "ShapeKind" RENAME TO "ShapeKind_old";
ALTER TYPE "ShapeKind_new" RENAME TO "ShapeKind";
DROP TYPE "ShapeKind_old";
COMMIT;
