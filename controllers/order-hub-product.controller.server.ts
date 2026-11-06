import { after } from 'next/server';
import { HubProductError, OrderHubProductModel } from '@/models/order-hub-product.model.server';
import type { HubProductImage } from '@/models/order-hub-product.model.server';
import { localizeCsvImages } from '@/lib/inventory/csv-import-images.server';
import { hubHandleFor, storeProductImages } from '@/lib/order-hub-product';
import { syncSingleProduct } from '@/lib/shopify-product-sync.server';

const model = new OrderHubProductModel();

type Actor = { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null;

export class OrderHubProductController {
  /** "+ PO" on a line whose product is missing from the hub: creates it under the line's store first. */
  async ensure(orderId: string, lineItemId: string, actor: Actor) {
    if (actor?.role !== 'admin') return { error: { message: 'Forbidden', status: 403 } };
    try {
      const { order, store, line, mapped } = await model.findLine(orderId, lineItemId);
      if (mapped) return { data: { supplierProductId: mapped.supplierProductId, variantId: mapped.variantId, created: false }, message: 'Product is already in the hub' };

      // Copy the product as it is on Shopify now; the local copy is the fallback if the store can't be reached.
      if (store.accessToken) {
        await syncSingleProduct({ storeId: order.storeId, shop: store.storeDomain, accessToken: store.accessToken, shopifyProductId: line.productId, mediaLimit: 250 }).catch((error) => {
          console.error('Failed to refresh the store product before adding it to the hub', { orderId, productId: line.productId, error });
        });
      }

      // A new hub product starts with the Shopify image links; they are downloaded after the response.
      const storeProduct = await model.findStoreProduct(order.storeId, line.productId);
      let images: HubProductImage[] = [];
      if (storeProduct && !(await model.handleTaken(hubHandleFor(storeProduct.handle, storeProduct.title || line.title)))) {
        images = storeProductImages(storeProduct.images, storeProduct.variants).map((image) => ({ ...image, sourceUrl: null }));
      }

      const data = await model.ensureForLine({ order, line, images, actor: { id: actor.id ?? null, name: actor.name ?? actor.email ?? 'Unknown' } });
      if (data.created && images.length > 0) after(() => this.localizeImages(data.supplierProductId));
      return { data, message: data.created ? 'Product created in the hub' : 'Product is already in the hub' };
    } catch (error) {
      if (error instanceof HubProductError) return { error: { message: error.message, status: error.status } };
      throw error;
    }
  }

  /** Downloads a new hub product's images into our storage; one that fails keeps its Shopify link. */
  private async localizeImages(supplierProductId: string) {
    try {
      const remote = await model.listRemoteImages(supplierProductId);
      const { rows } = await localizeCsvImages(remote);
      await model.applyLocalImages(rows.flatMap((row, i) => (row.sourceUrl ? [{ id: remote[i].id, url: row.url, sourceUrl: row.sourceUrl }] : [])));
    } catch (error) {
      console.error('Failed to download the images of a hub product created from an order', { supplierProductId, error });
    }
  }
}
