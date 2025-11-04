/*
  Warnings:

  - The values [Time,Scroll] on the enum `EffectKind` will be removed. If these variants are still used in the database, this will fail.
  - The values [BufferZone,Invisible,MenuBlock,MenuSwatch,MenuEffect,MenuText,MenuFontSize,OpenPeep,Rail,Select,SnapLine,TransformBox,TransformHandle,MenuFont] on the enum `PartTag` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EffectKind_new" AS ENUM ('StickToPage', 'FadeIn', 'FadeOut');
ALTER TABLE "Effect" ALTER COLUMN "kind" TYPE "EffectKind_new" USING ("kind"::text::"EffectKind_new");
ALTER TYPE "EffectKind" RENAME TO "EffectKind_old";
ALTER TYPE "EffectKind_new" RENAME TO "EffectKind";
DROP TYPE "EffectKind_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PartTag_new" AS ENUM ('Box', 'Image', 'Note', 'Text', 'Video');
ALTER TABLE "Part" ALTER COLUMN "tag" TYPE "PartTag_new" USING ("tag"::text::"PartTag_new");
ALTER TYPE "PartTag" RENAME TO "PartTag_old";
ALTER TYPE "PartTag_new" RENAME TO "PartTag";
DROP TYPE "PartTag_old";
COMMIT;
