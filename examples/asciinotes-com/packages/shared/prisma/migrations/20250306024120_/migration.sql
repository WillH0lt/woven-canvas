-- CreateEnum
CREATE TYPE "ShapeKind" AS ENUM ('Ellipse', 'Rectangle');

-- CreateTable
CREATE TABLE "Shape" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pageId" UUID NOT NULL,
    "partId" UUID NOT NULL,
    "kind" "ShapeKind" NOT NULL,

    CONSTRAINT "Shape_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shape_partId_key" ON "Shape"("partId");

-- AddForeignKey
ALTER TABLE "Shape" ADD CONSTRAINT "Shape_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shape" ADD CONSTRAINT "Shape_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;
