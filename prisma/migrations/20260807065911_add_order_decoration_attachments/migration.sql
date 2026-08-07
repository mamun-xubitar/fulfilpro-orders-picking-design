-- CreateTable
CREATE TABLE "OrderDecorationAttachment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "files" JSONB NOT NULL DEFAULT '[]',
    "customerDesign" JSONB NOT NULL DEFAULT '[]',
    "customerRemarks" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDecorationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderDecorationAttachment_orderId_key" ON "OrderDecorationAttachment"("orderId");

-- AddForeignKey
ALTER TABLE "OrderDecorationAttachment" ADD CONSTRAINT "OrderDecorationAttachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
