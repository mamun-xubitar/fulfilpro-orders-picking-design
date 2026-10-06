import { deriveColorFromName, isValidCssColor, FALLBACK_SWATCH, parseColoursInput, formatColoursInput, formatColourName } from '@/lib/inventory/colour';
import { formatPoNumber } from '@/lib/inventory/po-number';
import { NEAR_TRIGGER_RATIO } from './constants';
import type {
  ColourOption,
  IncomingLot,
  PricingComputed,
  PricingForm,
  PricingInputs,
  ProductImage,
  ProductRecord,
  PurchaseOrderRecord,
  QuickFilterId,
  StockSummary,
  VariantComputed,
  VariantRow,
  VariantStatus,
} from './types';

// — Stock maths —

/** "Black / M", "Black" (colour-only), "M" (size-only), or "Default Title" (neither axis,
 * matching Shopify's own label for an option-less variant) — a single source of truth for
 * labelling a variant, so a colour-only or size-only product never shows a dangling "Black / "
 * or " / M". The colour half renders Title Case regardless of how it was typed or imported. */
export function variantTitle(v: { colour: string; size: string }): string {
  const parts = [v.colour ? formatColourName(v.colour) : '', v.size].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : 'Default Title';
}

export function getAvailable(v: VariantRow): number {
  return v.stockOnHand - v.allocated;
}

export function getStockValue(v: VariantRow): number {
  return v.stockOnHand * v.sellPrice;
}

/** The four price-shortcut buttons, applied to a single variant. In single-product view this
 * runs entirely client-side against the already-loaded product, narrowing which variant *rows*
 * are shown. In All-records mode the server (`models/supplier-product.model.server.ts`) applies
 * the same per-variant thresholds and lists a *product* if any one of its variants matches. */
export function quickFilterMatches(quickFilter: QuickFilterId, v: VariantRow): boolean {
  switch (quickFilter) {
    case 'buying-lt-1':
      return v.buyPrice < 1;
    case 'profit-lt-5':
      return v.sellPrice - v.buyPrice < 5;
    case 'selling-lt-1':
      return v.sellPrice < 1;
    case 'selling-lt-5':
      return v.sellPrice < 5;
  }
}

export function getStatus(v: VariantRow): VariantStatus {
  const available = getAvailable(v);
  if (available < v.trigger) return 'below';
  if (available <= v.trigger * NEAR_TRIGGER_RATIO) return 'near';
  return 'above';
}

export function computeVariant(v: VariantRow): VariantComputed {
  return {
    available: getAvailable(v),
    stockValue: getStockValue(v),
    status: getStatus(v),
  };
}

/** The variant fields the matrix lets an admin edit directly. Computed cells (available,
 * stockValue, status, incoming) and read-only ones (buyPrice, allocatedFromOrders) are
 * deliberately absent — they're never part of a draft. */
const VARIANT_DRAFT_FIELDS = ['sku', 'barcode', 'colour', 'size', 'stockOnHand', 'allocated', 'trigger', 'sellPrice', 'locations'] as const;

/** A draft diff as the variant PATCH body — `locations` travel as `locationStock` (each location
 * with the stock held there). A located variant's stock on hand is the sum of its locations, so a
 * drafted `stockOnHand` only goes along while the variant ends up with no location. */
export function variantPatchBody(changes: Partial<VariantRow>): Record<string, unknown> {
  const { locations, stockOnHand, ...rest } = changes;
  if (!locations) return stockOnHand === undefined ? { ...rest } : { ...rest, stockOnHand };
  return {
    ...rest,
    locationStock: locations.map((l) => ({ locationId: l.id, quantity: l.quantity })),
    ...(locations.length === 0 && stockOnHand !== undefined ? { stockOnHand } : {}),
  };
}

/** A row with its unsaved draft overlaid. A located variant's stock on hand is always the sum of its
 * locations, so it's recomputed from the drafted locations rather than drafted itself; dropping
 * every location leaves the unassigned stock it had (0 when it had locations — removal needs 0). */
export function applyVariantDraft(server: VariantRow, draft: Partial<VariantRow>): VariantRow {
  const row = { ...server, ...draft };
  if (row.locations.length > 0) row.stockOnHand = row.locations.reduce((sum, l) => sum + l.quantity, 0);
  else if (draft.locations && draft.stockOnHand === undefined) row.stockOnHand = server.locations.length === 0 ? server.stockOnHand : 0;
  return row;
}

/** The minimal diff between a draft and the server's row — the exact PATCH body to send, and
 * empty when the row is clean (a value typed then typed back to the original disarms Save,
 * rather than staying dirty because the field was merely touched). `''` and `null` are treated as
 * equal for sku/barcode: the text input writes `''` for a cleared field and the server normalises
 * that back to `null` (see SupplierProductController.updateVariant), so clearing an
 * already-null SKU isn't a change. */
export function variantDraftChanges(server: VariantRow, draft: Partial<VariantRow> | undefined): Partial<VariantRow> {
  if (!draft) return {};
  const changed: Partial<VariantRow> = {};
  for (const field of VARIANT_DRAFT_FIELDS) {
    if (!(field in draft)) continue;
    const next = draft[field];
    if (next === undefined) continue;
    if (field === 'locations') {
      // A set compared by id, plus the stock at each: reordering or re-picking the same locations
      // with the same quantities isn't a change.
      const before = new Map(server.locations.map((l) => [l.id, l.quantity]));
      const after = draft.locations ?? [];
      if (before.size === after.length && after.every((l) => before.get(l.id) === l.quantity)) continue;
    } else if ((server[field] ?? '') === (next ?? '')) continue;
    (changed as Record<string, unknown>)[field] = next;
  }
  return changed;
}

/** Folds the visible rows into the Stock Summary panel and the table totals row. */
export function summariseVariants(rows: VariantRow[]): StockSummary {
  return rows.reduce<StockSummary>(
    (acc, v) => ({
      totalStock: acc.totalStock + v.stockOnHand,
      availableStock: acc.availableStock + getAvailable(v),
      allocated: acc.allocated + v.allocated,
      incoming: acc.incoming + v.incoming,
      stockValue: acc.stockValue + getStockValue(v),
      trigger: acc.trigger + v.trigger,
    }),
    { totalStock: 0, availableStock: 0, allocated: 0, incoming: 0, stockValue: 0, trigger: 0 }
  );
}

// — Pricing maths —

/**
 * Freight and Misc are always AUD, so only the (foreign-currency) buying price is
 * converted by the exchange rate. Margin is a mark-up on landed cost, and tax is a
 * percent of the ex-tax sell price rather than a flat amount.
 */
export function computePricing(v: PricingInputs): PricingComputed {
  const totalBuying = v.buyingPrice * v.exchangeRate + v.freight + v.misc;
  const sellingPrice = totalBuying * (1 + v.marginPercent / 100);
  const taxAmount = sellingPrice * (v.tax / 100);
  return { totalBuying, sellingPrice, taxAmount, sellingIncTax: sellingPrice + taxAmount };
}

export function pricingFormToInputs(form: PricingForm): PricingInputs {
  return {
    currencyCode: form.currencyCode,
    exchangeRate: Number(form.exchangeRate) || 0,
    buyingPrice: Number(form.buyingPrice) || 0,
    freight: Number(form.freight) || 0,
    misc: Number(form.misc) || 0,
    marginPercent: Number(form.marginPercent) || 0,
    tax: Number(form.tax) || 0,
  };
}

export function pricingInputsToForm(pricing: PricingInputs): PricingForm {
  return {
    currencyCode: pricing.currencyCode,
    exchangeRate: pricing.exchangeRate.toFixed(2),
    buyingPrice: String(pricing.buyingPrice),
    freight: String(pricing.freight),
    misc: String(pricing.misc),
    marginPercent: String(pricing.marginPercent),
    tax: String(pricing.tax),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// — Formatters —

export function formatNumber(n: number): string {
  return n.toLocaleString('en-AU');
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrencyValue(n: number): string {
  return `$${formatMoney(n)}`;
}

/** A store listing's price, or price range, formatted with a leading `$` on both ends of a
 * range — e.g. "$12.00 – $15.00", not "$12.00 – 15.00". Used by both the store cards and the
 * per-store price chips under Pricing & margin. */
export function priceLabel(variants: { price: number }[]): string {
  if (variants.length === 0) return '—';
  const prices = variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatCurrencyValue(min) : `${formatCurrencyValue(min)} – ${formatCurrencyValue(max)}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "10 (28 Aug 2026)", or "10 (Date not set)" when the PO has no delivery date yet. */
export function formatIncomingLot(lot: IncomingLot): string {
  const date = lot.date ? new Date(lot.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set';
  return `${formatNumber(lot.quantity)} (${date})`;
}

/** Quantity-weighted average unit cost across a PO's line items — `Σ(qty × unitCost) / Σ(qty)`.
 * Null when there's no quantity to weight by, or every line is missing a cost. Shared by the
 * Purchase orders panel (one-line summary) and the Buying history modal (per-PO row). */
export function poAveragePrice(items: { quantity: number; unitCost: number | null }[]): number | null {
  const priced = items.filter((i) => i.unitCost !== null);
  const totalQty = priced.reduce((sum, i) => sum + i.quantity, 0);
  if (totalQty === 0) return null;
  const totalCost = priced.reduce((sum, i) => sum + i.quantity * (i.unitCost ?? 0), 0);
  return totalCost / totalQty;
}

export function formatRelative(iso: string, now: number): string {
  const diffMinutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// — Colour / size helpers —

export { parseColoursInput, formatColoursInput };

/** Resolves a bare colour name with no stored ColourOption — e.g. a variant colour that
 * predates the product's declared palette — to a CSS value, falling back to grey. */
export function getSwatch(colour: string): string {
  const derived = deriveColorFromName(colour);
  return isValidCssColor(derived) ? derived : FALLBACK_SWATCH;
}

/** Resolves a colour name to the product's own CSS colour value, falling back to getSwatch. */
export function makeSwatchResolver(colours: ColourOption[]): (colour: string) => string {
  const map = new Map(colours.map((c) => [c.name.trim().toLowerCase(), c.color]));
  return (colour: string) => map.get(colour.trim().toLowerCase()) ?? getSwatch(colour);
}

/** "50, 52, 54, 56" → ['50','52','54','56'] — splits only on commas, so a multi-word size
 * (e.g. "One Size") survives intact. Mirrors parseColoursInput. */
export function parseSizesInput(value: string): string[] {
  return value
    .split(',')
    .map((size) => size.trim())
    .filter(Boolean);
}

export function formatSizesInput(sizes: string[]): string {
  return sizes.join(', ');
}

/** Display-only: capitalises the first character, leaving the rest exactly as typed — "xl" reads
 * as "Xl" but "XL" stays "XL". */
export function capitaliseFirst(name: string): string {
  return name.length === 0 ? name : name.charAt(0).toUpperCase() + name.slice(1);
}

/** Alphabetical, but numeric-aware — "2" sorts before "10" (not "10" before "2"), and digits sort
 * before letters ("30", "36", "L", "XL" rather than "L", "XL", "30", "36"). Used by the Colour &
 * size adjustment modal (item 2) to order its Colour/Size/Variant columns; display-only, it never
 * changes the size axis order stored on the product. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/** `product.category` stores the full Shopify taxonomy path ("Apparel & Accessories > … >
 * Visors") — this is the compact display form for space-constrained rows (the products table),
 * which show the leaf with the full path as a `title` tooltip instead. */
/** Grouped by colour (A->Z) so same-colour rows stay together; within a colour, ordered by the
 * product's own declared size order. A row whose size isn't in that list (e.g. a migrated
 * "Default Title") falls back to the input order — Array#sort is stable, so returning 0 for an
 * undefined/undefined tie preserves whatever order the caller passed in. Shared by the product
 * page's variants matrix and the publish/bulk-update store draft tables, so all three read the
 * same way. */
export function sortVariantsForDisplay<T extends { colour: string; size: string }>(variants: T[], sizes: string[]): T[] {
  const sizeIndex = new Map(sizes.map((s, i) => [s.toLowerCase(), i]));
  return [...variants].sort((a, b) => {
    const byColour = a.colour.localeCompare(b.colour, undefined, { sensitivity: 'base' });
    if (byColour !== 0) return byColour;
    const aIndex = sizeIndex.get(a.size.toLowerCase());
    const bIndex = sizeIndex.get(b.size.toLowerCase());
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
    if (aIndex !== undefined) return -1;
    if (bIndex !== undefined) return 1;
    return 0;
  });
}

export function categoryLeaf(category: string): string {
  const parts = category.split('>').map((p) => p.trim());
  return parts[parts.length - 1] ?? '';
}

/** One tile in the gallery: an image linked to one or more variants, a colour-swatch stand-in
 * for a colour that still has a variant with no linked image, or an unassigned image (linked to
 * no variant at all — kept as its own tile, never folded together with other unassigned images). */
export type GalleryTile =
  | { kind: 'photo'; key: string; image: ProductImage; label: string; variantIds: string[] }
  | { kind: 'placeholder'; key: string; colourName: string; color: string; label: string };

/**
 * Builds the gallery rail (and the lightbox, which shares this same list) from the
 * variant→image link — `VariantRow.imageId` — rather than an image-level colour tag, mirroring
 * how Shopify itself models `Variant Image`. Order: every image linked to at least one variant,
 * in pool order (one tile per image, even when several variants share it — its label lists all
 * of them); then one placeholder swatch per colour that still has a variant with no linked
 * image; then every image linked to no variant at all, one tile each, labelled "Unassigned".
 */
export function buildGalleryTiles(images: ProductImage[], variants: VariantRow[], colours: ColourOption[]): GalleryTile[] {
  const swatchOf = makeSwatchResolver(colours);
  const variantsByImageId = new Map<string, VariantRow[]>();
  for (const v of variants) {
    if (!v.imageId) continue;
    const bucket = variantsByImageId.get(v.imageId) ?? [];
    bucket.push(v);
    variantsByImageId.set(v.imageId, bucket);
  }

  // One tile per image, in caller order (newest first — see useProductImages) regardless of
  // whether it's linked to a variant yet: a freshly uploaded, still-unassigned photo needs to
  // sort by recency alongside every other photo, not trail behind every colour placeholder.
  const tiles: GalleryTile[] = [];
  for (const image of images) {
    const linked = variantsByImageId.get(image.id);
    tiles.push({
      kind: 'photo',
      key: image.id,
      image,
      label: linked && linked.length > 0 ? linked.map(variantTitle).join(', ') : 'Unassigned',
      variantIds: linked ? linked.map((v) => v.id) : [],
    });
  }

  // Declared colours first, then any stray colour only a variant carries — mirrors the old
  // grouping's colour ordering.
  const colourNames: string[] = [];
  const seenColour = new Set<string>();
  for (const c of colours) {
    const key = c.name.trim().toLowerCase();
    if (seenColour.has(key)) continue;
    seenColour.add(key);
    colourNames.push(c.name);
  }
  for (const v of variants) {
    if (!v.colour) continue;
    const key = v.colour.trim().toLowerCase();
    if (seenColour.has(key)) continue;
    seenColour.add(key);
    colourNames.push(v.colour);
  }

  for (const colourName of colourNames) {
    const key = colourName.trim().toLowerCase();
    const hasUnlinkedVariant = variants.some((v) => v.colour.trim().toLowerCase() === key && !v.imageId);
    if (!hasUnlinkedVariant) continue;
    tiles.push({ kind: 'placeholder', key: `placeholder:${key}`, colourName, color: swatchOf(colourName), label: colourName });
  }

  return tiles;
}

/** Derives a display filename from an image URL, for images with no stored altText. */
export function deriveImageFilename(url: string): string {
  try {
    const path = new URL(url, 'http://placeholder.local').pathname;
    const last = path.split('/').filter(Boolean).pop() ?? url;
    return decodeURIComponent(last);
  } catch {
    return url;
  }
}

// — Product search —

/** Matches a product on name, SKU, item number, or any variant SKU / barcode. */
export function matchesProduct(product: ProductRecord, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.sku.toLowerCase().includes(q)) return true;
  if (product.itemNo.toLowerCase().includes(q)) return true;
  if (product.handle.toLowerCase().includes(q)) return true;
  return product.variants.some((v) => v.sku?.toLowerCase().includes(q) || v.barcode?.toLowerCase().includes(q));
}

// — CSV export —

function escapeCsv(field: string): string {
  return /[",\n]/.test(field) ? `"${field.replaceAll('"', '""')}"` : field;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Shopify's own product-CSV column order. Building rows as `{ [header]: value }` objects
 * (below) rather than positional arrays keeps every row aligned to this list even as columns
 * are added, instead of relying on array-index bookkeeping. */
const SHOPIFY_CSV_HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Variant Image',
  'Variant Weight Unit',
  'Cost per item',
  'Status',
] as const;

type ShopifyCsvHeader = (typeof SHOPIFY_CSV_HEADERS)[number];

function csvRowToLine(row: Partial<Record<ShopifyCsvHeader, string>>): string {
  return SHOPIFY_CSV_HEADERS.map((header) => escapeCsv(row[header] ?? '')).join(',');
}

// UNLISTED has no Shopify equivalent — exported as 'active' (Published stays FALSE below, so
// re-importing keeps it hidden from channels, matching how the publish path treats it).
const PRODUCT_STATUS_TO_SHOPIFY: Record<ProductRecord['status'], string> = { ACTIVE: 'active', DRAFT: 'draft', UNLISTED: 'active' };

/** Resolves a stored (possibly relative, `/api/uploads/...`) image URL to an absolute one, so
 * an exported CSV is importable by Shopify — its importer can't fetch a site-relative path. */
export function toAbsoluteUrl(url: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) return url;
  if (typeof window === 'undefined') return url;
  return new URL(url, window.location.origin).href;
}

/**
 * Shopify product-CSV export, built to be re-importable by both Shopify and this system.
 * `Handle` is the product's own handle (not itemNo); a colour-only or size-only product writes
 * only the axis it has (falling back to a "Title" / "Default Title" row when it has neither);
 * `Image Src` walks the product's full image pool one per row — variant rows first, then extra
 * image-only rows for any pool images left over — while `Variant Image` points at the specific
 * image each variant is linked to, if any. Fields the hub doesn't track (Tags, weight, SEO) are
 * left blank rather than guessed.
 */
export function buildShopifyProductCsv(product: ProductRecord, rows: VariantRow[]): string {
  const lines = [SHOPIFY_CSV_HEADERS.join(',')];
  const pool = product.images;
  const imageById = new Map(pool.map((image) => [image.id, image]));

  const hasColourAxis = product.colours.length > 0 || rows.some((v) => v.colour !== '');
  const hasSizeAxis = product.sizes.length > 0 || rows.some((v) => v.size !== '');
  const option1Name = hasColourAxis ? 'Colour' : hasSizeAxis ? 'Size' : 'Title';
  const option2Name = hasColourAxis && hasSizeAxis ? 'Size' : '';
  const option1Value = (v: VariantRow) => (hasColourAxis ? v.colour : hasSizeAxis ? v.size : 'Default Title');
  const option2Value = (v: VariantRow) => (hasColourAxis && hasSizeAxis ? v.size : '');

  rows.forEach((v, index) => {
    const poolImage = pool[index];
    const variantImage = v.imageId ? imageById.get(v.imageId) : undefined;
    const row: Partial<Record<ShopifyCsvHeader, string>> = {
      Handle: product.handle,
      'Option1 Value': option1Value(v),
      'Option2 Value': option2Value(v),
      'Variant SKU': v.sku ?? '',
      'Variant Grams': '0',
      'Variant Inventory Tracker': 'shopify',
      'Variant Inventory Qty': String(v.stockOnHand),
      'Variant Inventory Policy': 'deny',
      'Variant Fulfillment Service': 'manual',
      'Variant Price': v.sellPrice.toFixed(2),
      'Variant Requires Shipping': 'TRUE',
      'Variant Taxable': 'TRUE',
      'Variant Barcode': v.barcode ?? '',
      'Cost per item': v.buyPrice.toFixed(2),
      'Variant Image': variantImage ? toAbsoluteUrl(variantImage.url) : '',
    };
    if (poolImage) {
      row['Image Src'] = toAbsoluteUrl(poolImage.url);
      row['Image Position'] = String(index + 1);
      row['Image Alt Text'] = poolImage.altText ?? '';
    }
    if (index === 0) {
      row.Title = product.name;
      row['Body (HTML)'] = product.description;
      row.Vendor = product.brand;
      row['Product Category'] = product.category;
      row.Published = product.status === 'ACTIVE' ? 'TRUE' : 'FALSE';
      row['Option1 Name'] = option1Name;
      row['Option2 Name'] = option2Name;
      row['Gift Card'] = 'FALSE';
      row.Status = PRODUCT_STATUS_TO_SHOPIFY[product.status];
    }
    lines.push(csvRowToLine(row));
  });

  // The pool can hold more images than there are variant rows (e.g. a hero shot with no
  // colour, or extra angles) — carry the rest as trailing image-only rows.
  for (let i = rows.length; i < pool.length; i++) {
    const image = pool[i];
    lines.push(
      csvRowToLine({
        Handle: product.handle,
        'Image Src': toAbsoluteUrl(image.url),
        'Image Position': String(i + 1),
        'Image Alt Text': image.altText ?? '',
      })
    );
  }

  return lines.join('\r\n');
}

const PO_CSV_HEADERS = ['PO Number', 'Reference', 'Status', 'Delivery Date', 'PO Remark', 'Colour', 'Size', 'SKU', 'Quantity', 'Received Quantity', 'Unit Cost'];

/**
 * Round-trippable PO export — one row per line item. Re-importing this file (via the unified
 * Import button) updates the same POs by number, or creates new ones for an invented PO Number
 * label. There's no Shopify equivalent for purchase orders, so this format is our own.
 */
export function buildPoCsv(purchaseOrders: PurchaseOrderRecord[]): string {
  const lines = [PO_CSV_HEADERS.join(',')];
  for (const po of purchaseOrders) {
    for (const item of po.items) {
      lines.push(
        [
          formatPoNumber(po.number),
          po.referenceNumber ?? '',
          po.status,
          po.deliveryDate ? po.deliveryDate.slice(0, 10) : '',
          po.poRemark ?? '',
          item.colour ?? '',
          item.size ?? '',
          item.sku ?? '',
          String(item.quantity),
          String(item.receivedQuantity),
          item.unitCost !== null ? item.unitCost.toFixed(2) : '',
        ]
          .map(escapeCsv)
          .join(',')
      );
    }
  }
  return lines.join('\r\n');
}

// — Purchase order email —

export { formatPoNumber };

type PoEmailSource = {
  number: number;
  productTitle: string;
  supplierName: string;
  referenceNumber: string | null;
  deliveryDate: string | null;
  poRemark: string | null;
  shippingRemark: string | null;
  items: { quantity: number; variantTitle: string; sku: string | null; unitCost: number | null }[];
};

export function buildPoEmail(po: PoEmailSource): { subject: string; body: string } {
  const totalUnits = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = po.items.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
  const subject = `Purchase Order ${formatPoNumber(po.number)} — ${po.productTitle}`;
  const totalLine = `Total: ${totalUnits} units across ${po.items.length} variant${po.items.length === 1 ? '' : 's'} — ${formatCurrencyValue(grandTotal)}`;

  const headerLines = [`Hi ${po.supplierName},`, '', 'Please supply the following items for the product below.', '', `Product: ${po.productTitle}`];
  if (po.referenceNumber) headerLines.push(`Reference: ${po.referenceNumber}`);
  if (po.deliveryDate) headerLines.push(`Delivery required by: ${formatDate(po.deliveryDate)}`);

  const itemLines = po.items.map(
    (item) =>
      `- Qty: ${item.quantity} | Variant: ${item.variantTitle} | SKU: ${item.sku ?? '-'} | Cost: ${item.unitCost !== null ? formatMoney(item.unitCost) : '-'} | Total: ${
        item.unitCost !== null ? formatCurrencyValue(item.quantity * item.unitCost) : '-'
      }`
  );
  const footerLines = [
    ...(po.poRemark ? ['', `PO Remark: ${po.poRemark}`] : []),
    ...(po.shippingRemark ? ['', `Shipping remark: ${po.shippingRemark}`] : []),
    '',
    'Thanks',
  ];

  const body = [...headerLines, '', ...itemLines, '', totalLine, ...footerLines].join('\n');
  return { subject, body };
}

export function buildMailtoHref({ to, subject, body }: { to: string; subject: string; body: string }): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
