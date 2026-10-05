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
    await prisma.supplierProductStoreListing.upsert({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      create: { supplierProductId, storeId, ...data, status: 'LISTED', lastPublishedAt: new Date(), lastSyncedAt: new Date() },
      update: { ...data, status: 'LISTED', lastError: null, lastPublishedAt: new Date(), lastSyncedAt: new Date() },
    });
  }

  async markFailed(supplierProductId: string, storeId: string, error: string) {
    await prisma.supplierProductStoreListing.upsert({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      create: { supplierProductId, storeId, status: 'FAILED', lastError: error },
      update: { status: 'FAILED', lastError: error },
    });
  }

  /** Adopts a product found on Shopify but with no local row (externally created / pre-table
   * listing) as LISTED without clobbering a concurrently publishing row. */
  async adoptExternal(
    supplierProductId: string,
    storeId: string,
    data: { productGid: string; externalId: string; handle: string; shopifyStatus: string }
  ) {
    const existing = await prisma.supplierProductStoreListing.findUnique({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
    });
    if (existing) return;
    await prisma.supplierProductStoreListing.create({
      data: { supplierProductId, storeId, ...data, status: 'LISTED', lastSyncedAt: new Date() },
    });
  }

  async setMargin(supplierProductId: string, storeId: string, marginPercent: number | null) {
    await prisma.supplierProductStoreListing.upsert({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      create: { supplierProductId, storeId, marginPercent },
      update: { marginPercent },
    });
  }

  async listVariantMappings(supplierProductId: string, storeId: string): Promise<StoreVariantMapRow[]> {
    const listing = await prisma.supplierProductStoreListing.findUnique({
      where: { supplierProductId_storeId: { supplierProductId, storeId } },
      include: { variants: true },
    });
    if (!listing) return [];
    return listing.variants.map((v) => ({
      hubVariantId: v.variantId,
      variantGid: v.variantGid ?? '',
      inventoryItemGid: v.inventoryItemGid,
      price: v.price !== null ? Number(v.price) : null,
    }));
  }

  /** Removes mapping rows for hub variants no longer present in a store's push — keeps the DB in
   * sync with productSet's full-replacement semantics, which delete any Shopify variant omitted
   * from the submitted list. Guards against an empty `keepHubVariantIds`: Prisma's `notIn: []`
   * matches every row, which would otherwise wipe the whole mapping set. */
  async pruneVariantMappings(supplierProductId: string, storeId: string, keepHubVariantIds: string[]) {
    if (keepHubVariantIds.length === 0) return;
    const listing = await prisma.supplierProductStoreListing.findUnique({ where: { supplierProductId_storeId: { supplierProductId, storeId } } });
    if (!listing) return;
    await prisma.supplierProductStoreVariant.deleteMany({
      where: { listingId: listing.id, variantId: { notIn: keepHubVariantIds } },
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

  /** Drops the mapping rows for Shopify variants deleted straight from the differences modal, so a
   * later publish never resends a dead variantGid. */
  async deleteVariantMappingsByGid(supplierProductId: string, storeId: string, variantGids: string[]) {
    if (variantGids.length === 0) return;
    const listing = await prisma.supplierProductStoreListing.findUnique({ where: { supplierProductId_storeId: { supplierProductId, storeId } } });
    if (!listing) return;
    await prisma.supplierProductStoreVariant.deleteMany({ where: { listingId: listing.id, variantGid: { in: variantGids } } });
  }
}
