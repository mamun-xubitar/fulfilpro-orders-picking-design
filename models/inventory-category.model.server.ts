import prisma from '@/lib/prisma.server';

export type InventoryCategoryRow = { id: string; name: string };

/** Flat hub-only category library — distinct from the nested Shopify taxonomy on
 * SupplierProduct.category/categoryId. Always listed A→Z, mirroring GlobalColour. */
export class InventoryCategoryModel {
  async list(): Promise<InventoryCategoryRow[]> {
    const rows = await prisma.inventoryCategory.findMany({ orderBy: { name: 'asc' } });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async findByName(name: string): Promise<InventoryCategoryRow | null> {
    const row = await prisma.inventoryCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    return row ? { id: row.id, name: row.name } : null;
  }

  async create(name: string): Promise<InventoryCategoryRow> {
    const row = await prisma.inventoryCategory.create({ data: { name } });
    return { id: row.id, name: row.name };
  }

  async findById(id: string): Promise<InventoryCategoryRow | null> {
    const row = await prisma.inventoryCategory.findUnique({ where: { id } });
    return row ? { id: row.id, name: row.name } : null;
  }
}
