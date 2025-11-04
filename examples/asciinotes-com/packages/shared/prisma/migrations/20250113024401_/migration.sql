-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "versionId" UUID;

-- CreateTable
CREATE TABLE "Version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" UUID NOT NULL,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE CASCADE ON UPDATE CASCADE;
