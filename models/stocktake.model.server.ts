import prisma from '@/lib/prisma.server';
import { formatStocktakeNumber } from '@/lib/inventory/stocktake-number';
import { Prisma, type StocktakeStatus } from '@prisma/client';

export const STOCKTAKE_SORT_KEYS = ['number', 'createdAt', 'productName', 'status', 'countedAt', 'completedAt'] as const;
export type StocktakeSortKey = (typeof STOCKTAKE_SORT_KEYS)[number];

export type StocktakeItemRow = {
  id: string;
  variantId: string;
  colour: string;
  size: string;
  sku: string | null;
  locationId: string | null;
  locationName: string | null;
  /** Stock on hand when the stocktake was created. */
  expectedQty: number;
  /** Stock on hand right now. */
  systemQty: number;
  countedQty: number | null;
  /** Locations the variant has now that this stocktake has no line for — a variant with any can't be synced. */
  uncoveredLocations: number;
};

export type StocktakeRow = {
  id: string;
  number: number;
  supplierProductId: string;
  productName: string;
  itemNo: string;
  status: StocktakeStatus;
  startedById: string;
  startedByName: string;
  countedById: string | null;
  countedByName: string | null;
  countedAt: string | null;
  syncedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  itemCount: number;
  countedCount: number;
  items: StocktakeItemRow[];
};

export type StocktakeSyncResult = { adjusted: number; unchanged: number; skipped: number };

type Actor = { id: string; name: string };
type NewLine = { variantId: string; locationId: string | null; countedQty: number | null };

const include = {
  supplierProduct: { select: { name: true, itemNo: true } },
  items: {
    include: {
      variant: { select: { colour: true, size: true, sku: true, stockOnHand: true, position: true, locations: { select: { locationId: true } } } },
    },
  },
};
type StocktakeWithItems = Prisma.StocktakeGetPayload<{ include: typeof include }>;

export class StocktakeModel {
  async create(supplierProductId: string, lines: NewLine[], actor: Actor): Promise<StocktakeRow> {
    return prisma.$transaction(async (tx) => {
      const variantIds = [...new Set(lines.map((l) => l.variantId))];
      const variants = await tx.supplierProductVariant.findMany({
        where: { supplierProductId, id: { in: variantIds } },
        select: { id: true, stockOnHand: true },
      });
      const stockByVariant = new Map(variants.map((v) => [v.id, v.stockOnHand]));
      const locations = await tx.inventoryLocation.findMany({
        where: { id: { in: lines.flatMap((l) => (l.locationId ? [l.locationId] : [])) } },
        select: { id: true, name: true },
      });
      const nameByLocation = new Map(locations.map((l) => [l.id, l.name]));

      const valid = lines.filter((l) => stockByVariant.has(l.variantId));
      const allCounted = valid.length > 0 && valid.every((l) => l.countedQty !== null);
      const anyCounted = valid.some((l) => l.countedQty !== null);
      const row = await tx.stocktake.create({
        data: {
          supplierProductId,
          startedById: actor.id,
          startedByName: actor.name,
          status: allCounted ? 'COUNTED' : 'OPEN',
          ...(anyCounted ? { countedById: actor.id, countedByName: actor.name, countedAt: new Date() } : {}),
          items: {
            create: valid.map((l) => ({
              variantId: l.variantId,
              locationId: l.locationId && nameByLocation.has(l.locationId) ? l.locationId : null,
              locationName: l.locationId ? (nameByLocation.get(l.locationId) ?? null) : null,
              expectedQty: stockByVariant.get(l.variantId) ?? 0,
              countedQty: l.countedQty,
            })),
          },
        },
        include,
      });
      return toRow(row);
    });
  }

  async list(params: {
    search?: string;
    status?: StocktakeStatus;
    dateFrom?: string;
    dateTo?: string;
    /** Non-admins: OPEN stocktakes plus the ones this user created or counted. */
    visibleToUserId?: string;
    sort?: StocktakeSortKey;
    dir?: 'asc' | 'desc';
    page: number;
    pageSize: number;
  }) {
    const { search, status, dateFrom, dateTo, visibleToUserId, sort = 'createdAt', dir = 'desc', page, pageSize } = params;
    const where: Prisma.StocktakeWhereInput = {};
    const and: Prisma.StocktakeWhereInput[] = [];

    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(`${dateFrom}T00:00:00.000Z`) } : {}),
        ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      };
    }
    if (visibleToUserId !== undefined) {
      and.push({ OR: [{ status: 'OPEN' }, { startedById: visibleToUserId }, { countedById: visibleToUserId }] });
    }

    const term = search?.trim();
    if (term) {
      const digits = term.replace(/\D/g, '');
      and.push({
        OR: [
          { supplierProduct: { name: { contains: term, mode: 'insensitive' } } },
          { supplierProduct: { itemNo: { contains: term, mode: 'insensitive' } } },
          { startedByName: { contains: term, mode: 'insensitive' } },
          { countedByName: { contains: term, mode: 'insensitive' } },
          ...(digits ? [{ number: Number(digits) }] : []),
        ],
      });
    }
    if (and.length > 0) where.AND = and;

    const orderBy: Prisma.StocktakeOrderByWithRelationInput[] =
      sort === 'number' ? [{ number: dir }] : sort === 'productName' ? [{ supplierProduct: { name: dir } }, { number: 'desc' }] : [{ [sort]: dir }, { number: 'desc' }];

    const [rows, total] = await Promise.all([
      prisma.stocktake.findMany({ where, include, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.stocktake.count({ where }),
    ]);
    return { stocktakes: rows.map(toRow), total };
  }

  async findById(id: string): Promise<StocktakeRow | null> {
    const row = await prisma.stocktake.findUnique({ where: { id }, include });
    return row ? toRow(row) : null;
  }

  /** Saves the entered counts. Blank lines stay blank; the status follows whether every line has one. */
  async saveCounts(id: string, counts: Array<{ itemId: string; countedQty: number | null }>, actor: Actor): Promise<StocktakeRow> {
    return prisma.$transaction(async (tx) => {
      const stocktake = await tx.stocktake.findUniqueOrThrow({ where: { id }, include });
      const known = new Set(stocktake.items.map((i) => i.id));
      for (const c of counts) {
        if (known.has(c.itemId)) await tx.stocktakeItem.update({ where: { id: c.itemId }, data: { countedQty: c.countedQty } });
      }

      const countedAfter = await tx.stocktakeItem.count({ where: { stocktakeId: id, countedQty: { not: null } } });
      const total = stocktake.items.length;
      const row = await tx.stocktake.update({
        where: { id },
        data: {
          status: total > 0 && countedAfter === total ? 'COUNTED' : 'OPEN',
          ...(countedAfter > 0 ? { countedById: actor.id, countedByName: actor.name, countedAt: new Date() } : { countedById: null, countedByName: null, countedAt: null }),
        },
        include,
      });
      return toRow(row);
    });
  }

  /**
   * Sets each variant's stock on hand to the sum of its counted lines. Locations are tags only, so
   * a variant is skipped unless the stocktake counted every line and covers every location the
   * variant has now — one shelf's count says nothing about the total.
   */
  async sync(id: string, actor: Actor): Promise<{ stocktake: StocktakeRow; result: StocktakeSyncResult }> {
    return prisma.$transaction(async (tx) => {
      const stocktake = await tx.stocktake.findUniqueOrThrow({ where: { id }, include });
      const variantIds = [...new Set(stocktake.items.map((i) => i.variantId))];
      const variants = await tx.supplierProductVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, stockOnHand: true, locations: { select: { locationId: true } } },
      });

      const result: StocktakeSyncResult = { adjusted: 0, unchanged: 0, skipped: 0 };
      for (const variant of variants) {
        const lines = stocktake.items.filter((i) => i.variantId === variant.id);
        const countedLocationIds = new Set(lines.flatMap((l) => (l.locationId ? [l.locationId] : [])));
        const coversLocations = variant.locations.every((l) => countedLocationIds.has(l.locationId));
        if (!lines.every((l) => l.countedQty !== null) || !coversLocations) {
          result.skipped++;
          continue;
        }
        const counted = lines.reduce((sum, l) => sum + (l.countedQty ?? 0), 0);
        if (counted === variant.stockOnHand) {
          result.unchanged++;
          continue;
        }
        await tx.supplierProductVariant.update({ where: { id: variant.id }, data: { stockOnHand: counted } });
        result.adjusted++;
      }

      await tx.inventoryActivity.create({
        data: {
          supplierProductId: stocktake.supplierProductId,
          type: 'stocktake_completed',
          message: `Stocktake ${formatStocktakeNumber(stocktake.number)} synced — ${result.adjusted} variant${result.adjusted === 1 ? '' : 's'} adjusted${result.skipped > 0 ? `, ${result.skipped} skipped (not fully counted)` : ''}`,
          actorId: actor.id,
          actorName: actor.name,
        },
      });

      const row = await tx.stocktake.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date(), syncedById: actor.id, syncedByName: actor.name },
        include,
      });
      return { stocktake: toRow(row), result };
    });
  }

  async cancel(id: string): Promise<StocktakeRow> {
    const row = await prisma.stocktake.update({ where: { id }, data: { status: 'CANCELLED' }, include });
    return toRow(row);
  }
}

function toRow(row: StocktakeWithItems): StocktakeRow {
  const countedLocations = new Map<string, Set<string>>();
  for (const i of row.items) {
    const set = countedLocations.get(i.variantId) ?? new Set<string>();
    if (i.locationId) set.add(i.locationId);
    countedLocations.set(i.variantId, set);
  }
  const items = [...row.items]
    .sort((a, b) => a.variant.position - b.variant.position || (a.locationName ?? '').localeCompare(b.locationName ?? ''))
    .map((i) => ({
      id: i.id,
      variantId: i.variantId,
      colour: i.variant.colour,
      size: i.variant.size,
      sku: i.variant.sku,
      locationId: i.locationId,
      locationName: i.locationName,
      expectedQty: i.expectedQty,
      systemQty: i.variant.stockOnHand,
      countedQty: i.countedQty,
      uncoveredLocations: i.variant.locations.filter((l) => !countedLocations.get(i.variantId)?.has(l.locationId)).length,
    }));
  return {
    id: row.id,
    number: row.number,
    supplierProductId: row.supplierProductId,
    productName: row.supplierProduct.name,
    itemNo: row.supplierProduct.itemNo,
    status: row.status,
    startedById: row.startedById,
    startedByName: row.startedByName,
    countedById: row.countedById,
    countedByName: row.countedByName,
    countedAt: row.countedAt?.toISOString() ?? null,
    syncedByName: row.syncedByName,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    itemCount: items.length,
    countedCount: items.filter((i) => i.countedQty !== null).length,
    items,
  };
}
