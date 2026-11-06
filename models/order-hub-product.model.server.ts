import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { uniqueHandle } from '@/lib/inventory/handle';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { OrderLineInventoryModel } from '@/models/order-line-inventory.model.server';
import { buildSourceVariants, gid, hubHandleFor, imageKey, readOptions } from '@/lib/order-hub-product';
import type { StoreOption } from '@/lib/order-hub-product';

type Tx = Prisma.TransactionClient;
type Actor = { id: string | null; name: string };
type HubLine = { productId: string; variantId: string | null; sku: string; title: string; lineOptions: StoreOption[] };
/** An image already downloaded into our storage: `sourceUrl` is the Shopify URL it came from (null when the download failed and `url` is still that link). */
export type HubProductImage = { url: string; sourceUrl: string | null; altText: string | null };

export class HubProductError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Makes sure the product behind an order line exists in the hub catalogue under the line's store, so a
 * purchase order can be raised for it. Reuses a hub product with the same handle (adopting it for the store);
 * otherwise creates an active, verified copy of the store product: same handle, details, images and one
 * variant per store variant. Stock starts at 0: stock belongs to the hub, not the store. */
export class OrderHubProductModel {
  /** The order line, its store's Shopify credentials, and the hub variant the line already maps to (if any). */
  async findLine(orderId: string, lineItemId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, storeId: true, lineItems: true, store: { select: { storeDomain: true, accessToken: true } } } });
    if (!order) throw new HubProductError('Order not found', 404);
    const raw = (Array.isArray(order.lineItems) ? order.lineItems : []).map((l) => (l && typeof l === 'object' ? (l as Record<string, unknown>) : {})).find((l) => String(l.id ?? '') === lineItemId);
    if (!raw) throw new HubProductError('Line item not found', 404);
    const productId = raw.productId ? String(raw.productId) : '';
    if (!productId) throw new HubProductError('This line is not linked to a Shopify product (custom item).');
    const line: HubLine = {
      productId,
      variantId: raw.variantId ? String(raw.variantId) : null,
      sku: typeof raw.sku === 'string' ? raw.sku.trim() : '',
      title: typeof raw.title === 'string' && raw.title ? raw.title : typeof raw.name === 'string' ? raw.name : 'Product',
      lineOptions: readOptions(raw.variantOptions),
    };
    const [existing] = await new OrderLineInventoryModel().attach([{ id: order.id, storeId: order.storeId, items: [{ id: lineItemId, variantId: line.variantId, sku: line.sku }] }]);
    return { order: { id: order.id, number: order.number, storeId: order.storeId }, store: order.store, line, mapped: existing.items[0].inventory };
  }

  async findStoreProduct(storeId: string, shopifyId: string) {
    return prisma.product.findUnique({ where: { storeId_shopifyId: { storeId, shopifyId } }, include: { variants: { orderBy: { position: 'asc' } } } });
  }

  async handleTaken(handle: string) {
    return Boolean(await prisma.supplierProduct.findUnique({ where: { handle }, select: { id: true } }));
  }

  /** Images of a hub product still pointing at their remote (Shopify) link, i.e. not downloaded yet. */
  async listRemoteImages(supplierProductId: string) {
    return prisma.supplierProductImage.findMany({
      where: { supplierProductId, sourceUrl: null, url: { startsWith: 'http' } },
      select: { id: true, url: true, altText: true },
    });
  }

  /** Points images at their downloaded copy, keeping the remote link as `sourceUrl`. */
  async applyLocalImages(updates: { id: string; url: string; sourceUrl: string }[]) {
    if (updates.length === 0) return;
    await prisma.$transaction(updates.map(({ id, url, sourceUrl }) => prisma.supplierProductImage.update({ where: { id }, data: { url, sourceUrl } })));
  }

  async ensureForLine(params: { order: { id: string; number: number; storeId: string }; line: HubLine; images: HubProductImage[]; actor: Actor }, client?: Tx) {
    const { order, line } = params;
    const run = async (tx: Tx) => {
      const store = await tx.product.findUnique({ where: { storeId_shopifyId: { storeId: order.storeId, shopifyId: line.productId } }, include: { variants: { orderBy: { position: 'asc' } } } });
      const sources = buildSourceVariants(store?.variants ?? [], line);
      const name = store?.title || line.title;
      const handle = hubHandleFor(store?.handle, name);

      let hub = await tx.supplierProduct.findUnique({ where: { handle }, select: { id: true, name: true } });
      let created = false;
      const imageIdByKey = new Map<string, string>();
      if (!hub) {
        const [settings, takenItemNos, suppliers] = await Promise.all([
          tx.appSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' }, select: { globalMarginPercent: true, globalExchangeRate: true } }),
          tx.supplierProduct.findMany({ select: { itemNo: true } }),
          tx.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
        ]);
        const supplier = suppliers.find((s) => s.name.trim().toLowerCase() === (store?.vendor ?? '').trim().toLowerCase()) ?? suppliers[0];
        const colours = [...new Set(sources.map((s) => s.colour).filter(Boolean))];
        const itemNo = uniqueHandle(handle, new Set(takenItemNos.map((r) => r.itemNo)));
        hub = await tx.supplierProduct.create({
          data: {
            itemNo,
            handle,
            name,
            brand: store?.vendor || null,
            sku: itemNo,
            description: store?.descriptionHtml ? sanitizeHtml(store.descriptionHtml) : null,
            category: store?.category ?? null,
            categoryId: store?.categoryId ?? null,
            status: 'ACTIVE',
            verified: true,
            sizes: [...new Set(sources.map((s) => s.size).filter(Boolean))],
            colours: colours.map((c) => ({ name: c, color: deriveColorFromName(c) })) as unknown as Prisma.InputJsonValue,
            pricing: { create: { currencyCode: 'USD', exchangeRate: Number(settings.globalExchangeRate), marginPercent: Number(settings.globalMarginPercent) } },
            ...(supplier ? { supplierLinks: { create: { supplierId: supplier.id } } } : {}),
          },
          select: { id: true, name: true },
        });
        created = true;
        const images = await tx.supplierProductImage.createManyAndReturn({
          data: params.images.map((image, position) => ({ supplierProductId: hub!.id, url: image.url, sourceUrl: image.sourceUrl, altText: image.altText, position })),
          select: { id: true, url: true, sourceUrl: true },
        });
        for (const image of images) imageIdByKey.set(imageKey(image.sourceUrl ?? image.url), image.id);
        await tx.inventoryActivity.create({ data: { supplierProductId: hub.id, type: 'created', message: `Product "${name}" created from order #${order.number}`, actorId: params.actor.id, actorName: params.actor.name } });
      }

      const hubVariants = await tx.supplierProductVariant.findMany({ where: { supplierProductId: hub.id }, select: { id: true, sku: true, colour: true, size: true, position: true } });
      const listing = await tx.supplierProductStoreListing.upsert({
        where: { supplierProductId_storeId: { supplierProductId: hub.id, storeId: order.storeId } },
        create: { supplierProductId: hub.id, storeId: order.storeId, productGid: gid('Product', line.productId), externalId: line.productId, handle: store?.handle ?? null, status: 'LISTED', shopifyStatus: store?.status ?? null, lastSyncedAt: new Date() },
        update: { productGid: gid('Product', line.productId), externalId: line.productId, handle: store?.handle ?? null, shopifyStatus: store?.status ?? null, lastSyncedAt: new Date() },
      });

      let lineVariantId: string | null = null;
      let position = hubVariants.reduce((max, v) => Math.max(max, v.position), -1);
      for (const source of sources) {
        let hubVariant = hubVariants.find((v) => (source.sku && v.sku === source.sku) || (v.colour === source.colour && v.size === source.size));
        if (!hubVariant) {
          position += 1;
          const imageId = source.imageUrl ? imageIdByKey.get(imageKey(source.imageUrl)) ?? null : null;
          hubVariant = await tx.supplierProductVariant.create({
            data: { supplierProductId: hub.id, colour: source.colour, size: source.size, sku: source.sku, barcode: source.barcode, stockOnHand: 0, sellPrice: source.price, buyPrice: source.cost ?? 0, position, imageId },
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
        if (source.shopifyVariantId === line.variantId || (!lineVariantId && source.sku && source.sku === line.sku)) lineVariantId = hubVariant.id;
      }
      if (!lineVariantId) lineVariantId = hubVariants[0]?.id ?? null;
      if (!lineVariantId) throw new HubProductError('Could not match the line to a variant of the hub product.');
      return { supplierProductId: hub.id, variantId: lineVariantId, created };
    };

    return client ? run(client) : prisma.$transaction(run, { timeout: 30_000 });
  }
}
