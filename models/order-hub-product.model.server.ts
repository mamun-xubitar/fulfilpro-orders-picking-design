import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { slugifyHandle, uniqueHandle } from '@/lib/inventory/handle';
import { OrderLineInventoryModel } from '@/models/order-line-inventory.model.server';
import { buildSourceVariants, gid, readOptions } from '@/lib/order-hub-product';

type Tx = Prisma.TransactionClient;
type Actor = { id: string | null; name: string };

export class HubProductError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Makes sure the product behind an order line exists in the hub catalogue under the line's store, so a
 * purchase order can be raised for it. Reuses a hub product with the same handle (adopting it for the store);
 * otherwise creates a draft product with one variant per store variant. Stock starts at 0: stock belongs to
 * the hub, not the store. Idempotent: a line that already maps to a hub variant is returned untouched. */
export class OrderHubProductModel {
  async ensureForLine(params: { orderId: string; lineItemId: string; actor: Actor }, client?: Tx) {
    const order = await prisma.order.findUnique({ where: { id: params.orderId }, select: { id: true, number: true, storeId: true, lineItems: true } });
    if (!order) throw new HubProductError('Order not found', 404);
    const line = (Array.isArray(order.lineItems) ? order.lineItems : []).map((l) => (l && typeof l === 'object' ? (l as Record<string, unknown>) : {})).find((l) => String(l.id ?? '') === params.lineItemId);
    if (!line) throw new HubProductError('Line item not found', 404);
    const productId = line.productId ? String(line.productId) : '';
    if (!productId) throw new HubProductError('This line is not linked to a Shopify product (custom item).');
    const variantId = line.variantId ? String(line.variantId) : null;
    const sku = typeof line.sku === 'string' ? line.sku.trim() : '';
    const title = typeof line.title === 'string' && line.title ? line.title : typeof line.name === 'string' ? line.name : 'Product';
    const lineOptions = readOptions(line.variantOptions);

    const [existing] = await new OrderLineInventoryModel().attach([{ id: order.id, storeId: order.storeId, items: [{ id: params.lineItemId, variantId, sku }] }]);
    const mapped = existing.items[0].inventory;
    if (mapped) return { supplierProductId: mapped.supplierProductId, variantId: mapped.variantId, created: false };

    const run = async (tx: Tx) => {
      const store = await tx.product.findUnique({ where: { storeId_shopifyId: { storeId: order.storeId, shopifyId: productId } }, include: { variants: { orderBy: { position: 'asc' } } } });
      const sources = buildSourceVariants(store?.variants ?? [], { variantId, sku, lineOptions });
      const name = store?.title || title;
      const handle = slugifyHandle(store?.handle || name) || 'product';

      let hub = await tx.supplierProduct.findUnique({ where: { handle }, select: { id: true, name: true } });
      let created = false;
      if (!hub) {
        const [settings, takenItemNos, suppliers] = await Promise.all([
          tx.appSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' }, select: { globalMarginPercent: true, globalExchangeRate: true } }),
          tx.supplierProduct.findMany({ select: { itemNo: true } }),
          tx.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        ]);
        const supplier = suppliers.find((s) => s.name.trim().toLowerCase() === (store?.vendor ?? '').trim().toLowerCase()) ?? suppliers[0];
        const colours = [...new Set(sources.map((s) => s.colour).filter(Boolean))];
        hub = await tx.supplierProduct.create({
          data: {
            itemNo: uniqueHandle(handle, new Set(takenItemNos.map((r) => r.itemNo))),
            handle,
            name,
            brand: store?.vendor || null,
            sku: handle,
            status: 'DRAFT',
            sizes: [...new Set(sources.map((s) => s.size).filter(Boolean))],
            colours: colours.map((c) => ({ name: c, color: deriveColorFromName(c) })) as unknown as Prisma.InputJsonValue,
            pricing: { create: { currencyCode: 'USD', exchangeRate: Number(settings.globalExchangeRate), marginPercent: Number(settings.globalMarginPercent) } },
            ...(supplier ? { supplierLinks: { create: { supplierId: supplier.id } } } : {}),
          },
          select: { id: true, name: true },
        });
        created = true;
        await tx.inventoryActivity.create({ data: { supplierProductId: hub.id, type: 'created', message: `Product "${name}" created from order #${order.number}`, actorId: params.actor.id, actorName: params.actor.name } });
      }

      const hubVariants = await tx.supplierProductVariant.findMany({ where: { supplierProductId: hub.id }, select: { id: true, sku: true, colour: true, size: true, position: true } });
      const listing = await tx.supplierProductStoreListing.upsert({
        where: { supplierProductId_storeId: { supplierProductId: hub.id, storeId: order.storeId } },
        create: { supplierProductId: hub.id, storeId: order.storeId, productGid: gid('Product', productId), externalId: productId, handle: store?.handle ?? null, status: 'LISTED', shopifyStatus: store?.status ?? null, lastSyncedAt: new Date() },
        update: { productGid: gid('Product', productId), externalId: productId, handle: store?.handle ?? null, shopifyStatus: store?.status ?? null, lastSyncedAt: new Date() },
      });

      let lineVariantId: string | null = null;
      let position = hubVariants.reduce((max, v) => Math.max(max, v.position), -1);
      for (const source of sources) {
        let hubVariant = hubVariants.find((v) => (source.sku && v.sku === source.sku) || (v.colour === source.colour && v.size === source.size));
        if (!hubVariant) {
          position += 1;
          hubVariant = await tx.supplierProductVariant.create({
            data: { supplierProductId: hub.id, colour: source.colour, size: source.size, sku: source.sku, barcode: source.barcode, stockOnHand: 0, sellPrice: source.price, buyPrice: source.cost ?? 0, position },
            select: { id: true, sku: true, colour: true, size: true, position: true },
          });
          hubVariants.push(hubVariant);
        }
        if (source.shopifyVariantId) {
          await tx.supplierProductStoreVariant.upsert({
            where: { listingId_variantId: { listingId: listing.id, variantId: hubVariant.id } },
            create: { listingId: listing.id, variantId: hubVariant.id, variantGid: gid('ProductVariant', source.shopifyVariantId), inventoryItemGid: source.inventoryItemId ? gid('InventoryItem', source.inventoryItemId) : null, price: source.price },
            update: { variantGid: gid('ProductVariant', source.shopifyVariantId), ...(source.inventoryItemId ? { inventoryItemGid: gid('InventoryItem', source.inventoryItemId) } : {}), price: source.price },
          });
        }
        if (source.shopifyVariantId === variantId || (!lineVariantId && source.sku && source.sku === sku)) lineVariantId = hubVariant.id;
      }
      if (!lineVariantId) lineVariantId = hubVariants[0]?.id ?? null;
      if (!lineVariantId) throw new HubProductError('Could not match the line to a variant of the hub product.');
      return { supplierProductId: hub.id, variantId: lineVariantId, created };
    };

    return client ? run(client) : prisma.$transaction(run, { timeout: 30_000 });
  }
}
