-- Rename SupplierProduct.deliveryRemarks -> remarks (data-preserving; see PATTERN.md item 3)
ALTER TABLE "SupplierProduct" RENAME COLUMN "deliveryRemarks" TO "remarks";

-- CreateEnum
CREATE TYPE "StoreListingStatus" AS ENUM ('NOT_LISTED', 'PUBLISHING', 'LISTED', 'FAILED');

-- CreateEnum
CREATE TYPE "InventoryAllocationState" AS ENUM ('ALLOCATED', 'FULFILLED', 'RELEASED');

-- CreateTable
CREATE TABLE "SupplierProductStoreListing" (
    "id" TEXT NOT NULL,
    "supplierProductId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productGid" TEXT,
    "externalId" TEXT,
    "handle" TEXT,
    "status" "StoreListingStatus" NOT NULL DEFAULT 'NOT_LISTED',
    "shopifyStatus" TEXT,
    "marginPercent" DECIMAL(6,2),
    "lastError" TEXT,
    "lastPublishedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProductStoreListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProductStoreVariant" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "variantGid" TEXT,
    "inventoryItemGid" TEXT,
    "price" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProductStoreVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopifyWebhookEvent" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopifyWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAllocation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT,
    "shopifyOrderId" TEXT NOT NULL,
    "orderNumber" INTEGER,
    "lineItemId" TEXT NOT NULL,
    "sku" TEXT,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "fulfilledQuantity" INTEGER NOT NULL DEFAULT 0,
    "releasedQuantity" INTEGER NOT NULL DEFAULT 0,
    "state" "InventoryAllocationState" NOT NULL DEFAULT 'ALLOCATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierProductStoreListing_storeId_idx" ON "SupplierProductStoreListing"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProductStoreListing_supplierProductId_storeId_key" ON "SupplierProductStoreListing"("supplierProductId", "storeId");

-- CreateIndex
CREATE INDEX "SupplierProductStoreVariant_variantId_idx" ON "SupplierProductStoreVariant"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProductStoreVariant_listingId_variantId_key" ON "SupplierProductStoreVariant"("listingId", "variantId");

-- CreateIndex
CREATE INDEX "ShopifyWebhookEvent_topic_createdAt_idx" ON "ShopifyWebhookEvent"("topic", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyWebhookEvent_storeId_webhookId_key" ON "ShopifyWebhookEvent"("storeId", "webhookId");

-- CreateIndex
CREATE INDEX "InventoryAllocation_variantId_idx" ON "InventoryAllocation"("variantId");

-- CreateIndex
CREATE INDEX "InventoryAllocation_state_idx" ON "InventoryAllocation"("state");

-- CreateIndex
CREATE INDEX "InventoryAllocation_sku_idx" ON "InventoryAllocation"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAllocation_storeId_shopifyOrderId_lineItemId_key" ON "InventoryAllocation"("storeId", "shopifyOrderId", "lineItemId");

-- AddForeignKey
ALTER TABLE "SupplierProductStoreListing" ADD CONSTRAINT "SupplierProductStoreListing_supplierProductId_fkey" FOREIGN KEY ("supplierProductId") REFERENCES "SupplierProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductStoreListing" ADD CONSTRAINT "SupplierProductStoreListing_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductStoreVariant" ADD CONSTRAINT "SupplierProductStoreVariant_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "SupplierProductStoreListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProductStoreVariant" ADD CONSTRAINT "SupplierProductStoreVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopifyWebhookEvent" ADD CONSTRAINT "ShopifyWebhookEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAllocation" ADD CONSTRAINT "InventoryAllocation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAllocation" ADD CONSTRAINT "InventoryAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAllocation" ADD CONSTRAINT "InventoryAllocation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SupplierProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
