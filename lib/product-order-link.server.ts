import prisma from '@/lib/prisma.server';

const REFRESH_CHUNK_SIZE = 200;

type StoredLineItem = {
  id: string | number;
  productId?: string | null;
  variantId?: string | null;
  title?: string;
  name?: string;
  sku?: string;
  qty?: number;
  price?: number;
};

/**
 * Extracts Order.lineItems (the normalized JSON OrderModel already writes) into
 * the OrderLineItem fact table and resolves productId/variantId against synced
 * Product/ProductVariant rows. Order line items never carry a Shopify variant id
 * today — the order GraphQL queries only fetch `product { id }`, not
 * `variant { id }` — so variantId stays null and variant-level sold aggregates
 * stay at 0 until that's added upstream; product-level linking works from
 * productId alone. Similarly, no per-line-item refund data is synced, only
 * whole-order cancellation, so "net" degrades to "ordered" for open orders.
 */
export async function linkOrderLineItems(orderId: string, options?: { skipRefresh?: boolean }) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, storeId: true, lineItems: true, canceled: true, orderedAt: true },
  });
  if (!order) return [];

  const lineItems = Array.isArray(order.lineItems) ? (order.lineItems as unknown as StoredLineItem[]) : [];
  if (lineItems.length === 0) return [];

  const productShopifyIds = uniqueStrings(lineItems.map((item) => item.productId));
  const variantShopifyIds = uniqueStrings(lineItems.map((item) => item.variantId));

  const [products, variants] = await Promise.all([
    productShopifyIds.length > 0
      ? prisma.product.findMany({
          where: { storeId: order.storeId, shopifyId: { in: productShopifyIds } },
          select: { id: true, shopifyId: true },
        })
      : Promise.resolve([]),
    variantShopifyIds.length > 0
      ? prisma.productVariant.findMany({
          where: { storeId: order.storeId, shopifyId: { in: variantShopifyIds } },
          select: { id: true, shopifyId: true },
        })
      : Promise.resolve([]),
  ]);

  const productIdByShopifyId = new Map(products.map((product) => [product.shopifyId, product.id]));
  const variantIdByShopifyId = new Map(variants.map((variant) => [variant.shopifyId, variant.id]));
  const affectedProductIds = new Set<string>();

  const writes = lineItems
    .filter((item) => item.id != null)
    .map((item) => {
      const lineItemId = String(item.id);
      const productShopifyId = item.productId ? String(item.productId) : null;
      const variantShopifyId = item.variantId ? String(item.variantId) : null;
      const productId = productShopifyId ? productIdByShopifyId.get(productShopifyId) ?? null : null;
      const variantId = variantShopifyId ? variantIdByShopifyId.get(variantShopifyId) ?? null : null;
      const quantity = Number(item.qty ?? 0);
      const netQuantity = order.canceled ? 0 : quantity;
      const unitPrice = Number(item.price ?? 0);
      const netAmount = netQuantity * unitPrice;

      if (productId) affectedProductIds.add(productId);

      const fields = {
        productShopifyId,
        variantShopifyId,
        productId,
        variantId,
        sku: item.sku ?? null,
        title: item.title ?? item.name ?? null,
        quantity,
        refundedQuantity: order.canceled ? quantity : 0,
        netQuantity,
        unitPrice,
        netAmount,
        orderedAt: order.orderedAt,
        canceled: order.canceled,
      };

      return prisma.orderLineItem.upsert({
        where: { orderId_lineItemId: { orderId: order.id, lineItemId } },
        update: fields,
        create: { orderId: order.id, storeId: order.storeId, lineItemId, ...fields },
      });
    });

  if (writes.length > 0) {
    await prisma.$transaction(writes);
  }

  const affected = [...affectedProductIds];
  if (affected.length > 0 && !options?.skipRefresh) {
    await refreshProductSales(affected);
  }
  return affected;
}

/** Recomputes Product/ProductVariant soldQuantity/soldAmount from linked OrderLineItem rows. */
export async function refreshProductSales(productIds: string[]) {
  const uniqueIds = [...new Set(productIds)];
  for (let i = 0; i < uniqueIds.length; i += REFRESH_CHUNK_SIZE) {
    await refreshProductSalesChunk(uniqueIds.slice(i, i + REFRESH_CHUNK_SIZE));
  }
}

async function refreshProductSalesChunk(productIds: string[]) {
  if (productIds.length === 0) return;

  const [productSums, variantSums, variants] = await Promise.all([
    prisma.orderLineItem.groupBy({
      by: ['productId'],
      where: { productId: { in: productIds } },
      _sum: { netQuantity: true, netAmount: true },
    }),
    prisma.orderLineItem.groupBy({
      by: ['variantId'],
      where: { productId: { in: productIds }, variantId: { not: null } },
      _sum: { netQuantity: true, netAmount: true },
    }),
    prisma.productVariant.findMany({
      where: { productId: { in: productIds } },
      select: { id: true },
    }),
  ]);

  const productSumById = new Map(productSums.map((sum) => [sum.productId as string, sum]));
  const variantSumById = new Map(variantSums.map((sum) => [sum.variantId as string, sum]));

  await prisma.$transaction([
    ...productIds.map((productId) =>
      prisma.product.update({
        where: { id: productId },
        data: {
          soldQuantity: productSumById.get(productId)?._sum.netQuantity ?? 0,
          soldAmount: productSumById.get(productId)?._sum.netAmount ?? 0,
        },
      })
    ),
    ...variants.map((variant) =>
      prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          soldQuantity: variantSumById.get(variant.id)?._sum.netQuantity ?? 0,
          soldAmount: variantSumById.get(variant.id)?._sum.netAmount ?? 0,
        },
      })
    ),
  ]);
}

/**
 * Backfills productId/variantId on OrderLineItem rows that were linked before
 * their Product/ProductVariant existed locally, then refreshes sold aggregates
 * for whatever products picked up newly-linked rows. Call after a product sync
 * upserts products, keyed by the shopify ids that were just synced.
 */
export async function relinkOrphanOrderLineItems(storeId: string, productShopifyIds: string[]) {
  const uniqueIds = uniqueStrings(productShopifyIds);
  if (uniqueIds.length === 0) return;

  const products = await prisma.product.findMany({
    where: { storeId, shopifyId: { in: uniqueIds } },
    select: { id: true, shopifyId: true, variants: { select: { id: true, shopifyId: true } } },
  });
  if (products.length === 0) return;

  const affectedProductIds = new Set<string>();

  for (const product of products) {
    const productResult = await prisma.orderLineItem.updateMany({
      where: { storeId, productShopifyId: product.shopifyId, productId: null },
      data: { productId: product.id },
    });
    if (productResult.count > 0) affectedProductIds.add(product.id);

    for (const variant of product.variants) {
      const variantResult = await prisma.orderLineItem.updateMany({
        where: { storeId, variantShopifyId: variant.shopifyId, variantId: null },
        data: { variantId: variant.id, productId: product.id },
      });
      if (variantResult.count > 0) affectedProductIds.add(product.id);
    }
  }

  if (affectedProductIds.size > 0) {
    await refreshProductSales([...affectedProductIds]);
  }
}

function uniqueStrings(values: Array<string | number | null | undefined>) {
  const set = new Set<string>();
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    set.add(String(value));
  }
  return [...set];
}
