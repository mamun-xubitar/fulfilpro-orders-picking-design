import { revalidateTag } from 'next/cache';
import { SupplierProductModel, type SupplierProductRow } from '@/models/supplier-product.model.server';
import { StoreListingModel } from '@/models/store-listing.model.server';
import { fetchStoreListings, updateStoreVariantPrices, storeListingsTag } from '@/lib/shopify-store-listings.server';
import { publishProductToStore, type PublishAspect, type PublishPayload } from '@/lib/shopify-product-publish.server';
import { searchStoreCollections } from '@/lib/shopify-store-collections.server';
import { createStoreCollection, searchStoreTaxonomy, type TaxonomyField } from '@/lib/shopify-taxonomy.server';
import { storePriceFromMargin } from '@/lib/inventory/store-price';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { toPublicUrl } from '@/lib/uploads.server';

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
  /** hubVariantId -> price to push for this store. Only present for a variant the admin
   * manually edited in the modal — an omitted entry is priced from the store's own margin
   * (storePriceFromMargin), falling back to the variant's own sellPrice when no margin is set. */
  variantPrices?: Record<string, number>;
  /** hubVariantId -> available qty to push for this store. Opposite contract to `variantPrices`:
   * sent for every variant regardless of aspect, since an *absent* entry falls back to the full
   * hub quantity (Math.max(0, stockOnHand - allocated)) rather than a store-specific default. */
  variantStock?: Record<string, number>;
  /** Per-store details overlay from the publish modal (seeded from hub, editable per store).
   * Absent unless the `details` aspect was selected. */
  details?: {
    title?: string;
    descriptionHtml?: string;
    vendor?: string;
    productType?: string;
    /** Real Shopify taxonomy category gid override for this store — distinct from `productType`
     * (Shopify's free-text "Type" field). `undefined` = not sent (aspect off); `null` = admin
     * explicitly cleared it; a string = the picked taxonomy gid. */
    categoryId?: string | null;
    /** Manual-collection gids this store's listing should belong to — a full replacement list
     * (mirrors how `images` fully replaces the store's media set). Absent = not sent (aspect
     * off); an empty array explicitly clears every collection. */
    collectionIds?: string[];
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  };
  /** Per-store image selection (gallery minus excluded, with alt overrides). Absent unless the
   * `images` aspect was selected — then it fully replaces the store's media set. */
  images?: { url: string; altText: string | null }[];
  /** hubVariantId -> SKU/barcode overrides. Absent unless the `variants` aspect was selected. */
  variantsMeta?: Record<string, { sku?: string | null; barcode?: string | null }>;
  /** hubVariantId list to omit from this store's variant push — only honored when the `variants`
   * aspect was selected (that's the only mode where Shopify's productSet reconciles/deletes
   * omitted variants). */
  excludedVariantIds?: string[];
  /** hubVariantId -> this store's own draft image URL for that variant (null = no image).
   * Absent unless the `images` aspect was selected. Draft-local, like `images` — never derived
   * from or written back to the hub's SupplierProductVariant.imageId. */
  variantImages?: Record<string, string | null>;
};

export class StoreListingController {
  /** Cached per-handle until the data actually changes — a price save, a publish, or Sync below
   * all call revalidateTag(storeListingsTag), so navigating between products never re-hits
   * Shopify unless something changed. Persisted listing rows (status, margin, error) are merged
   * onto the live per-store lookup so the panel can show publish state without another round trip. */
  private async mergedListings(productId: string, handle: string) {
    const persisted = await listingModel.listForProduct(productId);
    const listings = await fetchStoreListings(
      handle,
      persisted.map((p) => ({ storeId: p.storeId, productGid: p.productGid }))
    );
    const persistedByStore = new Map(persisted.map((p) => [p.storeId, p]));
    return listings.map((listing) => {
      const p = persistedByStore.get(listing.storeId);
      // Reconcile DB status with live Shopify truth: an externally listed product with no row
      // reads as LISTED (adopted view), and a LISTED row whose product vanished keeps its
      // status so the card stays visible as "missing on Shopify" instead of disappearing.
      const listingStatus = p?.status ?? (listing.found ? ('LISTED' as const) : ('NOT_LISTED' as const));
      // Prefer the live gid when the handle lookup hit; fall back to the persisted gid so
      // price updates keep working for id-matched (renamed handle) listings.
      const productGid = listing.productGid ?? p?.productGid ?? null;
      return {
        ...listing,
        productGid,
        listingStatus,
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
    // Adopt externally listed products (found on Shopify, no DB row) so the badge stops
    // flipping back to NOT_LISTED. Failures here never block the sync response.
    await Promise.allSettled(
      listings
        .filter((l) => l.found && l.productGid && l.listingStatus === 'LISTED')
        .map((l) =>
          listingModel.adoptExternal(productId, l.storeId, {
            productGid: l.productGid!,
            externalId: l.externalId ?? '',
            handle,
            shopifyStatus: l.status ?? 'ACTIVE',
          })
        )
    );
    const adopted = await this.mergedListings(productId, handle);
    return { data: { listings: adopted }, message: 'Store listings refreshed' };
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

  /** Suggestions for the Type combobox — the store's own already-used product types, read live
   * from Shopify so the dropdown always matches what that store actually has. */
  async listProductTypes(storeId: string, searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    return this.listTaxonomy(storeId, 'types', searchParams.get('q') ?? undefined, 'Product types retrieved');
  }

  /** Suggestions for the Vendor combobox — live from Shopify, same mechanics as Type. */
  async listVendors(storeId: string, searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    return this.listTaxonomy(storeId, 'vendors', searchParams.get('q') ?? undefined, 'Vendors retrieved');
  }

  /** Suggestions for the Tags multi-select — live from Shopify, same mechanics as Type. */
  async listTags(storeId: string, searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    return this.listTaxonomy(storeId, 'tags', searchParams.get('q') ?? undefined, 'Tags retrieved');
  }

  private async listTaxonomy(storeId: string, field: TaxonomyField, search: string | undefined, message: string) {
    try {
      const options = await searchStoreTaxonomy(storeId, field, search);
      return { data: { options }, message };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to load store options', status: 502 } };
    }
  }

  /** Manual collections on one store, for the Collections picker. */
  async listCollections(storeId: string, searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    try {
      const collections = await searchStoreCollections(storeId, { search: searchParams.get('q') ?? undefined });
      return { data: { collections }, message: 'Collections retrieved' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to search collections', status: 400 } };
    }
  }

  /** The Add flow for Collections — creates the collection on the store so the picker can
   * select it immediately. Types, vendors and tags need no creation (free-form on productSet). */
  async createCollection(storeId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const value = (body ?? {}) as Record<string, unknown>;
    const title = typeof value.title === 'string' ? value.title.trim() : '';
    if (!title) return { error: { message: 'Validation failed', errors: ['title: Enter a collection title'], status: 400 } };
    try {
      const collection = await createStoreCollection(storeId, title);
      return { data: { collection }, message: `Collection “${collection.title}” created` };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to create collection', status: 502 } };
    }
  }

  /** Sets (or clears) a store's per-store margin and, when this product is already published
   * there, immediately reprices every mapped variant on Shopify to match — the margin field's
   * whole point is to control that store's live price, so it must actually push. A store that
   * isn't listed yet (no productGid / no variant mappings) just saves the margin for the publish
   * modal's price suggestion, same as before. A Shopify failure never rolls back the saved
   * margin — the admin's input is preserved and the failure is surfaced instead. */
  async setMargin(productId: string, storeId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const product = await model.findById(productId);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    if (value.marginPercent === null) {
      await listingModel.setMargin(productId, storeId, null);
      return { data: { marginPercent: null, repriced: false }, message: 'Store margin removed' };
    }

    const marginPercent = Number(value.marginPercent);
    if (!Number.isFinite(marginPercent) || marginPercent < 0) {
      return { error: { message: 'Validation failed', errors: ['marginPercent: Enter a margin of 0 or more'], status: 400 } };
    }
    await listingModel.setMargin(productId, storeId, marginPercent);

    const [existing, mappings] = await Promise.all([listingModel.findOne(productId, storeId), listingModel.listVariantMappings(productId, storeId)]);
    const mappedVariants = mappings.filter((m) => m.variantGid);
    if (!existing?.productGid || mappedVariants.length === 0) {
      return { data: { marginPercent, repriced: false }, message: 'Store margin saved' };
    }

    try {
      const variants = mappedVariants.map((m) => ({ id: m.variantGid, price: storePriceFromMargin(product.pricing, marginPercent) }));
      const updated = await updateStoreVariantPrices({ storeId, productGid: existing.productGid, variants });
      const handle = await model.findHandle(productId);
      if (handle) revalidateTag(storeListingsTag(handle), { expire: 0 });
      return { data: { marginPercent, repriced: true, variants: updated }, message: 'Store margin saved — prices updated' };
    } catch (error) {
      return {
        data: { marginPercent, repriced: false },
        message: `Store margin saved, but repricing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
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

    const VALID_DETAIL_STATUS = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED']);
    // Tracks how many images a target sent vs. how many survived toPublicUrl, so the publish loop
    // below can tell "this store genuinely has no images" apart from "every image URL was
    // unresolvable" and fail loudly in the latter case instead of silently wiping Shopify's media.
    const imageDropInfo = new Map<string, { candidates: number; kept: number }>();
    const targets: PublishTarget[] = rawTargets.map((raw) => {
      const t = raw as Record<string, unknown>;
      const priceEntries = t.variantPrices && typeof t.variantPrices === 'object' ? Object.entries(t.variantPrices as Record<string, unknown>) : [];
      const stockEntries = t.variantStock && typeof t.variantStock === 'object' ? Object.entries(t.variantStock as Record<string, unknown>) : [];
      const d = t.details && typeof t.details === 'object' ? (t.details as Record<string, unknown>) : null;
      const rawImages = Array.isArray(t.images) ? (t.images as unknown[]) : null;
      const rawMeta = t.variantsMeta && typeof t.variantsMeta === 'object' ? Object.entries(t.variantsMeta as Record<string, unknown>) : [];
      const rawExcludedVariantIds = Array.isArray(t.excludedVariantIds) ? (t.excludedVariantIds as unknown[]) : [];
      const rawVariantImages = t.variantImages && typeof t.variantImages === 'object' ? Object.entries(t.variantImages as Record<string, unknown>) : [];
      const detailStatus =
        typeof d?.status === 'string' && VALID_DETAIL_STATUS.has(d.status)
          ? (d.status as 'ACTIVE' | 'DRAFT' | 'ARCHIVED')
          : undefined;
      const storeId = String(t.storeId ?? '');
      const images = rawImages
        ? rawImages
            .map((img) => {
              const r = img as Record<string, unknown>;
              return {
                url: toPublicUrl(typeof r.url === 'string' ? r.url : ''),
                altText: typeof r.altText === 'string' && r.altText.trim() ? r.altText.trim().slice(0, 255) : null,
              };
            })
            .filter((img): img is { url: string; altText: string | null } => img.url !== null)
            .slice(0, 250)
        : undefined;
      if (rawImages) imageDropInfo.set(storeId, { candidates: rawImages.length, kept: images?.length ?? 0 });
      return {
        storeId,
        tags: Array.isArray(t.tags) ? (t.tags as unknown[]).filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean).slice(0, 250) : [],
        seoTitle: typeof t.seoTitle === 'string' && t.seoTitle.trim() ? t.seoTitle.trim().slice(0, 70) : null,
        seoDescription: typeof t.seoDescription === 'string' && t.seoDescription.trim() ? t.seoDescription.trim().slice(0, 320) : null,
        variantPrices: Object.fromEntries(
          priceEntries
            .filter(([, v]) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 999999.99)
            .map(([k, v]) => [k, Number(v)])
        ),
        variantStock: Object.fromEntries(
          stockEntries
            .filter(([, v]) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1_000_000)
            .map(([k, v]) => [k, Math.round(Number(v))])
        ),
        details: d
          ? {
              title: typeof d.title === 'string' && d.title.trim() ? d.title.trim().slice(0, 255) : undefined,
              descriptionHtml: typeof d.descriptionHtml === 'string' ? d.descriptionHtml.slice(0, 50000) : undefined,
              vendor: typeof d.vendor === 'string' && d.vendor.trim() ? d.vendor.trim().slice(0, 255) : undefined,
              productType: typeof d.productType === 'string' ? d.productType.trim().slice(0, 255) : undefined,
              categoryId: typeof d.categoryId === 'string' ? d.categoryId : d.categoryId === null ? null : undefined,
              collectionIds: Array.isArray(d.collectionIds)
                ? (d.collectionIds as unknown[]).filter((c): c is string => typeof c === 'string' && c.length > 0).slice(0, 100)
                : undefined,
              ...(detailStatus ? { status: detailStatus } : {}),
            }
          : undefined,
        images,
        variantsMeta: Object.fromEntries(
          rawMeta.map(([hubId, meta]) => {
            const m = (meta ?? {}) as Record<string, unknown>;
            return [
              hubId,
              {
                sku: typeof m.sku === 'string' && m.sku.trim() ? m.sku.trim().slice(0, 255) : null,
                barcode: typeof m.barcode === 'string' && m.barcode.trim() ? m.barcode.trim().slice(0, 255) : null,
              },
            ];
          })
        ),
        excludedVariantIds: rawExcludedVariantIds.filter((s): s is string => typeof s === 'string').slice(0, 500),
        variantImages: Object.fromEntries(rawVariantImages.map(([hubId, url]) => [hubId, typeof url === 'string' && url ? toPublicUrl(url) : null])),
      };
    });
    if (targets.some((t) => !t.storeId)) return { error: { message: 'Validation failed', errors: ['targets: Each target needs a storeId'], status: 400 } };

    const results: { storeId: string; status: 'LISTED' | 'FAILED'; error?: string; url?: string | null }[] = [];

    for (const target of targets) {
      await listingModel.markPublishing(productId, target.storeId);
      try {
        const [existing, mappings] = await Promise.all([
          listingModel.findOne(productId, target.storeId),
          listingModel.listVariantMappings(productId, target.storeId),
        ]);
        const mappingByHub = new Map(mappings.map((m) => [m.hubVariantId, m]));
        const marginPercent = existing?.marginPercent != null ? Number(existing.marginPercent) : null;
        const payload = buildPublishPayload(product, target, mappingByHub, marginPercent);
        // Every candidate image failed toPublicUrl (no public APP_URL) — fail loudly instead of
        // silently pushing an empty `files` list, which productSet's full-replacement semantics
        // would turn into "wipe this store's media".
        if (aspects.includes('images')) {
          const info = imageDropInfo.get(target.storeId);
          if ((info?.candidates ?? 0) > 0 && payload.images.length === 0) {
            throw new Error("Images can't be published: APP_URL is not set to a public URL Shopify can fetch from");
          }
        }
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
          try {
            await listingModel.upsertVariantMappings(
              productId,
              target.storeId,
              result.variants.map((v) => ({ hubVariantId: v.hubVariantId, variantGid: v.variantGid, inventoryItemGid: v.inventoryItemGid, price: v.price }))
            );
          } catch {
            // Mapping persistence must never turn a successful Shopify push into FAILED.
          }
        }
        // Only when the Variants aspect was pushed does the controller know the full variant set
        // was reconciled with Shopify (productSet's variants input is a full replacement) — prune
        // stale mappings for any hub variant this target excluded, so a re-publish never resends a
        // dead variantGid for a variant Shopify already deleted.
        if (aspects.includes('variants')) {
          try {
            const keepHubVariantIds = product.variants.filter((v) => !(target.excludedVariantIds ?? []).includes(v.id)).map((v) => v.id);
            await listingModel.pruneVariantMappings(productId, target.storeId, keepHubVariantIds);
          } catch {
            // Mapping cleanup must never turn a successful Shopify push into FAILED.
          }
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

/** Builds the Shopify-shaped payload from the hub record with the admin's per-store overlay
 * (details, images, SKU/barcode, price, available stock) layered on top. Cost always comes from
 * the hub — never client-supplied. Stock defaults to the hub's available quantity but accepts a
 * validated per-store override from the modal (see `variantStock` above); InventoryAllocation
 * remains the hub's own ledger and is never written back from a publish. */
function buildPublishPayload(
  product: SupplierProductRow,
  target: PublishTarget,
  mappingByHub: Map<string, { variantGid: string; inventoryItemGid: string | null }> = new Map(),
  /** This store's own margin — drives price whenever the admin didn't manually edit a variant's
   * price in the modal. null = no store margin set, so the variant's own sellPrice wins. */
  marginPercent: number | null = null
): PublishPayload {
  const d = target.details ?? {};
  const hubImages = product.images
    .map((img) => ({ url: toPublicUrl(img.url ?? ''), altText: img.altText?.slice(0, 255) ?? null }))
    .filter((img): img is { url: string; altText: string | null } => img.url !== null);
  return {
    title: d.title?.trim() || (product.name?.trim() ? product.name : product.handle),
    descriptionHtml: d.descriptionHtml ? sanitizeHtml(d.descriptionHtml) : product.description,
    handle: product.handle,
    vendor: d.vendor?.trim() || (product.brand?.trim() ? product.brand : 'Default'),
    productType: d.productType ?? (product.category?.trim() ? product.category : ''),
    categoryGid: d.categoryId !== undefined ? d.categoryId : product.categoryId,
    collectionIds: d.collectionIds ?? null,
    tags: (target.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 250),
    status: d.status ?? product.status,
    seoTitle: target.seoTitle?.trim() ? target.seoTitle.trim().slice(0, 70) : null,
    seoDescription: target.seoDescription?.trim() ? target.seoDescription.trim().slice(0, 320) : null,
    images: target.images ?? hubImages,
    variants: product.variants
      .filter((v) => !(target.excludedVariantIds ?? []).includes(v.id))
      .map((v) => {
        const mapping = mappingByHub.get(v.id);
        const override = target.variantPrices?.[v.id];
        const meta = target.variantsMeta?.[v.id];
        // The modal's own per-variant picker wins whenever the admin used it (target.variantImages
        // is only sent when the images aspect is selected, with one entry per variant — including
        // an explicit null for "no image"); otherwise fall back to the hub's default variant->image
        // link. Either way, only kept when it also survived this store's image selection
        // (target.images is the already-filtered, already-absolutized list — undefined entirely
        // when the images aspect isn't selected, so both branches naturally resolve to null then).
        // Compared in absolutized form since target.images no longer carries the raw site-relative
        // hub URL.
        const pickedImageUrl = target.variantImages?.[v.id] ?? null;
        const linkedImage = v.imageId ? product.images.find((img) => img.id === v.imageId) : null;
        const linkedImagePublicUrl = linkedImage ? toPublicUrl(linkedImage.url) : null;
        const candidateImageUrl = target.variantImages && v.id in target.variantImages ? pickedImageUrl : linkedImagePublicUrl;
        const imageUrl = candidateImageUrl && target.images?.some((i) => i.url === candidateImageUrl) ? candidateImageUrl : null;
        return {
          hubVariantId: v.id,
          colour: v.colour?.trim() ? v.colour : 'Default',
          size: v.size?.trim() ? v.size : 'Default',
          sku: meta?.sku ?? (v.sku?.trim() ? v.sku.trim() : null),
          barcode: meta?.barcode ?? (v.barcode?.trim() ? v.barcode.trim() : null),
          price: Number.isFinite(Number(override)) && Number(override) >= 0
            ? Number(override)
            : marginPercent != null
              ? storePriceFromMargin(product.pricing, marginPercent)
              : Math.max(0, v.sellPrice),
          buyPrice: Math.max(0, v.buyPrice),
          availableQuantity: target.variantStock?.[v.id] ?? Math.max(0, v.stockOnHand - v.allocated),
          variantGid: mapping?.variantGid || null,
          inventoryItemGid: mapping?.inventoryItemGid || null,
          imageUrl,
        };
      }),
  };
}
