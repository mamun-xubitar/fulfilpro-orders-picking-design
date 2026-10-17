import 'dotenv/config';
import prisma from '@/lib/prisma.server';

/**
 * One-off repair for purchase-order lines that lost their variant link. `PurchaseOrderItem.variantId`
 * is ON DELETE SET NULL, and the Colour & size modal's "replace" mode used to delete and recreate
 * every variant of a product — so open PO lines went `variantId = null` and their incoming quantity
 * vanished from the Variants / stock table.
 *
 * For each unlinked line, finds the product's current variant by SKU (case-insensitive), else by the
 * line's stored title ("Colour / Size", colour-only or size-only), and re-links it. A line is skipped
 * when no single variant matches, or when its PO already has a line on that variant (unique per PO).
 *
 * Run with: npx tsx scripts/backfill-po-item-variants.ts [--dry-run]
 */
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const items = await prisma.purchaseOrderItem.findMany({
    where: { variantId: null },
    select: { id: true, sku: true, variantTitle: true, purchaseOrderId: true, purchaseOrder: { select: { number: true, supplierProductId: true } } },
  });
  if (items.length === 0) {
    console.log('No unlinked purchase order lines.');
    return;
  }

  const productIds = [...new Set(items.map((i) => i.purchaseOrder.supplierProductId))];
  const variants = await prisma.supplierProductVariant.findMany({
    where: { supplierProductId: { in: productIds } },
    select: { id: true, supplierProductId: true, sku: true, colour: true, size: true },
  });
  const variantsByProduct = new Map<string, typeof variants>();
  for (const v of variants) variantsByProduct.set(v.supplierProductId, [...(variantsByProduct.get(v.supplierProductId) ?? []), v]);

  const taken = new Set(
    (await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: { in: items.map((i) => i.purchaseOrderId) }, variantId: { not: null } }, select: { purchaseOrderId: true, variantId: true } })).map(
      (i) => `${i.purchaseOrderId}::${i.variantId}`
    )
  );

  let linked = 0;
  let unresolved = 0;
  for (const item of items) {
    const candidates = variantsByProduct.get(item.purchaseOrder.supplierProductId) ?? [];
    const title = item.variantTitle.trim().toLowerCase();
    const bySku = item.sku ? candidates.filter((v) => v.sku?.toLowerCase() === item.sku!.toLowerCase()) : [];
    const byTitle = candidates.filter((v) => [v.colour, v.size].filter(Boolean).join(' / ').toLowerCase() === title);
    const matches = bySku.length === 1 ? bySku : byTitle;
    const label = `PO #${item.purchaseOrder.number} "${item.variantTitle}"`;
    if (matches.length !== 1) {
      console.log(`Unresolved ${label}: ${matches.length} matching variants.`);
      unresolved++;
      continue;
    }
    const key = `${item.purchaseOrderId}::${matches[0].id}`;
    if (taken.has(key)) {
      console.log(`Skipped ${label}: the PO already has a line on that variant.`);
      unresolved++;
      continue;
    }
    if (!DRY_RUN) await prisma.purchaseOrderItem.update({ where: { id: item.id }, data: { variantId: matches[0].id } });
    taken.add(key);
    console.log(`${DRY_RUN ? 'Would link' : 'Linked'} ${label} -> ${matches[0].id}`);
    linked++;
  }
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${linked} linked, ${unresolved} unresolved.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
