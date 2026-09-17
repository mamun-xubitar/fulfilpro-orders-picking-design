import prisma from '@/lib/prisma.server';

export type GlobalOptionRow = { id: string; name: string };

/**
 * Flat global colour/size libraries backing the "Colour & size adjustment" modal — replaces the
 * old ColourPresetGroup/SizePresetGroup preset-group system. Colours always render A→Z; sizes
 * keep the order they were added in (`position`).
 */
export class InventoryOptionLibraryModel {
  async listColours(): Promise<GlobalOptionRow[]> {
    const rows = await prisma.globalColour.findMany({ orderBy: { name: 'asc' } });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async listSizes(): Promise<GlobalOptionRow[]> {
    const rows = await prisma.globalSize.findMany({ orderBy: { position: 'asc' } });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  /** Inserts any name not already in the library (case-insensitive match against existing rows
   * is done by the controller before calling this) — `skipDuplicates` guards the exact-name race. */
  async addColours(names: string[]): Promise<void> {
    if (names.length === 0) return;
    await prisma.globalColour.createMany({ data: names.map((name) => ({ name })), skipDuplicates: true });
  }

  async addSizes(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const last = await prisma.globalSize.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
    let position = (last?.position ?? -1) + 1;
    await prisma.globalSize.createMany({
      data: names.map((name) => ({ name, position: position++ })),
      skipDuplicates: true,
    });
  }

  async deleteColour(id: string): Promise<boolean> {
    const result = await prisma.globalColour.deleteMany({ where: { id } });
    return result.count > 0;
  }

  async deleteSize(id: string): Promise<boolean> {
    const result = await prisma.globalSize.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
