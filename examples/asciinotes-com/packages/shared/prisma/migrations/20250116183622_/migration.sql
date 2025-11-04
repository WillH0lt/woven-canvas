-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "liveVersionId" UUID;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_liveVersionId_fkey" FOREIGN KEY ("liveVersionId") REFERENCES "Version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
