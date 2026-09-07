import { storePriceFromMargin } from '@/lib/inventory/store-price';
import { variantOptionKey } from '@/lib/inventory/variant-option-key';
import type { PricingInputs, ProductRecord, ProductStatusValue } from './types';
import type { StoreListingsState } from './hooks/useStoreListings';

export type PublishAspect = 'images' | 'details' | 'pricing' | 'variants';

export const ALL_ASPECTS: PublishAspect[] = ['images', 'details', 'pricing', 'variants'];

/** Per-store editable overlay for the publish / bulk-update modals — everything Shopify supports
 * per store. Seeded from the hub product; saving publishes the overlay without writing back to
 * the hub (hub stays the source of truth for cost; stock defaults from the hub or the store's
 * own live quantity but is editable per store — see `defaultStock`). */
export type StoreDraft = {
  /** Per-store tags, edited via the searchable Tags multi-select (Add appends + selects). */
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  /** Editable Shopify-mapped details (seeded from hub, editable per store). */
  title: string;
  description: string;
  vendor: string;
  productType: string;
  /** Real Shopify taxonomy category (distinct from the free-text productType/"Type" above),
   * seeded from the hub and overridable per store. */
  category: { id: string | null; name: string };
  /** Shopify collections (manual only — automated collections can't take direct membership
   * writes) this store's listing should belong to. Seeded from the store's live listing when
   * already published there, otherwise empty. `productSet`'s `collections` input is a full
   * replacement list, so an untouched draft must resend exactly what's already there. */
  collections: { id: string; title: string }[];
  status: ProductStatusValue;
  /** hubVariantId -> price (AUD) for this store — seeded from the store's margin (or the
   * variant's own sellPrice when no margin is set), editable per variant. */
  variantPrices: Record<string, string>;
  /** hubVariantId list of variants whose price was manually edited in this draft — only these
   * are sent on Save, so an untouched row keeps following the store's margin as it moves rather
   * than pinning whatever number happened to be seeded when the draft opened. */
  variantPricesEdited: string[];
  /** hubVariantId -> SKU / barcode overrides (seeded from hub, editable per store). */
  variantSku: Record<string, string>;
  variantBarcode: Record<string, string>;
  /** hubVariantId list excluded from this store's push — only honored when the Variants aspect
   * is included (that's the only mode where Shopify's productSet reconciles/deletes omitted
   * variants). Empty = push every hub variant. */
  excludedVariants: string[];
  /** This store's own image list — seeded from the hub gallery (not published) or the store's
   * live Shopify media (published), but from here on it's this draft's own working copy: adding
   * or removing an image here never touches the hub product or any database row, exactly like
   * every other field. Pushed as-is (minus excluded) on Save. */
  images: { id: string; url: string; altText: string | null }[];
  /** Image ids excluded from this store's push. Empty = push the full gallery. */
  excludedImages: string[];
  /** imageId -> alt-text override. Falls back to the hub alt. */
  imageAlts: Record<string, string>;
  /** hubVariantId -> id of an entry in `images` (or null for "no image"), Shopify-style — one
   * image per variant, an image may be shared. Draft-local like every other field here: never
   * touches the hub's SupplierProductVariant.imageId. */
  variantImages: Record<string, string | null>;
  /** hubVariantId -> available qty for this store, ONLY where the admin typed one. Unset keys
   * fall back to the computed default (split for a new store, live Shopify qty for a published
   * one) — the default depends on the current store selection, so it's never baked into a draft
   * the way variantPrices is (see `defaultStock`). */
  variantStock: Record<string, string>;
};

function suggestedPrice(pricing: PricingInputs, marginPercent: number | null, fallback: number): number {
  if (marginPercent === null) return fallback;
  return storePriceFromMargin(pricing, marginPercent);
}

/** Finds the live Shopify variant matching a hub variant — SKU first, then option values — used
 * to source the SKU/barcode/image/stock shown for a published store (never price, see
 * emptyDraft). Mirrors the server's own lookup in shopify-product-publish.server.ts exactly: a
 * blank hub colour/size is published as 'Default', so matching must try that substituted key
 * before the raw one, or every variant with a blank option silently fails to match. */
function matchListingVariant(listing: StoreListingsState['listings'][number] | undefined, v: { sku: string | null; colour: string; size: string }) {
  const sku = v.sku?.trim().toLowerCase();
  const hubKey = variantOptionKey([v.colour?.trim() || 'Default', v.size?.trim() || 'Default']);
  const rawKey = variantOptionKey([v.colour ?? '', v.size ?? '']);
  return (
    listing?.variants.find((sv) => sku && sv.sku?.trim().toLowerCase() === sku) ??
    listing?.variants.find((sv) => variantOptionKey(sv.optionValues) === hubKey) ??
    listing?.variants.find((sv) => variantOptionKey(sv.optionValues) === rawKey)
  );
}

/** A store counts as "published" when Shopify already has a matching product there — regardless
 * of whether this app was the one that published it. Drives which source (hub vs. live Shopify
 * listing) every field in the draft is seeded from. */
export function isPublished(listing: StoreListingsState['listings'][number] | undefined): boolean {
  return listing?.found ?? false;
}

export function emptyDraft(product: ProductRecord | null, storeId: string, storeListings: StoreListingsState): StoreDraft {
  const listing = storeListings.listings.find((l) => l.storeId === storeId);
  const margin = listing?.marginPercent ?? null;
  const published = isPublished(listing);
  const variantPrices: Record<string, string> = {};
  const variantSku: Record<string, string> = {};
  const variantBarcode: Record<string, string> = {};
  const variantImages: Record<string, string | null> = {};
  for (const v of product?.variants ?? []) {
    const matched = published ? matchListingVariant(listing, v) : undefined;
    // Price always follows the per-store margin (or the product's own default price) — never the
    // store's currently-live Shopify price, published or not.
    variantPrices[v.id] = String(product ? suggestedPrice(product.pricing, margin, v.sellPrice) : 0);
    // A matched-but-blank live variant (Shopify) falls through to the hub value instead of
    // showing empty — the live value only wins when it's actually non-blank.
    variantSku[v.id] = matched?.sku ?? v.sku ?? '';
    variantBarcode[v.id] = matched?.barcode ?? v.barcode ?? '';
    // Published: the live Shopify media id (matches an entry in `listing.images`). Unpublished:
    // the hub's own variant->image link (matches an entry in the hub gallery, seeded below as
    // `images`) — both id spaces line up with whichever list `images` ends up holding.
    variantImages[v.id] = published ? matched?.imageId ?? null : v.imageId ?? null;
  }
  return {
    tags: published ? listing?.tags ?? [] : [],
    seoTitle: published ? listing?.seoTitle ?? '' : '',
    seoDescription: published ? listing?.seoDescription ?? '' : '',
    title: published ? listing?.productTitle ?? '' : product?.name ?? '',
    description: published ? listing?.description ?? '' : product?.description ?? '',
    vendor: published ? listing?.vendor ?? '' : product?.brand ?? '',
    // Shopify's Type is free text (e.g. "Snowboard") and has nothing to do with the hub's
    // taxonomy Category ("Home & Garden > … > Skillets") — falling back to that path here would
    // just dump a confusing breadcrumb into the field, so an unset store Type stays blank
    // (ProductTypePicker's placeholder guides the admin instead).
    productType: listing?.productType ?? '',
    category: published
      ? listing?.category ?? { id: null, name: '' }
      : { id: product?.categoryId ?? null, name: product?.category ?? '' },
    collections: (listing?.collections ?? []).filter((c) => !c.automated).map((c) => ({ id: c.id, title: c.title })),
    status: published ? listing?.status ?? 'DRAFT' : product?.status ?? 'DRAFT',
    variantPrices,
    variantPricesEdited: [],
    variantSku,
    variantBarcode,
    variantImages,
    excludedVariants: [],
    images: published
      ? listing?.images ?? []
      : (product?.images ?? []).map((img) => ({ id: img.id, url: img.url, altText: img.altText })),
    excludedImages: [],
    imageAlts: {},
    variantStock: {},
  };
}

/** Available qty (stockOnHand - allocated, clamped at 0) — the hub's own pool for a variant,
 * shared by the default-stock split, the over-allocation warning, and the read-only hint next to
 * the stock input. Kept in sync with the identical expression server-side at
 * controllers/store-listing.controller.server.ts. */
function hubAvailable(v: { stockOnHand: number; allocated: number }): number {
  return Math.max(0, v.stockOnHand - v.allocated);
}

/**
 * Per-store default for the editable Available column — a sibling to `emptyDraft`, called the
 * same way but kept separate because it depends on the *current store selection*, not just the
 * store being drafted, so it can't be baked into `emptyDraft`'s one-time seed.
 *
 * Published store: this store's own live Shopify quantity (falling back to the hub pool for an
 * unmatched or blank variant). Unpublished store: the hub pool split evenly across every
 * currently-selected store that isn't published yet, in `storeListings.listings` order — deriving
 * the order from `listings` (rather than the caller's `selectedStoreIds` iteration order, which
 * is just click order) is what keeps the on-screen split and the submitted payload in agreement
 * regardless of the order stores were selected in.
 */
export function defaultStock(
  product: ProductRecord | null,
  storeId: string,
  selectedStoreIds: Set<string>,
  storeListings: StoreListingsState
): Record<string, number> {
  if (!product) return {};
  const listing = storeListings.listings.find((l) => l.storeId === storeId);
  const published = isPublished(listing);
  const peers = published ? [] : storeListings.listings.filter((l) => selectedStoreIds.has(l.storeId) && !isPublished(l));
  const peerIndex = peers.findIndex((l) => l.storeId === storeId);
  const n = peers.length || 1;
  const i = Math.max(0, peerIndex);

  const result: Record<string, number> = {};
  for (const v of product.variants) {
    if (published) {
      // Sums stock across every location Shopify has it at for this store, while the write path
      // (getPrimaryLocationId) only ever sets stock at ONE location. On a store with multiple
      // stocked locations, reopening this modal after a save will show a number already inflated
      // by that save. Store publishing already assumes one fulfilment location per store — this
      // is the same assumption, just newly visible here. No effect for the common single-location
      // store.
      result[v.id] = matchListingVariant(listing, v)?.inventoryQuantity ?? hubAvailable(v);
    } else {
      const available = hubAvailable(v);
      result[v.id] = Math.floor(available / n) + (i < available % n ? 1 : 0);
    }
  }
  return result;
}

/** Resolves what actually gets pushed for one variant: the admin's typed value if there is one,
 * otherwise the computed default. A blank or non-numeric entry (including a box the admin
 * cleared) also falls back to the default rather than reading as 0 — Number('') is 0 in JS, so
 * this needs an explicit check; an admin who means "sold out" types 0 rather than clearing the
 * box. */
export function resolveStock(draft: StoreDraft, variantId: string, defaults: Record<string, number>): number {
  const raw = draft.variantStock[variantId];
  const trimmed = raw?.trim();
  if (!trimmed) return defaults[variantId] ?? 0;
  const parsed = Math.round(Number(trimmed));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : defaults[variantId] ?? 0;
}

/** Assembles one store's target payload for the publish/bulk-update POST body — pure so it can be
 * unit-reasoned-about separately from the request plumbing in useStorePublish's `submit`. */
export function buildPublishTarget(
  product: ProductRecord,
  storeId: string,
  draft: StoreDraft,
  aspects: PublishAspect[],
  defaultStockForStore: Record<string, number>
) {
  const images =
    aspects.includes('images')
      ? draft.images
          .filter((img) => !draft.excludedImages.includes(img.id))
          .map((img) => ({ url: img.url, altText: draft.imageAlts[img.id] ?? img.altText }))
      : undefined;
  // Resolved by id -> URL here (rather than sending the id) so the server's contract for a
  // variant image matches how the product-level `images` list is already sent. An id
  // pointing at an excluded/removed image resolves to null — same as "no image".
  const includedImageUrlById = new Map(
    draft.images.filter((img) => !draft.excludedImages.includes(img.id)).map((img) => [img.id, img.url])
  );
  const variantImages =
    aspects.includes('images')
      ? Object.fromEntries(
          product.variants.map((v) => {
            const imageId = draft.variantImages[v.id];
            return [v.id, imageId ? includedImageUrlById.get(imageId) ?? null : null];
          })
        )
      : undefined;
  const seenTags = new Set<string>();
  const tags: string[] = [];
  for (const t of draft.tags) {
    const clean = t.trim();
    const key = clean.toLowerCase();
    if (!clean || seenTags.has(key)) continue;
    seenTags.add(key);
    tags.push(clean);
  }
  return {
    storeId,
    tags,
    seoTitle: draft.seoTitle || null,
    seoDescription: draft.seoDescription || null,
    details: aspects.includes('details')
      ? {
          title: draft.title.trim() || product.name,
          descriptionHtml: draft.description,
          vendor: draft.vendor.trim() || product.brand,
          productType: draft.productType.trim(),
          categoryId: draft.category.id,
          collectionIds: draft.collections.map((c) => c.id),
          status: draft.status,
        }
      : undefined,
    images,
    variantImages,
    variantsMeta: aspects.includes('variants')
      ? Object.fromEntries(
          product.variants.map((v) => [
            v.id,
            { sku: (draft.variantSku[v.id] ?? '').trim() || null, barcode: (draft.variantBarcode[v.id] ?? '').trim() || null },
          ])
        )
      : undefined,
    excludedVariantIds: aspects.includes('variants') ? draft.excludedVariants : undefined,
    // Only manually-edited prices are sent — an untouched row is left for the server to
    // price from this store's own margin (falling back to the variant's sellPrice), so it
    // keeps following the margin if that's changed after the draft was seeded.
    variantPrices: Object.fromEntries(
      Object.entries(draft.variantPrices)
        .filter(([id]) => draft.variantPricesEdited.includes(id))
        .map(([id, v]) => [id, Number(v)] as const)
        .filter(([, v]) => Number.isFinite(v) && v >= 0)
    ),
    // Sent for every variant regardless of aspect, unlike variantPrices — an *omitted* stock
    // value would make the server fall back to the full hub quantity and defeat the split, where
    // an omitted price safely falls back to the store's margin. Harmless when the server doesn't
    // act on it (effectiveVariants false — see shopify-product-publish.server.ts).
    variantStock: Object.fromEntries(product.variants.map((v) => [v.id, resolveStock(draft, v.id, defaultStockForStore)])),
  };
}
