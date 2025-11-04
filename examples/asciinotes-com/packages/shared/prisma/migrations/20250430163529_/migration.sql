/*
  Warnings:

  - The values [Mesh] on the enum `PartTag` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PartTag_new" AS ENUM ('Box', 'Image', 'Note', 'Text', 'Video', 'Shape', 'Button', 'Tape');
ALTER TABLE "Part" ALTER COLUMN "tag" TYPE "PartTag_new" USING ("tag"::text::"PartTag_new");
ALTER TYPE "PartTag" RENAME TO "PartTag_old";
ALTER TYPE "PartTag_new" RENAME TO "PartTag";
DROP TYPE "PartTag_old";
COMMIT;
