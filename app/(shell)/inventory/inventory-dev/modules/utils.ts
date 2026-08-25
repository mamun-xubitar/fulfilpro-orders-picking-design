import { COLOUR_SWATCHES, FALLBACK_SWATCH, NEAR_TRIGGER_RATIO } from './constants';
import type {
  ColourOption,
  PricingComputed,
  PricingForm,
  PricingInputs,
  ProductImage,
  ProductRecord,
  StockSummary,
  VariantComputed,
  VariantRow,
  VariantStatus,
} from './types';

// — Stock maths —

export function getAvailable(v: VariantRow): number {
  return v.stockOnHand - v.allocated;
}

/** How many units to order to clear forward demand and land back on the trigger. */
export function getSuggested(v: VariantRow): number {
  return Math.max(0, v.trigger + v.forwardOrders - getAvailable(v) - v.incoming);
}

export function getStockValue(v: VariantRow): number {
  return v.stockOnHand * v.buyPrice;
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
    suggested: getSuggested(v),
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
      forwardOrders: acc.forwardOrders + v.forwardOrders,
      suggestedOrder: acc.suggestedOrder + getSuggested(v),
      stockValue: acc.stockValue + getStockValue(v),
      trigger: acc.trigger + v.trigger,
    }),
    { totalStock: 0, availableStock: 0, allocated: 0, incoming: 0, forwardOrders: 0, suggestedOrder: 0, stockValue: 0, trigger: 0 }
  );
}

// — Pricing maths —

/**
 * Mirrors `computePricing` in the existing product detail page: buying, freight
 * and misc are entered in the foreign currency and multiplied up by the rate,
 * margin is a mark-up on cost, and tax is a flat base-currency amount.
 */
export function computePricing(v: PricingInputs): PricingComputed {
  const totalBuying = (v.buyingPrice + v.freight + v.misc) * v.exchangeRate;
  const sellingPrice = totalBuying * (1 + v.marginPercent / 100);
  return { totalBuying, sellingPrice, sellingIncTax: sellingPrice + v.tax };
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
    exchangeRate: String(pricing.exchangeRate),
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

export function formatRelative(iso: string, now: number): string {
  const diffMinutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// — Colour / size helpers —

export function getSwatch(colour: string): string {
  return COLOUR_SWATCHES[colour.trim().toLowerCase()] ?? FALLBACK_SWATCH;
}

/** Resolves a colour name to the product's own hex, falling back to the shared swatch map. */
export function makeSwatchResolver(colours: ColourOption[]): (colour: string) => string {
  const map = new Map(colours.map((c) => [c.name.trim().toLowerCase(), c.hex]));
  return (colour: string) => map.get(colour.trim().toLowerCase()) ?? getSwatch(colour);
}

/** "50 52  54, 56" → ['50','52','54','56'] — splits on whitespace and commas. */
export function parseSizesInput(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((size) => size.trim())
    .filter(Boolean);
}

export function formatSizesInput(sizes: string[]): string {
  return sizes.join(' ');
}

/** Distinct colours in the order they first appear in the variant list. */
export function listColours(variants: VariantRow[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of variants) {
    const key = v.colour.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v.colour);
  }
  return out;
}

/**
 * Orders the thumb rail: one entry per colourway first (in variant order), then
 * everything not tied to a colour.
 */
export function orderImages(images: ProductImage[], colours: string[]): ProductImage[] {
  const rank = new Map(colours.map((c, i) => [c.toLowerCase(), i]));
  const coloured = images.filter((i) => i.colour !== null);
  const rest = images.filter((i) => i.colour === null);
  coloured.sort((a, b) => (rank.get(a.colour!.toLowerCase()) ?? 999) - (rank.get(b.colour!.toLowerCase()) ?? 999));
  return [...coloured, ...rest];
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
