import prisma from '@/lib/prisma.server';

export type LinePurchaseOrder = {
  number: number;
  status: 'REQUESTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  ordered: number;
  received: number;
  deliveryDate: string | null;
};

/** Hub stock and purchase-order state behind one order line (Admin, Staff). */
export type LineInventory = {
  supplierProductId: string;
  variantId: string;
  /** Free hub stock: on hand minus everything allocated to orders (shared by all stores). */
  available: number;
  onHand: number;
  /** Quantity of this order's own outstanding allocation, already counted in `allocated`. */
  ownAllocated: number;
  po: LinePurchaseOrder | null;
};

type LineRef = { id: string; variantId?: string | null; sku: string };
type OrderRef = { id: string; storeId: string; items: LineRef[] };

const OPEN_PO = ['REQUESTED', 'PARTIALLY_RECEIVED'] as const;
const gidOf = (variantId: string | null | undefined) => (variantId ? `gid://shopify/ProductVariant/${String(variantId).split('/').pop()}` : null);

/** Looks up, for every line of a page of orders, the hub variant it is fulfilled from. Mirrors
 * `findVariantForLine` (inventory-allocation): the publish-time store-variant mapping first, then a
 * SKU match within the store's listings. Lines without a hub variant get `inventory: null`. */
export class OrderLineInventoryModel {
  async attach<T extends OrderRef>(orders: T[]): Promise<Array<T & { items: Array<T['items'][number] & { inventory: LineInventory | null }> }>> {
    const lines = orders.flatMap((o) => o.items.map((item) => ({ order: o, item })));
    const storeIds = [...new Set(orders.map((o) => o.storeId))];
    const gids = [...new Set(lines.map((l) => gidOf(l.item.variantId)).filter((g): g is string => Boolean(g)))];
    const skus = [...new Set(lines.map((l) => l.item.sku).filter(Boolean))];

    const [storeVariants, skuVariants, allocations] = await Promise.all([
      gids.length > 0
        ? prisma.supplierProductStoreVariant.findMany({ where: { variantGid: { in: gids }, listing: { storeId: { in: storeIds } } }, select: { variantGid: true, variantId: true, listing: { select: { storeId: true } } } })
        : Promise.resolve([]),
      skus.length > 0
        ? prisma.supplierProductVariant.findMany({ where: { sku: { in: skus }, storeVariants: { some: { listing: { storeId: { in: storeIds } } } } }, orderBy: { createdAt: 'asc' }, select: { id: true, sku: true, storeVariants: { select: { listing: { select: { storeId: true } } } } } })
        : Promise.resolve([]),
      prisma.inventoryAllocation.findMany({
        where: { orderId: { in: orders.map((o) => o.id) }, variantId: { not: null } },
        select: { orderId: true, lineItemId: true, variantId: true, quantity: true, fulfilledQuantity: true, releasedQuantity: true, refundedQuantity: true, state: true },
      }),
    ]);

    const byGid = new Map(storeVariants.map((sv) => [`${sv.listing.storeId}|${sv.variantGid}`, sv.variantId]));
    const bySku = new Map<string, string>();
    for (const v of skuVariants) for (const sv of v.storeVariants) { const key = `${sv.listing.storeId}|${v.sku}`; if (!bySku.has(key)) bySku.set(key, v.id); }
    const allocByLine = new Map(allocations.map((a) => [`${a.orderId}|${a.lineItemId}`, a]));

    const variantOf = (order: OrderRef, item: LineRef) => {
      const alloc = allocByLine.get(`${order.id}|${item.id}`);
      if (alloc?.variantId) return alloc.variantId;
      const gid = gidOf(item.variantId);
      return (gid && byGid.get(`${order.storeId}|${gid}`)) || (item.sku && bySku.get(`${order.storeId}|${item.sku}`)) || null;
    };
    const variantIds = [...new Set(lines.map((l) => variantOf(l.order, l.item)).filter((v): v is string => Boolean(v)))];

    const [variants, poItems] = variantIds.length > 0
      ? await Promise.all([
          prisma.supplierProductVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, supplierProductId: true, stockOnHand: true, allocated: true } }),
          prisma.purchaseOrderItem.findMany({
            where: { variantId: { in: variantIds }, purchaseOrder: { status: { not: 'CANCELLED' } } },
            orderBy: { purchaseOrder: { createdAt: 'desc' } },
            select: { variantId: true, quantity: true, receivedQuantity: true, purchaseOrder: { select: { number: true, status: true, deliveryDate: true } } },
          }),
        ])
      : [[], []];

    const variantById = new Map(variants.map((v) => [v.id, v]));
    // The PO still on its way (earliest delivery first); otherwise the latest completed one.
    const poByVariant = new Map<string, LinePurchaseOrder>();
    const open = poItems.filter((p) => (OPEN_PO as readonly string[]).includes(p.purchaseOrder.status) && p.quantity > p.receivedQuantity);
    open.sort((a, b) => (a.purchaseOrder.deliveryDate?.getTime() ?? Infinity) - (b.purchaseOrder.deliveryDate?.getTime() ?? Infinity));
    for (const p of [...open, ...poItems]) {
      if (!p.variantId || poByVariant.has(p.variantId)) continue;
      poByVariant.set(p.variantId, { number: p.purchaseOrder.number, status: p.purchaseOrder.status as LinePurchaseOrder['status'], ordered: p.quantity, received: p.receivedQuantity, deliveryDate: p.purchaseOrder.deliveryDate?.toISOString() ?? null });
    }

    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => {
        const variantId = variantOf(order, item);
        const variant = variantId ? variantById.get(variantId) : undefined;
        if (!variantId || !variant) return { ...item, inventory: null };
        const alloc = allocByLine.get(`${order.id}|${item.id}`);
        const own = alloc && alloc.state === 'ALLOCATED' && alloc.variantId === variantId ? Math.max(0, alloc.quantity - alloc.fulfilledQuantity - alloc.releasedQuantity - alloc.refundedQuantity) : 0;
        return {
          ...item,
          inventory: { supplierProductId: variant.supplierProductId, variantId, available: Math.max(0, variant.stockOnHand - variant.allocated), onHand: variant.stockOnHand, ownAllocated: own, po: poByVariant.get(variantId) ?? null },
        };
      }),
    }));
  }
}
