import { resolveStoreMargin } from '@/lib/inventory/store-price';
import { resolveOptionAxes } from '@/lib/inventory/variant-options';
import { matchListingVariant, suggestedPrice, toHubStatus } from './storeDraft';
import type { ProductRecord, StoreListingResult, StoreListingVariant } from './types';

export type FieldDiffKey = 'title' | 'description' | 'vendor' | 'status' | 'category';

/** One product-level field that disagrees between the hub record and a store's live Shopify
 * listing. `systemValue` is what the hub has (and what Sync would push); `storeValue` is what's
 * currently live. Both are already display-formatted strings. */
export type StoreFieldDiff = {
  key: FieldDiffKey;
  label: string;
  systemValue: string;
  storeValue: string;
};

/** Product image galleries disagree in size (not diffed field-by-field — see storeDiff.ts's
 * module doc for why individual images aren't compared). */
export type StoreImagesDiff = {
  systemCount: number;
  storeCount: number;
};

export type VariantFieldKey = 'price' | 'sku' | 'barcode' | 'image';

export type StoreVariantDiff = {
  /** The hub variant id — stable identity for 'changed'/'missing-in-store' rows. An
   * 'extra-in-store' row (no hub counterpart) uses the live Shopify variant gid instead. */
  key: string;
  kind: 'changed' | 'missing-in-store' | 'extra-in-store';
  colour: string;
  size: string;
  /** Empty for missing/extra rows — there's nothing to field-diff against, the whole row is the
   * difference. */
  fields: { field: VariantFieldKey; label: string; systemValue: string; storeValue: string }[];
};

/** One row of the full variants table shown in the differences modal — every hub variant plus
 * any Shopify-only ("extra in store") variant, so the admin sees the whole picture (matches
 * included) rather than only the rows that disagree. `hubVariantId` is unset for an
 * extra-in-store row. */
export type StoreVariantTableRow = {
  key: string;
  kind: 'match' | 'changed' | 'missing-in-store' | 'extra-in-store';
  hubVariantId?: string;
  colour: string;
  size: string;
  systemSku: string;
  storeSku: string;
  systemBarcode: string;
  storeBarcode: string;
  systemPrice: number;
  storePrice: number | null;
  /** Store's live available quantity — shown read-only; stock is deliberately not diffed (a
   * shared stock pool is expected to differ store-to-store by design). */
  storeQuantity: number | null;
  /** 1-based position of the linked image within each side's gallery — compared by position, not
   * URL, since Shopify rewrites image URLs on publish. Null = no image linked. */
  systemImagePosition: number | null;
  storeImagePosition: number | null;
  /** The hub variant's own linked image id (`v.imageId`) — unlike the position above, this is a
   * real id from the hub gallery, so it's what seeds and falls back the differences table's Image
   * picker. Null for an extra-in-store row (no hub variant to link). */
  systemImageId: string | null;
  mismatchedFields: Set<VariantFieldKey>;
};

export type StoreDiffResult = {
  fields: StoreFieldDiff[];
  images: StoreImagesDiff | null;
  variants: StoreVariantDiff[];
  rows: StoreVariantTableRow[];
  /** Total individually-syncable differences — fields plus the images diff (if any) plus every
   * variant field diff, plus one each for a missing/extra variant row. Drives the count badge on
   * the store card. */
  total: number;
};

/** Collapses HTML whitespace differences (attribute quoting, line breaks) that aren't a real
 * content difference — a description round-tripped through Shopify and back shouldn't show as
 * "changed" just because the tags got reformatted. */
function normalizeHtml(html: string | null): string {
  return (html ?? '').replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatPrice(n: number): string {
  return n.toFixed(2);
}

/** 1-based position of an image id within a gallery, or null when absent/unlinked — used to
 * compare a variant's linked image across hub and store without relying on the URL, which
 * Shopify rewrites on every publish. */
function imagePosition(images: { id: string }[], imageId: string | null | undefined): number | null {
  if (!imageId) return null;
  const index = images.findIndex((img) => img.id === imageId);
  return index === -1 ? null : index + 1;
}

/**
 * Pure client-side diff (item 4) between the hub product and one store's already-loaded live
 * listing — no extra request, since `GET .../store-listings` already returns every field
 * compared here. Deliberately excludes stock (expected to differ store-to-store by design, since
 * several stores share one hub pool) and per-image content (not worth the false-positive rate
 * from Shopify's own image processing/URLs) — only the gallery's size and each variant's image
 * *position* within it are compared.
 */
export function computeStoreDiff(product: ProductRecord, listing: StoreListingResult): StoreDiffResult {
  const fields: StoreFieldDiff[] = [];
  let images: StoreImagesDiff | null = null;

  if (listing.found) {
    if (product.name.trim() !== (listing.productTitle ?? '').trim()) {
      fields.push({ key: 'title', label: 'Title', systemValue: product.name, storeValue: listing.productTitle ?? '' });
    }
    if (normalizeHtml(product.description) !== normalizeHtml(listing.description)) {
      fields.push({ key: 'description', label: 'Description', systemValue: product.description, storeValue: listing.description ?? '' });
    }
    if (product.brand.trim() !== (listing.vendor ?? '').trim()) {
      fields.push({ key: 'vendor', label: 'Vendor', systemValue: product.brand, storeValue: listing.vendor ?? '' });
    }
    if (product.status !== toHubStatus(listing.status)) {
      fields.push({ key: 'status', label: 'Status', systemValue: product.status, storeValue: toHubStatus(listing.status) });
    }
    if ((product.categoryId ?? null) !== (listing.category?.id ?? null)) {
      fields.push({ key: 'category', label: 'Shopify Category', systemValue: product.category, storeValue: listing.category?.name ?? '' });
    }
    if (product.images.length !== listing.images.length) {
      images = { systemCount: product.images.length, storeCount: listing.images.length };
    }
    // Tags, SEO, Type and Collections are deliberately not diffed here — they're store-only
    // fields with no hub-level source of truth to compare against (see StoreDraft.tags etc.),
    // unlike title/description/vendor/status/category which the hub genuinely owns.
  }

  const margin = resolveStoreMargin(listing.marginPercent, listing.storeDefaultMarginPercent);
  const axes = resolveOptionAxes(product.variants);
  const matchedExternalIds = new Set<string>();
  const variants: StoreVariantDiff[] = [];
  const rows: StoreVariantTableRow[] = [];

  for (const v of product.variants) {
    const matched: StoreListingVariant | undefined = listing.found ? matchListingVariant(listing, v, axes) : undefined;
    const systemPrice = round2(suggestedPrice(product.pricing, margin, v.sellPrice));
    const systemImagePosition = imagePosition(product.images, v.imageId);

    if (!matched) {
      if (listing.found) {
        variants.push({ key: v.id, kind: 'missing-in-store', colour: v.colour, size: v.size, fields: [] });
        rows.push({
          key: v.id,
          kind: 'missing-in-store',
          hubVariantId: v.id,
          colour: v.colour,
          size: v.size,
          systemSku: v.sku ?? '',
          storeSku: '',
          systemBarcode: v.barcode ?? '',
          storeBarcode: '',
          systemPrice,
          storePrice: null,
          storeQuantity: null,
          systemImagePosition,
          storeImagePosition: null,
          systemImageId: v.imageId ?? null,
          mismatchedFields: new Set(),
        });
      }
      continue;
    }
    matchedExternalIds.add(matched.id);

    const livePrice = round2(matched.price);
    const storeImagePosition = imagePosition(listing.images, matched.imageId);
    const rowFields: StoreVariantDiff['fields'] = [];
    const mismatchedFields = new Set<VariantFieldKey>();
    if (systemPrice !== livePrice) {
      rowFields.push({ field: 'price', label: 'Price', systemValue: formatPrice(systemPrice), storeValue: formatPrice(livePrice) });
      mismatchedFields.add('price');
    }
    if ((v.sku ?? '').trim() !== (matched.sku ?? '').trim()) {
      rowFields.push({ field: 'sku', label: 'SKU', systemValue: v.sku ?? '', storeValue: matched.sku ?? '' });
      mismatchedFields.add('sku');
    }
    if ((v.barcode ?? '').trim() !== (matched.barcode ?? '').trim()) {
      rowFields.push({ field: 'barcode', label: 'Barcode', systemValue: v.barcode ?? '', storeValue: matched.barcode ?? '' });
      mismatchedFields.add('barcode');
    }
    if (systemImagePosition !== storeImagePosition) {
      rowFields.push({
        field: 'image',
        label: 'Image',
        systemValue: systemImagePosition ? `Image ${systemImagePosition}` : 'None',
        storeValue: storeImagePosition ? `Image ${storeImagePosition}` : 'None',
      });
      mismatchedFields.add('image');
    }
    if (rowFields.length > 0) {
      variants.push({ key: v.id, kind: 'changed', colour: v.colour, size: v.size, fields: rowFields });
    }
    rows.push({
      key: v.id,
      kind: rowFields.length > 0 ? 'changed' : 'match',
      hubVariantId: v.id,
      colour: v.colour,
      size: v.size,
      systemSku: v.sku ?? '',
      storeSku: matched.sku ?? '',
      systemBarcode: v.barcode ?? '',
      storeBarcode: matched.barcode ?? '',
      systemPrice,
      storePrice: livePrice,
      storeQuantity: matched.inventoryQuantity,
      systemImagePosition,
      storeImagePosition,
      systemImageId: v.imageId ?? null,
      mismatchedFields,
    });
  }

  if (listing.found) {
    for (const sv of listing.variants) {
      if (matchedExternalIds.has(sv.id)) continue;
      const colour = sv.optionValues[0] ?? sv.title;
      const size = sv.optionValues[1] ?? '';
      variants.push({ key: `store:${sv.id}`, kind: 'extra-in-store', colour, size, fields: [] });
      rows.push({
        key: `store:${sv.id}`,
        kind: 'extra-in-store',
        colour,
        size,
        systemSku: '',
        storeSku: sv.sku ?? '',
        systemBarcode: '',
        storeBarcode: sv.barcode ?? '',
        systemPrice: 0,
        storePrice: round2(sv.price),
        storeQuantity: sv.inventoryQuantity,
        systemImagePosition: null,
        storeImagePosition: imagePosition(listing.images, sv.imageId),
        systemImageId: null,
        mismatchedFields: new Set(),
      });
    }
  }

  const variantDiffCount = variants.reduce((sum, v) => sum + (v.fields.length > 0 ? v.fields.length : 1), 0);
  return { fields, images, variants, rows, total: fields.length + (images ? 1 : 0) + variantDiffCount };
}
