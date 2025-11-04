/*
  Warnings:

  - The values [Neumorphic] on the enum `ButtonKind` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ButtonKind_new" AS ENUM ('Standard', 'Rounded', 'Pill', 'Block', 'Realistic', 'Offset');
ALTER TABLE "Part" ALTER COLUMN "buttonKind" TYPE "ButtonKind_new" USING ("buttonKind"::text::"ButtonKind_new");
ALTER TYPE "ButtonKind" RENAME TO "ButtonKind_old";
ALTER TYPE "ButtonKind_new" RENAME TO "ButtonKind";
DROP TYPE "ButtonKind_old";
COMMIT;
