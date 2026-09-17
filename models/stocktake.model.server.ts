import prisma from '@/lib/prisma.server';
import { Prisma } from '@prisma/client';

export type StocktakeItemRow = {
  id: string;
  variantId: string;
  colour: string;
  size: string;
  sku: string | null;
  expectedQty: number;
  countedQty: number | null;
};

export type StocktakeRow = {
  id: string;
  supplierProductId: string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  startedByName: string;
  completedAt: string | null;
  createdAt: string;
  items: StocktakeItemRow[];
};

const include = { items: { include: { variant: { select: { colour: true, size: true, sku: true } } } } };
type StocktakeWithItems = Prisma.StocktakeGetPayload<{ include: typeof include }>;

export class StocktakeModel {
  async findOpen(supplierProductId: string): Promise<StocktakeRow | null> {
    const row = await prisma.stocktake.findFirst({ where: { supplierProductId, status: 'OPEN' }, include, orderBy: { createdAt: 'desc' } });
    return row ? toRow(row) : null;
  }

  async findById(id: string): Promise<StocktakeRow | null> {
    const row = await prisma.stocktake.findUnique({ where: { id }, include });
    return row ? toRow(row) : null;
  }

  async start(supplierProductId: string, actor: { id: string; name: string }): Promise<StocktakeRow> {
    const existing = await this.findOpen(supplierProductId);
    if (existing) {
      if (existing.items.length > 0) return existing;
      // Its items were cascade-deleted when the product's variants were replaced while this
      // stocktake was still open — cancel the orphaned record so a fresh one can start instead
      // of leaving the product unable to ever complete a stocktake again.
      await prisma.stocktake.update({ where: { id: existing.id }, data: { status: 'CANCELLED' } });
    }

    const variants = await prisma.supplierProductVariant.findMany({ where: { supplierProductId }, select: { id: true, stockOnHand: true } });
    const row = await prisma.stocktake.create({
      data: {
        supplierProductId,
        startedById: actor.id,
        startedByName: actor.name,
        items: { create: variants.map((v) => ({ variantId: v.id, expectedQty: v.stockOnHand })) },
      },
      include,
    });
    return toRow(row);
  }

  async complete(id: string, counts: Array<{ itemId: string; countedQty: number }>, actor: { id: string; name: string }): Promise<StocktakeRow> {
    return prisma.$transaction(async (tx) => {
      const stocktake = await tx.stocktake.findUniqueOrThrow({ where: { id }, include });
      let varianceCount = 0;

      for (const count of counts) {
        const item = stocktake.items.find((i) => i.id === count.itemId);
        if (!item) continue;
        await tx.stocktakeItem.update({ where: { id: item.id }, data: { countedQty: count.countedQty } });
        const variance = count.countedQty - item.expectedQty;
        if (variance !== 0) {
          varianceCount++;
          await tx.supplierProductVariant.update({ where: { id: item.variantId }, data: { stockOnHand: count.countedQty } });
        }
      }

      const nextStocktakeAt = new Date();
      nextStocktakeAt.setDate(nextStocktakeAt.getDate() + 90);

      await tx.supplierProduct.update({ where: { id: stocktake.supplierProductId }, data: { nextStocktakeAt } });
      await tx.inventoryActivity.create({
        data: {
          supplierProductId: stocktake.supplierProductId,
          type: 'stocktake_completed',
          message: `Stocktake completed — ${varianceCount} variant${varianceCount === 1 ? '' : 's'} adjusted`,
          actorId: actor.id,
          actorName: actor.name,
        },
      });

      const row = await tx.stocktake.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() }, include });
      return toRow(row);
    });
  }
}

function toRow(row: StocktakeWithItems): StocktakeRow {
  return {
    id: row.id,
    supplierProductId: row.supplierProductId,
    status: row.status,
    startedByName: row.startedByName,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      colour: i.variant.colour,
      size: i.variant.size,
      sku: i.variant.sku,
      expectedQty: i.expectedQty,
      countedQty: i.countedQty,
    })),
  };
}
