import type { Prisma, StockAdjustmentReason, StockAdjustmentSource } from '@prisma/client';
import { formatAdjustmentNumber } from '@/lib/inventory/adjustment-number';
import { addStock } from '@/lib/inventory-stock.server';

type Tx = Prisma.TransactionClient;

/** `locationId` is where the change lands — null puts it at the variant's first location, or on its
 * unassigned stock when it has none. */
export type AdjustmentLineInput = { variantId: string; locationId: string | null; delta: number; reason: StockAdjustmentReason; note: string | null };

/** "Black / M", "Black" (colour-only), "M" (size-only), or "—" (neither axis). */
function variantTitle(colour: string, size: string): string {
  return [colour, size].filter(Boolean).join(' / ') || '—';
}

/**
 * Applies the lines to stock (each at its own location) and records them as ONE adjustment (a StockAdjustmentBatch) with
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
    const variant = await tx.supplierProductVariant.findUniqueOrThrow({ where: { id: line.variantId }, select: { colour: true, size: true } });
    const move = await addStock(tx, line.variantId, line.locationId, line.delta);
    await tx.stockAdjustment.create({
      data: {
        ...line,
        batchId: batch.id,
        supplierProductId,
        locationId: move?.locationId ?? null,
        locationName: move?.locationName ?? null,
        stockBefore: move?.before ?? null,
        actorId: actor.id,
        actorName: actor.name,
      },
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
