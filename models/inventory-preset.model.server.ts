import prisma from '@/lib/prisma.server';

export type ColourPresetGroupRow = { id: string; items: string[]; key: string; createdAt: string };
export type SizePresetGroupRow = { id: string; items: string[]; key: string; createdAt: string };

/** Normalises a preset member into its case-insensitive uniqueness key — lowercased, whitespace stripped. */
export function presetKeyOf(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '');
}

/** Order-insensitive identity of a whole group — de-duped, sorted, "|"-joined member keys, so
 * (Red, Blue) and (Blue, Red) collide as the same group. "|" is reserved and rejected as a member
 * character by the controller, so a join can never be ambiguous. For a single-member group this
 * equals presetKeyOf(that member) — the property the preset_groups migration relies on to convert
 * every pre-existing preset into a one-item group without rewriting `key`. */
export function groupKeyOf(items: string[]): string {
  return [...new Set(items.map(presetKeyOf).filter(Boolean))].sort().join('|');
}

function toColourGroupRow(row: { id: string; items: string[]; key: string; createdAt: Date }): ColourPresetGroupRow {
  return { id: row.id, items: row.items, key: row.key, createdAt: row.createdAt.toISOString() };
}

function toSizeGroupRow(row: { id: string; items: string[]; key: string; createdAt: Date }): SizePresetGroupRow {
  return { id: row.id, items: row.items, key: row.key, createdAt: row.createdAt.toISOString() };
}

export class InventoryPresetModel {
  async listColourGroups(): Promise<ColourPresetGroupRow[]> {
    const rows = await prisma.colourPresetGroup.findMany({ orderBy: { key: 'asc' } });
    return rows.map(toColourGroupRow);
  }

  async listSizeGroups(): Promise<SizePresetGroupRow[]> {
    const rows = await prisma.sizePresetGroup.findMany({ orderBy: { key: 'asc' } });
    return rows.map(toSizeGroupRow);
  }

  async findColourGroupByKey(key: string): Promise<ColourPresetGroupRow | null> {
    const row = await prisma.colourPresetGroup.findUnique({ where: { key } });
    return row ? toColourGroupRow(row) : null;
  }

  async findSizeGroupByKey(key: string): Promise<SizePresetGroupRow | null> {
    const row = await prisma.sizePresetGroup.findUnique({ where: { key } });
    return row ? toSizeGroupRow(row) : null;
  }

  async createColourGroup(data: { items: string[]; key: string }): Promise<ColourPresetGroupRow> {
    const row = await prisma.colourPresetGroup.create({ data });
    return toColourGroupRow(row);
  }

  async createSizeGroup(data: { items: string[]; key: string }): Promise<SizePresetGroupRow> {
    const row = await prisma.sizePresetGroup.create({ data });
    return toSizeGroupRow(row);
  }

  async deleteColourGroups(ids: string[]): Promise<number> {
    const result = await prisma.colourPresetGroup.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }

  async deleteSizeGroups(ids: string[]): Promise<number> {
    const result = await prisma.sizePresetGroup.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }
}
