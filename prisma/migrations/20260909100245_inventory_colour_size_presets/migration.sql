-- CreateTable
CREATE TABLE "ColourPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColourPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SizePreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColourPreset_key_key" ON "ColourPreset"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SizePreset_key_key" ON "SizePreset"("key");
