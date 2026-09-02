import { deriveColorFromName, isValidCssColor, FALLBACK_SWATCH, parseColoursInput, formatColoursInput } from '@/lib/inventory/colour';
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

/** "Black / M", "Black" (colour-only), "M" (size-only), or "—" (neither axis) — a single
 * source of truth for labelling a variant, so a colour-only or size-only product never shows a
 * dangling "Black / " or " / M". */
export function variantTitle(v: { colour: string; size: string }): string {
  const parts = [v.colour, v.size].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : '—';
}

export function getAvailable(v: VariantRow): number {
  return v.stockOnHand - v.allocated;
}

export function getStockValue(v: VariantRow): number {
  return v.stockOnHand * v.sellPrice;
}

/** The four price-shortcut buttons, applied to a single variant. In single-product view this
 * runs entirely client-side against the already-loaded product — the server's `SupplierProductVariant`
 * query (`models/supplier-product.model.server.ts`) uses the identical four predicates for
 * All-records mode, where it decides which *products* to list rather than which rows to show. */
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

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** "10 (28 Aug 2026)", or "10 (Date not set)" when the PO has no delivery date yet. */
export function formatIncomingLot(lot: IncomingLot): string {
  const date = lot.date ? new Date(lot.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set';
  return `${formatNumber(lot.quantity)} (${date})`;
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

/** Returns the first value that appears more than once (case-insensitive), or null if none. */
export function findCaseInsensitiveDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    const lower = value.trim().toLowerCase();
    if (seen.has(lower)) return value.trim();
    seen.add(lower);
  }
  return null;
}

/** `product.category` stores the full Shopify taxonomy path ("Apparel & Accessories > … >
 * Visors") — this is the compact display form for space-constrained rows (the products table),
 * which show the leaf with the full path as a `title` tooltip instead. */
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

  const tiles: GalleryTile[] = [];
  for (const image of images) {
    const linked = variantsByImageId.get(image.id);
    if (!linked || linked.length === 0) continue;
    tiles.push({ kind: 'photo', key: image.id, image, label: linked.map(variantTitle).join(', '), variantIds: linked.map((v) => v.id) });
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

  for (const image of images) {
    const linked = variantsByImageId.get(image.id);
    if (linked && linked.length > 0) continue;
    tiles.push({ kind: 'photo', key: image.id, image, label: 'Unassigned', variantIds: [] });
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

const PRODUCT_STATUS_TO_SHOPIFY: Record<ProductRecord['status'], string> = { ACTIVE: 'active', DRAFT: 'draft', ARCHIVED: 'archived' };

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

const PO_CSV_HEADERS = ['PO Number', 'Status', 'Delivery Date', 'Remark', 'Colour', 'Size', 'SKU', 'Quantity', 'Received Quantity', 'Unit Cost'];

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
          po.status,
          po.deliveryDate ? po.deliveryDate.slice(0, 10) : '',
          po.remark ?? '',
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

export function formatPoNumber(number: number): string {
  return `PO-${String(number).padStart(5, '0')}`;
}

type PoEmailSource = {
  number: number;
  productTitle: string;
  supplierName: string;
  deliveryDate: string | null;
  remark: string | null;
  items: { quantity: number; variantTitle: string; sku: string | null }[];
};

export function buildPoEmail(po: PoEmailSource): { subject: string; body: string } {
  const totalUnits = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const subject = `Purchase Order ${formatPoNumber(po.number)} — ${po.productTitle}`;
  const totalLine = `Total: ${totalUnits} units across ${po.items.length} variant${po.items.length === 1 ? '' : 's'}`;

  const headerLines = [`Hi ${po.supplierName},`, '', 'Please supply the following items for the product below.', '', `Product: ${po.productTitle}`];
  if (po.deliveryDate) headerLines.push(`Delivery required by: ${formatDate(po.deliveryDate)}`);

  const itemLines = po.items.map((item) => `- Qty: ${item.quantity} | Variant: ${item.variantTitle} | SKU: ${item.sku ?? '-'}`);
  const footerLines = [...(po.remark ? ['', `Remark: ${po.remark}`] : []), '', 'Thanks'];

  const body = [...headerLines, '', ...itemLines, '', totalLine, ...footerLines].join('\n');
  return { subject, body };
}

export function buildMailtoHref({ to, subject, body }: { to: string; subject: string; body: string }): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// — Stocktake count sheet —

export function buildCountSheetDocument(product: ProductRecord, items: { colour: string; size: string; sku: string | null; expectedQty: number }[]): string {
  return `
  <!doctype html>
  <html>
    <head>
      <title>Count sheet — ${escapeHtml(product.name)}</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 24px; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 13px; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        p { margin: 0 0 16px; color: #555; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; }
        th { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #555; border-bottom: 2px solid #111; }
        @media print { @page { margin: 16mm; } }
      </style>
    </head>
    <body>
      <h1>Count sheet — ${escapeHtml(product.name)}</h1>
      <p>${escapeHtml(product.itemNo)} · ${items.length} lines</p>
      <table>
        <thead><tr><th>Colour</th><th>Size</th><th>SKU</th><th>Expected</th><th>Counted</th></tr></thead>
        <tbody>
          ${items.map((i) => `<tr><td>${escapeHtml(i.colour)}</td><td>${escapeHtml(i.size)}</td><td>${escapeHtml(i.sku ?? '-')}</td><td>${i.expectedQty}</td><td></td></tr>`).join('')}
        </tbody>
      </table>
    </body>
  </html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
