import prisma from '@/lib/prisma.server';

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

  /** Replaces one variant's location set. */
  async setVariantLocations(variantId: string, locationIds: string[]) {
    await prisma.$transaction([
      prisma.supplierProductVariantLocation.deleteMany({ where: { variantId, locationId: { notIn: locationIds } } }),
      prisma.supplierProductVariantLocation.createMany({ data: locationIds.map((locationId) => ({ variantId, locationId })), skipDuplicates: true }),
    ]);
  }

  /** Bulk: `add` keeps each variant's existing locations and adds `locationIds`; `replace` makes
   * `locationIds` exactly each variant's set (an empty list clears them). */
  async bulkSetVariantLocations(variantIds: string[], locationIds: string[], mode: 'add' | 'replace') {
    const ops = [];
    if (mode === 'replace') {
      ops.push(prisma.supplierProductVariantLocation.deleteMany({ where: { variantId: { in: variantIds }, locationId: { notIn: locationIds } } }));
    }
    ops.push(
      prisma.supplierProductVariantLocation.createMany({
        data: variantIds.flatMap((variantId) => locationIds.map((locationId) => ({ variantId, locationId }))),
        skipDuplicates: true,
      })
    );
    await prisma.$transaction(ops);
  }
}
