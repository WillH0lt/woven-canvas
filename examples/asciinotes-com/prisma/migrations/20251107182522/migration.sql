-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('None', 'ReadOnly', 'ReadWrite');

-- DropForeignKey
ALTER TABLE "public"."user_pages" DROP CONSTRAINT "user_pages_pageId_fkey";

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "shareMode" "ShareMode" NOT NULL DEFAULT 'None';

-- AlterTable
ALTER TABLE "user_pages" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinRank" TEXT;

-- AddForeignKey
ALTER TABLE "user_pages" ADD CONSTRAINT "user_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
