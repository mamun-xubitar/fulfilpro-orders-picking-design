import { revalidateTag } from 'next/cache';
import { SupplierProductModel, type SupplierProductRow } from '@/models/supplier-product.model.server';
import { StoreListingModel } from '@/models/store-listing.model.server';
import { fetchStoreListings, updateStoreVariantPrices, storeListingsTag } from '@/lib/shopify-store-listings.server';
import { publishProductToStore, type PublishAspect, type PublishPayload } from '@/lib/shopify-product-publish.server';

const model = new SupplierProductModel();
const listingModel = new StoreListingModel();

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? null, name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

const PUBLISH_ASPECTS: PublishAspect[] = ['images', 'details', 'pricing', 'variants'];

type PublishTarget = {
  storeId: string;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** hubVariantId -> ex-tax price to push for this store. Falls back to the variant's own
   * sellPrice when a target omits an entry — the admin didn't touch that store's price. */
  variantPrices?: Record<string, number>;
};

export class StoreListingController {
  /** Cached per-handle until the data actually changes — a price save, a publish, or Sync below
   * all call revalidateTag(storeListingsTag), so navigating between products never re-hits
   * Shopify unless something changed. Persisted listing rows (status, margin, error) are merged
   * onto the live per-store lookup so the panel can show publish state without another round trip. */
  private async mergedListings(productId: string, handle: string) {
    const [listings, persisted] = await Promise.all([fetchStoreListings(handle), listingModel.listForProduct(productId)]);
    const persistedByStore = new Map(persisted.map((p) => [p.storeId, p]));
    return listings.map((listing) => {
      const p = persistedByStore.get(listing.storeId);
      return {
        ...listing,
        listingStatus: p?.status ?? ('NOT_LISTED' as const),
        marginPercent: p?.marginPercent ?? null,
        lastError: p?.lastError ?? null,
        lastPublishedAt: p?.lastPublishedAt ?? null,
      };
    });
  }

  async list(productId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const handle = await model.findHandle(productId);
    if (!handle) return { error: { message: 'Product not found', status: 404 } };

    const listings = await this.mergedListings(productId, handle);
    return { data: { listings }, message: 'Store listings retrieved' };
  }

  async sync(productId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const handle = await model.findHandle(productId);
    if (!handle) return { error: { message: 'Product not found', status: 404 } };

    revalidateTag(storeListingsTag(handle), { expire: 0 });
    const listings = await this.mergedListings(productId, handle);
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

    revalidateTag(storeListingsTag(handle), { expire: 0 });
    return { data: { variants: updated }, message: 'Price updated' };
  }

  async setMargin(productId: string, storeId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(productId))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    if (value.marginPercent === null) {
      await listingModel.setMargin(productId, storeId, null);
      return { data: { marginPercent: null }, message: 'Store margin removed' };
    }

    const marginPercent = Number(value.marginPercent);
    if (!Number.isFinite(marginPercent) || marginPercent < 0) {
      return { error: { message: 'Validation failed', errors: ['marginPercent: Enter a margin of 0 or more'], status: 400 } };
    }
    await listingModel.setMargin(productId, storeId, marginPercent);
    return { data: { marginPercent }, message: 'Store margin saved' };
  }

  /** Publishes (or bulk-updates) the product to one or more connected stores. One store failing
   * must never abort the others — each target is published in its own try/catch, mirroring how
   * fetchStoreListings isolates per-store lookup failures. */
  async publish(productId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const product = await model.findById(productId);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawAspects = Array.isArray(value.aspects) ? (value.aspects as unknown[]) : [];
    const aspects = rawAspects.filter((a): a is PublishAspect => typeof a === 'string' && (PUBLISH_ASPECTS as string[]).includes(a));
    if (aspects.length === 0) return { error: { message: 'Validation failed', errors: ['aspects: Select at least one thing to update'], status: 400 } };

    const rawTargets = Array.isArray(value.targets) ? (value.targets as unknown[]) : [];
    if (rawTargets.length === 0) return { error: { message: 'Validation failed', errors: ['targets: Select at least one store'], status: 400 } };

    const targets: PublishTarget[] = rawTargets.map((raw) => {
      const t = raw as Record<string, unknown>;
      const priceEntries = t.variantPrices && typeof t.variantPrices === 'object' ? Object.entries(t.variantPrices as Record<string, unknown>) : [];
      return {
        storeId: String(t.storeId ?? ''),
        tags: Array.isArray(t.tags) ? (t.tags as unknown[]).filter((s): s is string => typeof s === 'string') : [],
        seoTitle: typeof t.seoTitle === 'string' ? t.seoTitle : null,
        seoDescription: typeof t.seoDescription === 'string' ? t.seoDescription : null,
        variantPrices: Object.fromEntries(priceEntries.filter(([, v]) => Number.isFinite(Number(v))).map(([k, v]) => [k, Number(v)])),
      };
    });
    if (targets.some((t) => !t.storeId)) return { error: { message: 'Validation failed', errors: ['targets: Each target needs a storeId'], status: 400 } };

    const results: { storeId: string; status: 'LISTED' | 'FAILED'; error?: string; url?: string | null }[] = [];

    for (const target of targets) {
      await listingModel.markPublishing(productId, target.storeId);
      try {
        const existing = await listingModel.findOne(productId, target.storeId);
        const payload = buildPublishPayload(product, target);
        const result = await publishProductToStore({
          storeId: target.storeId,
          aspects,
          payload,
          existingProductGid: existing?.productGid ?? null,
        });

        await listingModel.markPublished(productId, target.storeId, {
          productGid: result.productGid,
          externalId: result.externalId,
          handle: result.handle,
          shopifyStatus: result.shopifyStatus,
        });
        if (result.variants.length > 0) {
          await listingModel.upsertVariantMappings(
            productId,
            target.storeId,
            result.variants.map((v) => ({ hubVariantId: v.hubVariantId, variantGid: v.variantGid, inventoryItemGid: v.inventoryItemGid, price: v.price }))
          );
        }
        results.push({ storeId: target.storeId, status: 'LISTED', url: result.url });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to publish to this store';
        await listingModel.markFailed(productId, target.storeId, message);
        results.push({ storeId: target.storeId, status: 'FAILED', error: message });
      }
    }

    const succeeded = results.filter((r) => r.status === 'LISTED').length;
    await model.logActivity(
      productId,
      `Published to ${succeeded} of ${results.length} store${results.length === 1 ? '' : 's'}`,
      'store_published',
      actorFromSession(session)
    );

    revalidateTag(storeListingsTag(product.handle), { expire: 0 });
    return { data: { results }, message: succeeded === results.length ? 'Published to every selected store' : 'Published with some failures' };
  }
}

/** Builds the Shopify-shaped payload from the hub's own record of truth, with only the admin's
 * per-store overrides (tags, SEO, price) layered on top. Stock/cost always come from the hub —
 * they are never client-supplied, since InventoryAllocation is the source of truth for them. */
function buildPublishPayload(product: SupplierProductRow, target: PublishTarget): PublishPayload {
  return {
    title: product.name,
    descriptionHtml: product.description,
    handle: product.handle,
    vendor: product.brand,
    productType: product.category,
    categoryGid: product.categoryId,
    tags: target.tags ?? [],
    status: product.status,
    seoTitle: target.seoTitle,
    seoDescription: target.seoDescription,
    images: product.images.map((img) => ({ url: img.url, altText: img.altText })),
    variants: product.variants.map((v) => ({
      hubVariantId: v.id,
      colour: v.colour,
      size: v.size,
      sku: v.sku,
      barcode: v.barcode,
      price: target.variantPrices?.[v.id] ?? v.sellPrice,
      buyPrice: v.buyPrice,
      availableQuantity: Math.max(0, v.stockOnHand - v.allocated),
    })),
  };
}
