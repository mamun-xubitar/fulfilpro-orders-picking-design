import { COLOR_OPTION_NAMES, LOW_STOCK_THRESHOLD, OUT_OF_STOCK_THRESHOLD, SIZE_OPTION_NAMES } from './constants';
import type { ColorGroup, GalleryEntry, ProductDetail, PurchaseOrderItemRow, PurchaseOrderRow, PurchaseOrderStatus, SizeCount, VariantDetail } from './types';

export function getVariantColor(variant: VariantDetail): string {
  const named = variant.optionValues.find((o) => COLOR_OPTION_NAMES.includes(o.name.trim().toLowerCase()));
  if (named) return named.value;
  return variant.optionValues[0]?.value ?? 'Default';
}

export function getVariantSize(variant: VariantDetail): string {
  const named = variant.optionValues.find((o) => SIZE_OPTION_NAMES.includes(o.name.trim().toLowerCase()));
  if (named) return named.value;
  return variant.optionValues[1]?.value ?? '';
}

export function groupVariantsByColor(variants: VariantDetail[]): ColorGroup[] {
  const groups = new Map<string, ColorGroup>();

  for (const variant of variants) {
    const label = getVariantColor(variant);
    const key = label.toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.variantIds.push(variant.id);
      existing.totalStock += variant.inventoryQuantity;
      existing.totalSold += variant.soldQuantity;
      existing.allContinueSelling = existing.allContinueSelling && variant.inventoryPolicy === 'CONTINUE';
      if (!existing.imageUrl && variant.imageUrl) existing.imageUrl = variant.imageUrl;
    } else {
      groups.set(key, {
        key,
        label,
        variantIds: [variant.id],
        totalStock: variant.inventoryQuantity,
        totalSold: variant.soldQuantity,
        allContinueSelling: variant.inventoryPolicy === 'CONTINUE',
        imageUrl: variant.imageUrl,
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function getStockCellClass(variant: VariantDetail): string {
  if (variant.inventoryPolicy === 'CONTINUE') return '';
  if (variant.inventoryQuantity < OUT_OF_STOCK_THRESHOLD) return 'bg-red-100';
  if (variant.inventoryQuantity < LOW_STOCK_THRESHOLD) return 'bg-red-50';
  return '';
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function computeMargin(price: number, cost: number | null): number | null {
  if (cost == null || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

export function normalizeImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return (parsed.origin + parsed.pathname).toLowerCase();
  } catch {
    return url;
  }
}

export function buildGalleryEntries(product: ProductDetail): GalleryEntry[] {
  const entries: GalleryEntry[] = [];
  const claimed = new Set<string>();

  for (const group of groupVariantsByColor(product.variants)) {
    const variantsInGroup = product.variants
      .filter((v) => group.variantIds.includes(v.id))
      .sort((a, b) => a.position - b.position);
    const withImage = variantsInGroup.find((v) => v.imageUrl);
    if (!withImage?.imageUrl) continue;

    claimed.add(normalizeImageUrl(withImage.imageUrl));
    entries.push({
      key: `color:${group.key}`,
      url: withImage.imageUrl,
      altText: null,
      kind: 'color',
      colorKey: group.key,
      label: group.label,
    });
  }

  if (product.imageUrl) {
    const normalized = normalizeImageUrl(product.imageUrl);
    if (!claimed.has(normalized)) {
      claimed.add(normalized);
      entries.push({ key: 'hero:0', url: product.imageUrl, altText: null, kind: 'hero', colorKey: null, label: '' });
    }
  }

  for (const image of product.images) {
    const normalized = normalizeImageUrl(image.url);
    if (claimed.has(normalized)) continue;
    claimed.add(normalized);
    entries.push({ key: `other:${image.id}`, url: image.url, altText: image.altText, kind: 'other', colorKey: null, label: '' });
  }

  return entries;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSizeBreakdown(variants: VariantDetail[], colorKey: string | null): SizeCount[] {
  const filtered = colorKey ? variants.filter((v) => getVariantColor(v).toLowerCase() === colorKey) : variants;
  const bySize = new Map<string, { quantity: number; minPosition: number }>();

  for (const variant of filtered) {
    const size = getVariantSize(variant);
    if (!size) continue;
    const existing = bySize.get(size);
    if (existing) {
      existing.quantity += variant.inventoryQuantity;
      existing.minPosition = Math.min(existing.minPosition, variant.position);
    } else {
      bySize.set(size, { quantity: variant.inventoryQuantity, minPosition: variant.position });
    }
  }

  return [...bySize.entries()]
    .sort((a, b) => a[1].minPosition - b[1].minPosition)
    .map(([size, { quantity }]) => ({ size, quantity }));
}

export function formatPoNumber(number: number): string {
  return `PO-${String(number).padStart(5, '0')}`;
}

export function getPoStatusChipClass(status: PurchaseOrderStatus): string {
  switch (status) {
    case 'RECEIVED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'PARTIALLY_RECEIVED':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'CONFIRMED':
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    case 'CANCELLED':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'DRAFT':
      return 'bg-gray-100 text-gray-600 border border-gray-200';
    default:
      return 'bg-amber-50 text-amber-800 border border-amber-200';
  }
}

function formatPoDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

type PoEmailSource = {
  number: number;
  productTitle: string;
  supplierName: string;
  deliveryDate: string | null;
  remark: string | null;
  items: PurchaseOrderItemRow[];
};

export function buildPoEmail({
  po,
  storeName,
  onlineStoreUrl,
}: {
  po: PoEmailSource;
  storeName: string;
  onlineStoreUrl: string | null;
}): { subject: string; body: string } {
  const totalUnits = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const subject = `Purchase Order ${formatPoNumber(po.number)} — ${po.productTitle}`;
  const totalLine = `Total: ${totalUnits} units across ${po.items.length} variant${po.items.length === 1 ? '' : 's'}`;

  const headerLines = [
    `Hi ${po.supplierName},`,
    '',
    'Please supply the following items for the product below.',
    '',
    `Product: ${po.productTitle}${onlineStoreUrl ? ` (${onlineStoreUrl})` : ''}`,
    ...(po.deliveryDate ? [`Delivery required by: ${formatPoDate(po.deliveryDate)}`] : []),
  ];

  const itemLines = po.items.map((item) => `- Qty: ${item.quantity} | Variant: ${item.variantTitle} | SKU: ${item.sku ?? '-'}`);

  const footerLines = [...(po.remark ? ['', `Remark: ${po.remark}`] : []), '', 'Thanks,', storeName];

  const body = [...headerLines, '', ...itemLines, '', totalLine, ...footerLines].join('\n');

  return { subject, body };
}

export function buildMailtoHref({ to, subject, body }: { to: string; subject: string; body: string }): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function getItemRemaining(item: PurchaseOrderItemRow): number {
  return Math.max(0, item.quantity - item.receivedQuantity);
}

export function hasOutstandingItems(po: PurchaseOrderRow): boolean {
  return po.items.some((item) => item.receivedQuantity < item.quantity);
}

export function getPoUnits(po: PurchaseOrderRow): { ordered: number; received: number } {
  return po.items.reduce(
    (acc, item) => ({ ordered: acc.ordered + item.quantity, received: acc.received + item.receivedQuantity }),
    { ordered: 0, received: 0 }
  );
}

export function getPoOverdueDays(po: PurchaseOrderRow): number | null {
  if (!po.deliveryDate) return null;
  if (po.status === 'RECEIVED' || po.status === 'CANCELLED') return null;

  const deliveryDate = new Date(po.deliveryDate);
  const now = new Date();
  const diffMs = now.getTime() - deliveryDate.getTime();
  if (diffMs <= 0) return null;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function splitQuantityAcrossLocations(quantity: number, locationIds: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  if (locationIds.length === 0) return result;

  const base = Math.floor(quantity / locationIds.length);
  let remainder = quantity - base * locationIds.length;

  for (const locationId of locationIds) {
    result[locationId] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }
  return result;
}
