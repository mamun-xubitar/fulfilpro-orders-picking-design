import prisma from '@/lib/prisma.server';
import { assignLocations, describeHolding, setLocationStock, StockError } from '@/lib/inventory-stock.server';

export type LocationRow = {
  id: string;
  name: string;
  description: string | null;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LocationOption = { id: string; name: string };

type LocationWithCount = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { variants: number };
};

const WITH_COUNT = { _count: { select: { variants: true } } } as const;

function toLocationRow(row: LocationWithCount): LocationRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    variantCount: row._count.variants,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class LocationModel {
  async list(params: { search?: string; page: number; pageSize: number }) {
    const where = params.search ? { name: { contains: params.search, mode: 'insensitive' as const } } : {};
    const [total, rows] = await Promise.all([
      prisma.inventoryLocation.count({ where }),
      prisma.inventoryLocation.findMany({
        where,
        include: WITH_COUNT,
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return { total, locations: rows.map(toLocationRow) };
  }

  async listOptions(): Promise<LocationOption[]> {
    return prisma.inventoryLocation.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<LocationRow | null> {
    const row = await prisma.inventoryLocation.findUnique({ where: { id }, include: WITH_COUNT });
    return row ? toLocationRow(row) : null;
  }

  async findByName(name: string): Promise<LocationRow | null> {
    const row = await prisma.inventoryLocation.findUnique({ where: { name }, include: WITH_COUNT });
    return row ? toLocationRow(row) : null;
  }

  async create(data: { name: string; description: string | null }) {
    return toLocationRow(await prisma.inventoryLocation.create({ data, include: WITH_COUNT }));
  }

  async update(id: string, data: { name?: string; description?: string | null }) {
    return toLocationRow(await prisma.inventoryLocation.update({ where: { id }, data, include: WITH_COUNT }));
  }

  async delete(id: string) {
    await prisma.inventoryLocation.delete({ where: { id } });
  }

  async countExisting(ids: string[]): Promise<number> {
    return prisma.inventoryLocation.count({ where: { id: { in: ids } } });
  }

  /** Replaces one variant's locations and the stock held at each — see setLocationStock. */
  async setVariantLocationStock(variantId: string, entries: { locationId: string; quantity: number }[]) {
    await prisma.$transaction((tx) => setLocationStock(tx, variantId, entries));
  }

  /** Bulk: `add` keeps each variant's existing locations and adds `locationIds`; `replace` makes
   * `locationIds` exactly each variant's set (an empty list clears them). All-or-nothing: refused
   * when a location being dropped still holds stock. */
  async bulkSetVariantLocations(variantIds: string[], locationIds: string[], mode: 'add' | 'replace') {
    await prisma.$transaction(async (tx) => {
      const locations = await tx.inventoryLocation.findMany({ where: { id: { in: locationIds } }, select: { id: true, name: true } });
      const namesById = new Map(locations.map((l) => [l.id, l.name]));
      const variants = await tx.supplierProductVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, colour: true, size: true } });
      // Variants refused for the same reason (same locations holding the same stock) are reported once.
      const refused = new Map<string, { labels: string[]; error: StockError }>();
      for (const v of variants) {
        try {
          await assignLocations(tx, v.id, locationIds, namesById, mode);
        } catch (error) {
          if (!(error instanceof StockError)) throw error;
          const group = refused.get(error.message) ?? { labels: [], error };
          group.labels.push([v.colour, v.size].filter(Boolean).join(' / ') || 'Variant');
          refused.set(error.message, group);
        }
      }
      if (refused.size === 0) return;
      const groups = [...refused.values()].map(({ labels, error }) => {
        const who = labels.length <= 3 ? labels.join(', ') : `${labels.length} variants`;
        return error.holding.length > 0 ? `${who}: ${describeHolding(error.holding)}` : `${who}: ${error.message}`;
      });
      throw new StockError(`Can’t remove locations that still hold stock — set them to 0 first. ${groups.join('; ')}.`);
    });
  }
}
