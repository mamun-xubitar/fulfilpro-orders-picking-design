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
  StockSummary,
  VariantComputed,
  VariantRow,
  VariantStatus,
} from './types';

// — Stock maths —

export function getAvailable(v: VariantRow): number {
  return v.stockOnHand - v.allocated;
}

export function getStockValue(v: VariantRow): number {
  return v.stockOnHand * v.sellPrice;
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

/** One tile in the grouped gallery: a colourway's representative photo, or a colour-swatch stand-in when it has none. */
export type GalleryGroup =
  | { kind: 'photo'; key: string; colourName: string | null; color: string | null; image: ProductImage }
  | { kind: 'placeholder'; key: string; colourName: string; color: string; image: null };

/**
 * Groups a product's images into one gallery tile per colourway: a photo tile for colours
 * with at least one image (first by position), a placeholder swatch tile for colours with
 * none, and a trailing "Unassigned" tile if any image has no colour at all.
 */
export function groupImagesByColour(images: ProductImage[], colours: ColourOption[]): GalleryGroup[] {
  const swatchOf = makeSwatchResolver(colours);
  const byColour = new Map<string, ProductImage[]>();
  const unassigned: ProductImage[] = [];

  for (const image of images) {
    if (image.colour === null) {
      unassigned.push(image);
      continue;
    }
    const key = image.colour.trim().toLowerCase();
    const bucket = byColour.get(key) ?? [];
    bucket.push(image);
    byColour.set(key, bucket);
  }

  const seen = new Set<string>();
  const groups: GalleryGroup[] = [];

  for (const colour of colours) {
    const key = colour.name.trim().toLowerCase();
    seen.add(key);
    const bucket = byColour.get(key);
    groups.push(
      bucket && bucket.length > 0
        ? { kind: 'photo', key, colourName: colour.name, color: colour.color, image: bucket[0] }
        : { kind: 'placeholder', key, colourName: colour.name, color: colour.color, image: null }
    );
  }

  for (const image of images) {
    if (image.colour === null) continue;
    const key = image.colour.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push({ kind: 'photo', key, colourName: image.colour, color: swatchOf(image.colour), image });
  }

  if (unassigned.length > 0) {
    groups.push({ kind: 'photo', key: '__unassigned__', colourName: null, color: null, image: unassigned[0] });
  }

  return groups;
}

/**
 * Builds the full lightbox rail: every image individually (not deduped), plus a
 * placeholder swatch tile for each colour that has no images at all.
 */
export function buildLightboxItems(images: ProductImage[], colours: ColourOption[]): GalleryGroup[] {
  const swatchOf = makeSwatchResolver(colours);
  const byColour = new Map<string, ProductImage[]>();
  const unassigned: ProductImage[] = [];

  for (const image of images) {
    if (image.colour === null) {
      unassigned.push(image);
      continue;
    }
    const key = image.colour.trim().toLowerCase();
    const bucket = byColour.get(key) ?? [];
    bucket.push(image);
    byColour.set(key, bucket);
  }

  const seen = new Set<string>();
  const items: GalleryGroup[] = [];

  for (const colour of colours) {
    const key = colour.name.trim().toLowerCase();
    seen.add(key);
    const bucket = byColour.get(key);
    if (bucket && bucket.length > 0) {
      for (const image of bucket) items.push({ kind: 'photo', key: image.id, colourName: colour.name, color: colour.color, image });
    } else {
      items.push({ kind: 'placeholder', key: `placeholder:${key}`, colourName: colour.name, color: colour.color, image: null });
    }
  }

  for (const [key, bucket] of byColour) {
    if (seen.has(key)) continue;
    for (const image of bucket) items.push({ kind: 'photo', key: image.id, colourName: image.colour, color: swatchOf(image.colour!), image });
  }

  for (const image of unassigned) {
    items.push({ kind: 'photo', key: image.id, colourName: null, color: null, image });
  }

  return items;
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

const SHOPIFY_CSV_HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Variant Inventory Qty',
  'Cost per item',
  'Image Src',
  'Status',
];

const PRODUCT_STATUS_TO_SHOPIFY: Record<ProductRecord['status'], string> = { ACTIVE: 'active', DRAFT: 'draft', ARCHIVED: 'archived' };

/**
 * Best-effort Shopify product-CSV export — the columns Shopify's own product importer expects,
 * built from what the hub schema tracks today. Fields it doesn't track yet (Tags, weight) are left
 * blank/zero rather than guessed.
 */
export function buildShopifyProductCsv(product: ProductRecord, rows: VariantRow[]): string {
  const lines = [SHOPIFY_CSV_HEADERS.join(',')];
  const handle = product.itemNo;
  const imageByColour = new Map(product.images.filter((i) => i.colour).map((i) => [i.colour!.toLowerCase(), i.url]));
  const fallbackImage = product.images[0]?.url ?? '';

  rows.forEach((v, index) => {
    const image = imageByColour.get(v.colour.toLowerCase()) ?? fallbackImage;
    lines.push(
      [
        handle,
        index === 0 ? product.name : '',
        index === 0 ? product.description : '',
        product.brand,
        product.category,
        '',
        product.status === 'ACTIVE' ? 'TRUE' : 'FALSE',
        'Colour',
        v.colour,
        'Size',
        v.size,
        v.sku ?? '',
        '0',
        'shopify',
        'deny',
        'manual',
        v.sellPrice.toFixed(2),
        'TRUE',
        'TRUE',
        v.barcode ?? '',
        String(v.stockOnHand),
        v.buyPrice.toFixed(2),
        image,
        PRODUCT_STATUS_TO_SHOPIFY[product.status],
      ]
        .map(escapeCsv)
        .join(',')
    );
  });
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
