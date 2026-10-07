import prisma from '@/lib/prisma.server';
import type { ShopifyLocation } from '@/lib/shopify-locations.server';

export type StoreLocationRow = {
  id: string;
  storeId: string;
  storeName: string;
  shopifyLocationId: string;
  name: string;
  active: boolean;
  inventoryLocationId: string | null;
};

export class StoreLocationModel {
  /** The hub location a store's Shopify location is mapped to — null when unmapped or never synced. */
  async findMappedLocationId(storeId: string, shopifyLocationId: string): Promise<string | null> {
    const row = await prisma.storeLocation.findUnique({
      where: { storeId_shopifyLocationId: { storeId, shopifyLocationId } },
      select: { inventoryLocationId: true },
    });
    return row?.inventoryLocationId ?? null;
  }

  async listAll(): Promise<StoreLocationRow[]> {
    const rows = await prisma.storeLocation.findMany({
      include: { store: { select: { name: true, storeDomain: true } } },
      orderBy: [{ store: { name: 'asc' } }, { name: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      storeId: r.storeId,
      storeName: r.store.name || r.store.storeDomain,
      shopifyLocationId: r.shopifyLocationId,
      name: r.name,
      active: r.active,
      inventoryLocationId: r.inventoryLocationId,
    }));
  }

  async findById(id: string) {
    return prisma.storeLocation.findUnique({ where: { id }, select: { id: true } });
  }

  /** Brings one store's rows in line with what Shopify returned: names and active flags refreshed,
   * new locations added unmapped, ones Shopify no longer returns marked inactive (mappings kept). */
  async syncStore(storeId: string, locations: ShopifyLocation[]) {
    await prisma.$transaction(async (tx) => {
      for (const l of locations) {
        await tx.storeLocation.upsert({
          where: { storeId_shopifyLocationId: { storeId, shopifyLocationId: l.shopifyLocationId } },
          create: { storeId, shopifyLocationId: l.shopifyLocationId, name: l.name, active: l.active },
          update: { name: l.name, active: l.active },
        });
      }
      await tx.storeLocation.updateMany({
        where: { storeId, shopifyLocationId: { notIn: locations.map((l) => l.shopifyLocationId) } },
        data: { active: false },
      });
    });
  }

  async setMapping(id: string, inventoryLocationId: string | null) {
    await prisma.storeLocation.update({ where: { id }, data: { inventoryLocationId } });
  }
}
