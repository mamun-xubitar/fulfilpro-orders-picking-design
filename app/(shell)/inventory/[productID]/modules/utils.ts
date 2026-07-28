import { COLOR_OPTION_NAMES, LOW_STOCK_THRESHOLD, OUT_OF_STOCK_THRESHOLD, SIZE_OPTION_NAMES } from './constants';
import type { ColorGroup, GalleryEntry, ProductDetail, SizeCount, VariantDetail } from './types';

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
