-- CreateEnum
CREATE TYPE "ScrollDirection" AS ENUM ('Horizontal', 'Vertical');

-- CreateEnum
CREATE TYPE "EffectKind" AS ENUM ('Time', 'Scroll');

-- CreateEnum
CREATE TYPE "TriggerReason" AS ENUM ('ScreenPercent', 'Press');

-- CreateEnum
CREATE TYPE "PartTag" AS ENUM ('Box', 'BufferZone', 'Image', 'Invisible', 'MenuBlock', 'MenuSwatch', 'MenuEffect', 'MenuText', 'MenuFontSize', 'Note', 'OpenPeep', 'Rail', 'Select', 'SnapLine', 'Text', 'TransformBox', 'TransformHandle', 'Video');

-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "scrollDirection" "ScrollDirection" NOT NULL,
    "minWidth" INTEGER NOT NULL,
    "minHeight" INTEGER NOT NULL,
    "maxWidth" INTEGER NOT NULL,
    "maxHeight" INTEGER NOT NULL,
    "siteId" UUID NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tag" "PartTag" NOT NULL,
    "src" TEXT NOT NULL,
    "left" DOUBLE PRECISION NOT NULL,
    "top" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "rotateZ" DOUBLE PRECISION NOT NULL,
    "opacity" DOUBLE PRECISION NOT NULL,
    "rank" TEXT NOT NULL,
    "innerHtml" TEXT NOT NULL,
    "fontSize" DOUBLE PRECISION NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "stretched" BOOLEAN NOT NULL,
    "pageId" UUID NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Effect" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EffectKind" NOT NULL,
    "startWhen" "TriggerReason" NOT NULL,
    "triggerScreenPercent" DOUBLE PRECISION NOT NULL,
    "deltaTop" DOUBLE PRECISION NOT NULL,
    "deltaLeft" DOUBLE PRECISION NOT NULL,
    "deltaRotateZ" DOUBLE PRECISION NOT NULL,
    "scalarOpacity" DOUBLE PRECISION NOT NULL,
    "scalarScale" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "distancePx" INTEGER NOT NULL,
    "repeat" BOOLEAN NOT NULL,
    "partId" UUID NOT NULL,

    CONSTRAINT "Effect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "xi" INTEGER NOT NULL,
    "yi" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "pageId" UUID NOT NULL,

    CONSTRAINT "Tile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Effect" ADD CONSTRAINT "Effect_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tile" ADD CONSTRAINT "Tile_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
