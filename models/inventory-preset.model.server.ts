import prisma from '@/lib/prisma.server';

export type ColourPresetRow = { id: string; name: string; key: string; createdAt: string };
export type SizePresetRow = { id: string; name: string; key: string; createdAt: string };

/** Normalises a preset name into its case-insensitive uniqueness key — lowercased, whitespace stripped. */
export function presetKeyOf(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

export class InventoryPresetModel {
  async listColours(): Promise<ColourPresetRow[]> {
    const rows = await prisma.colourPreset.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => ({ id: r.id, name: r.name, key: r.key, createdAt: r.createdAt.toISOString() }));
  }

  async listSizes(): Promise<SizePresetRow[]> {
    const rows = await prisma.sizePreset.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => ({ id: r.id, name: r.name, key: r.key, createdAt: r.createdAt.toISOString() }));
  }

  async findColourByKey(key: string): Promise<ColourPresetRow | null> {
    const row = await prisma.colourPreset.findUnique({ where: { key } });
    return row ? { id: row.id, name: row.name, key: row.key, createdAt: row.createdAt.toISOString() } : null;
  }

  async findSizeByKey(key: string): Promise<SizePresetRow | null> {
    const row = await prisma.sizePreset.findUnique({ where: { key } });
    return row ? { id: row.id, name: row.name, key: row.key, createdAt: row.createdAt.toISOString() } : null;
  }

  async createColour(data: { name: string; key: string }): Promise<ColourPresetRow> {
    const row = await prisma.colourPreset.create({ data });
    return { id: row.id, name: row.name, key: row.key, createdAt: row.createdAt.toISOString() };
  }

  async createSize(data: { name: string; key: string }): Promise<SizePresetRow> {
    const row = await prisma.sizePreset.create({ data });
    return { id: row.id, name: row.name, key: row.key, createdAt: row.createdAt.toISOString() };
  }

  async deleteColours(ids: string[]): Promise<number> {
    const result = await prisma.colourPreset.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }

  async deleteSizes(ids: string[]): Promise<number> {
    const result = await prisma.sizePreset.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }
}
