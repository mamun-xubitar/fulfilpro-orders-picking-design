import 'dotenv/config';
import prisma from '@/lib/prisma.server';
import { searchTaxonomyCategories } from '@/lib/shopify-taxonomy.server';

/**
 * One-off repair for `SupplierProduct.category` rows saved before the category picker started
 * storing the full Shopify taxonomy path — they hold just the leaf name (e.g. "Visors"), which
 * Shopify's product-CSV `Product Category` column rejects as invalid. For each such row: search
 * the taxonomy for that leaf name, prefer a result whose `id` matches the stored `categoryId`,
 * else take it only when the leaf name matches exactly one result; otherwise clear the category
 * (an empty value is valid to Shopify) rather than guess.
 *
 * Run with: npm run backfill:category-full-names
 */
async function main() {
  const rows = await prisma.supplierProduct.findMany({
    where: { category: { not: null } },
    select: { id: true, category: true, categoryId: true },
  });
  const candidates = rows.filter((r) => r.category && !r.category.includes('>'));
  if (candidates.length === 0) {
    console.log('No products need a category backfill.');
    return;
  }

  const store = await prisma.store.findFirst({ where: { accessToken: { not: null } }, select: { id: true } });
  if (!store) {
    console.error('No connected store found — cannot query the Shopify taxonomy.');
    process.exitCode = 1;
    return;
  }

  let resolved = 0;
  let cleared = 0;
  for (const row of candidates) {
    const leaf = row.category!.trim();
    let fullName = '';
    try {
      const results = await searchTaxonomyCategories(store.id, { search: leaf });
      const byId = row.categoryId ? results.find((c) => c.id === row.categoryId) : undefined;
      const exactMatches = results.filter((c) => c.name.toLowerCase() === leaf.toLowerCase());
      const match = byId ?? (exactMatches.length === 1 ? exactMatches[0] : undefined);
      if (match) fullName = match.fullName;
    } catch (error) {
      console.error(`Lookup failed for "${leaf}" (product ${row.id}):`, error instanceof Error ? error.message : error);
    }

    if (fullName) {
      await prisma.supplierProduct.update({ where: { id: row.id }, data: { category: fullName } });
      resolved++;
      console.log(`Resolved "${leaf}" -> "${fullName}"`);
    } else {
      await prisma.supplierProduct.update({ where: { id: row.id }, data: { category: '', categoryId: null } });
      cleared++;
      console.log(`Cleared unresolvable category "${leaf}" (product ${row.id})`);
    }
  }

  console.log(`Done. ${resolved} resolved, ${cleared} cleared, ${candidates.length} total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
