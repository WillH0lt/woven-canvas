-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('None', 'ReadOnly', 'ReadWrite');

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "shareMode" "ShareMode" NOT NULL DEFAULT 'None',

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pageId" UUID NOT NULL,
    "uid" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL,

    CONSTRAINT "user_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_pages_rank_uid_key" ON "user_pages"("rank", "uid");

-- AddForeignKey
ALTER TABLE "user_pages" ADD CONSTRAINT "user_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
