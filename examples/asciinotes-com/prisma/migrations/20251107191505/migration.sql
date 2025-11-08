-- AlterTable
ALTER TABLE "user_pages" ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "user_pages_pkey" PRIMARY KEY ("id");
