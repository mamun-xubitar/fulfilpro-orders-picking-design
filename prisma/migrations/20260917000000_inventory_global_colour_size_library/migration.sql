-- DropTable
DROP TABLE "ColourPresetGroup";

-- DropTable
DROP TABLE "SizePresetGroup";

-- CreateTable
CREATE TABLE "GlobalColour" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalColour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalSize" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalColour_name_key" ON "GlobalColour"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSize_name_key" ON "GlobalSize"("name");
