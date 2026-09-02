import prisma from '@/lib/prisma.server';
import { StockAdjustmentReason } from '@prisma/client';

/** "Black / M", "Black" (colour-only), "M" (size-only), or "—" (neither axis). */
function variantTitle(colour: string, size: string): string {
  return [colour, size].filter(Boolean).join(' / ') || '—';
}

export type StockAdjustmentRow = {
  id: string;
  variantId: string;
  colour: string;
  size: string;
  delta: number;
  reason: StockAdjustmentReason;
  note: string | null;
  actorName: string;
  createdAt: string;
};

export class StockAdjustmentModel {
  async listForProduct(supplierProductId: string): Promise<StockAdjustmentRow[]> {
    const rows = await prisma.stockAdjustment.findMany({
      where: { supplierProductId },
      include: { variant: { select: { colour: true, size: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      variantId: r.variantId,
      colour: r.variant.colour,
      size: r.variant.size,
      delta: r.delta,
      reason: r.reason,
      note: r.note,
      actorName: r.actorName,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async create(data: {
    supplierProductId: string;
    variantId: string;
    delta: number;
    reason: StockAdjustmentReason;
    note: string | null;
    actorId: string;
    actorName: string;
  }): Promise<void> {
    await this.createMany([data]);
  }

  /** Applies every adjustment in one transaction, so a multi-row save is all-or-nothing. */
  async createMany(
    items: {
      supplierProductId: string;
      variantId: string;
      delta: number;
      reason: StockAdjustmentReason;
      note: string | null;
      actorId: string;
      actorName: string;
    }[]
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const data of items) {
        await tx.supplierProductVariant.update({ where: { id: data.variantId }, data: { stockOnHand: { increment: data.delta } } });
        await tx.stockAdjustment.create({ data });
        const variant = await tx.supplierProductVariant.findUniqueOrThrow({ where: { id: data.variantId }, select: { colour: true, size: true } });
        await tx.inventoryActivity.create({
          data: {
            supplierProductId: data.supplierProductId,
            variantId: data.variantId,
            type: 'stock_adjusted',
            message: `${data.delta > 0 ? '+' : ''}${data.delta} on ${variantTitle(variant.colour, variant.size)} (${data.reason.toLowerCase()})`,
            actorId: data.actorId,
            actorName: data.actorName,
          },
        });
      }
    });
  }
}
