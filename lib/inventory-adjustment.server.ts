import type { Prisma, StockAdjustmentReason, StockAdjustmentSource } from '@prisma/client';
import { formatAdjustmentNumber } from '@/lib/inventory/adjustment-number';

type Tx = Prisma.TransactionClient;

export type AdjustmentLineInput = { variantId: string; delta: number; reason: StockAdjustmentReason; note: string | null };

/** "Black / M", "Black" (colour-only), "M" (size-only), or "—" (neither axis). */
function variantTitle(colour: string, size: string): string {
  return [colour, size].filter(Boolean).join(' / ') || '—';
}

/**
 * Applies the lines to stock on hand and records them as ONE adjustment (a StockAdjustmentBatch) with
 * ONE activity entry, inside the caller's transaction — used by the adjustment modal and by a
 * stocktake sync so both land in the Adjustments tab the same way.
 */
export async function recordAdjustmentBatch(
  tx: Tx,
  args: {
    supplierProductId: string;
    source: StockAdjustmentSource;
    /** Display reference of what produced it, e.g. the stocktake's ST-0007. */
    reference?: string | null;
    lines: AdjustmentLineInput[];
    actor: { id: string; name: string };
    /** For a caller that logs its own activity entry (a stocktake sync). */
    skipActivity?: boolean;
  }
) {
  const { supplierProductId, source, reference = null, lines, actor, skipActivity = false } = args;
  const batch = await tx.stockAdjustmentBatch.create({
    data: { supplierProductId, source, reference, actorId: actor.id, actorName: actor.name },
  });

  let net = 0;
  const titles: string[] = [];
  for (const line of lines) {
    const variant = await tx.supplierProductVariant.findUniqueOrThrow({ where: { id: line.variantId }, select: { colour: true, size: true, stockOnHand: true } });
    await tx.supplierProductVariant.update({ where: { id: line.variantId }, data: { stockOnHand: { increment: line.delta } } });
    await tx.stockAdjustment.create({
      data: { ...line, batchId: batch.id, supplierProductId, stockBefore: variant.stockOnHand, actorId: actor.id, actorName: actor.name },
    });
    net += line.delta;
    titles.push(variantTitle(variant.colour, variant.size));
  }

  if (!skipActivity) {
    const signedNet = `${net > 0 ? '+' : ''}${net}`;
    await tx.inventoryActivity.create({
      data: {
        supplierProductId,
        type: 'stock_adjusted',
        message: `${formatAdjustmentNumber(batch.number)} — ${lines.length === 1 ? `${signedNet} on ${titles[0]}` : `${lines.length} variants adjusted, net ${signedNet}`}`,
        adjustmentBatchId: batch.id,
        actorId: actor.id,
        actorName: actor.name,
      },
    });
  }
  return batch;
}
