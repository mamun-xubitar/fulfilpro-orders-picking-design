import prisma from '@/lib/prisma.server';
import { StoreListingStatus } from '@prisma/client';

export type StoreListingRow = {
  storeId: string;
  productGid: string | null;
  externalId: string | null;
  handle: string | null;
  status: StoreListingStatus;
  shopifyStatus: string | null;
  marginPercent: number | null;
  lastError: string | null;
  lastPublishedAt: string | null;
};

export type StoreVariantMapRow = { hubVariantId: string; variantGid: string; inventoryItemGid: string | null; price: number | null };

export class StoreListingModel {
  /** Persisted listing rows for one hub product, keyed by storeId — used to merge status/margin/
   * error onto the live Shopify lookup in StoreListingController.list. */
  async listForProduct(supplierProductId: string): Promise<StoreListingRow[]> {
    const rows = await prisma.supplierProductStoreListing.findMany({ where: { supplierProductId } });
    return rows.map((r) => ({
      storeId: r.storeId,
      productGid: r.productGid,
      externalId: r.externalId,
      handle: r.handle,
      status: r.status,
      shopifyStatus: r.shopifyStatus,
      marginPercent: r.marginPercent !== null ? Number(r.marginPercent) : null,
      lastError: r.lastError,
      lastPublishedAt: r.lastPublishedAt ? r.lastPublishedAt.toISOString() : null,
    }));
  }

  async findOne(supplierProductId: string, storeId: string) {
    return prisma.supplierProductStoreListing.findUnique({ where: { supplierProductId_storeId: { supplierProductId, storeId } } });
  }

  async markPublishing(supplierProductId: string, storeId: string) {
    await prisma.supplierProductStoreListing.upsert({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      create: { supplierProductId, storeId, status: 'PUBLISHING' },
      update: { status: 'PUBLISHING' },
    });
  }

  async markPublished(
    supplierProductId: string,
    storeId: string,
    data: { productGid: string; externalId: string; handle: string; shopifyStatus: string }
  ) {
    await prisma.supplierProductStoreListing.update({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      data: { ...data, status: 'LISTED', lastError: null, lastPublishedAt: new Date(), lastSyncedAt: new Date() },
    });
  }

  async markFailed(supplierProductId: string, storeId: string, error: string) {
    await prisma.supplierProductStoreListing.update({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      data: { status: 'FAILED', lastError: error },
    });
  }

  async setMargin(supplierProductId: string, storeId: string, marginPercent: number | null) {
    await prisma.supplierProductStoreListing.upsert({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      create: { supplierProductId, storeId, marginPercent },
      update: { marginPercent },
    });
  }

  async upsertVariantMappings(supplierProductId: string, storeId: string, variants: StoreVariantMapRow[]) {
    const listing = await prisma.supplierProductStoreListing.findUnique({ where: { supplierProductId_storeId: { supplierProductId, storeId } } });
    if (!listing) return;

    await prisma.$transaction(
      variants.map((v) =>
        prisma.supplierProductStoreVariant.upsert({
          where: { listingId_variantId: { listingId: listing.id, variantId: v.hubVariantId } },
          create: { listingId: listing.id, variantId: v.hubVariantId, variantGid: v.variantGid, inventoryItemGid: v.inventoryItemGid, price: v.price },
          update: { variantGid: v.variantGid, inventoryItemGid: v.inventoryItemGid, price: v.price },
        })
      )
    );
  }
}
