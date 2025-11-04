-- CreateTable
CREATE TABLE "LinkStyle" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pageId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "underline" BOOLEAN NOT NULL,
    "hoverColor" TEXT NOT NULL,
    "hoverUnderline" BOOLEAN NOT NULL,

    CONSTRAINT "LinkStyle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LinkStyle" ADD CONSTRAINT "LinkStyle_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
