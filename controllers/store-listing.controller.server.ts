import { unstable_cache, revalidateTag } from 'next/cache';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { fetchStoreListings, updateStoreVariantPrices, storeListingsTag } from '@/lib/shopify-store-listings.server';

const model = new SupplierProductModel();

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class StoreListingController {
  /** Cached per-handle for 5 minutes — navigating between products within that window never
   * re-hits Shopify. The Sync action explicitly busts this via revalidateTag(storeListingsTag). */
  async list(productId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const handle = await model.findHandle(productId);
    if (!handle) return { error: { message: 'Product not found', status: 404 } };

    const getCachedListings = unstable_cache((h: string) => fetchStoreListings(h), ['store-listings', handle], {
      revalidate: 300,
      tags: [storeListingsTag(handle)],
    });
    const listings = await getCachedListings(handle);

    return { data: { listings } };
  }

  async sync(productId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const handle = await model.findHandle(productId);
    if (!handle) return { error: { message: 'Product not found', status: 404 } };

    revalidateTag(storeListingsTag(handle), 'max');
    const listings = await fetchStoreListings(handle);
    return { data: { listings }, message: 'Store listings refreshed' };
  }

  async updatePrices(productId: string, storeId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const handle = await model.findHandle(productId);
    if (!handle) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const productGid = typeof value.productGid === 'string' ? value.productGid : '';
    const rawVariants = Array.isArray(value.variants) ? (value.variants as unknown[]) : [];

    if (!productGid) return { error: { message: 'Validation failed', errors: ['productGid: Required'], status: 400 } };
    if (rawVariants.length === 0) return { error: { message: 'Validation failed', errors: ['variants: At least one variant is required'], status: 400 } };

    const variants: { id: string; price: number }[] = [];
    for (const raw of rawVariants) {
      const v = raw as Record<string, unknown>;
      const id = typeof v.id === 'string' ? v.id : '';
      const price = Number(v.price);
      if (!id || !Number.isFinite(price) || price < 0) {
        return { error: { message: 'Validation failed', errors: ['variants: Enter a valid price of 0 or more for every variant'], status: 400 } };
      }
      variants.push({ id, price });
    }

    let updated;
    try {
      updated = await updateStoreVariantPrices({ storeId, productGid, variants });
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to update prices', status: 502 } };
    }

    revalidateTag(storeListingsTag(handle), 'max');
    return { data: { variants: updated }, message: 'Price updated' };
  }
}
