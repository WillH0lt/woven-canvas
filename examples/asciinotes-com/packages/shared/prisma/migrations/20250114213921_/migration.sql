-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "googleAnalyticsId" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "title" DROP NOT NULL;
