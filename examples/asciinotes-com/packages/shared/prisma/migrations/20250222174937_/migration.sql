/*
  Warnings:

  - The values [ScreenTop,ScreenBottom] on the enum `TriggerReason` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TriggerReason_new" AS ENUM ('ScreenStart', 'ScreenMiddle', 'ScreenEnd', 'WithPrevious', 'AfterPrevious', 'OnPageLoad');
ALTER TABLE "Effect" ALTER COLUMN "startWhen" TYPE "TriggerReason_new" USING ("startWhen"::text::"TriggerReason_new");
ALTER TYPE "TriggerReason" RENAME TO "TriggerReason_old";
ALTER TYPE "TriggerReason_new" RENAME TO "TriggerReason";
DROP TYPE "TriggerReason_old";
COMMIT;
