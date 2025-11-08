-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_pages" (
    "pageId" UUID NOT NULL,
    "uid" TEXT NOT NULL,
    "rank" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "user_pages_rank_uid_key" ON "user_pages"("rank", "uid");

-- AddForeignKey
ALTER TABLE "user_pages" ADD CONSTRAINT "user_pages_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
