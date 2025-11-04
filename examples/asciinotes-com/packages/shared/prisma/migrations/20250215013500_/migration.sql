/*
  Warnings:

  - The values [Press] on the enum `TriggerReason` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `duration` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Effect` table. All the data in the column will be lost.
  - You are about to drop the column `repeat` on the `Effect` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TriggerReason_new" AS ENUM ('ScreenTop', 'ScreenBottom', 'ScreenPercent', 'WithPrevious', 'AfterPrevious', 'OnPageLoad');
ALTER TABLE "Effect" ALTER COLUMN "startWhen" TYPE "TriggerReason_new" USING ("startWhen"::text::"TriggerReason_new");
ALTER TYPE "TriggerReason" RENAME TO "TriggerReason_old";
ALTER TYPE "TriggerReason_new" RENAME TO "TriggerReason";
DROP TYPE "TriggerReason_old";
COMMIT;

-- AlterTable
ALTER TABLE "Effect" DROP COLUMN "duration",
DROP COLUMN "name",
DROP COLUMN "repeat";
