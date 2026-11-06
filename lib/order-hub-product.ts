import type { Prisma } from '@prisma/client';
import { slugifyHandle } from '@/lib/inventory/handle';

export type StoreOption = { name: string; value: string };
export type SourceVariant = { shopifyVariantId: string | null; inventoryItemId: string | null; sku: string | null; colour: string; size: string; price: number; cost: number | null; barcode: string | null; imageUrl: string | null };

export const gid = (kind: string, id: string) => `gid://shopify/${kind}/${id.split('/').pop()}`;
const pickOption = (options: StoreOption[], pattern: RegExp) => options.find((o) => pattern.test(o.name) && o.value !== 'Default Title')?.value.trim() ?? '';

export function readOptions(value: unknown): StoreOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((o) => (o && typeof o === 'object' && typeof (o as StoreOption).name === 'string' ? [{ name: (o as StoreOption).name, value: String((o as StoreOption).value ?? '') }] : []));
}

/** Hub variants (colour / size) for each store variant, or one variant from the line itself when the store product is not synced. */
export function buildSourceVariants(
  storeVariants: Array<{ shopifyId: string; title: string | null; sku: string | null; price: Prisma.Decimal; cost: Prisma.Decimal | null; inventoryItemId: string | null; imageUrl: string | null; optionValues: Prisma.JsonValue | null }>,
  line: { variantId: string | null; sku: string; lineOptions: StoreOption[] },
): SourceVariant[] {
  const raw: SourceVariant[] = storeVariants.length > 0
    ? storeVariants.map((v) => {
        const options = readOptions(v.optionValues);
        const colour = pickOption(options, /^colou?r$/i);
        let size = pickOption(options, /^size$/i);
        if (!colour && !size && storeVariants.length > 1) size = v.title && v.title !== 'Default Title' ? v.title : '';
        return { shopifyVariantId: v.shopifyId, inventoryItemId: v.inventoryItemId, sku: v.sku?.trim() || null, colour, size, price: Number(v.price), cost: v.cost == null ? null : Number(v.cost), barcode: null, imageUrl: v.imageUrl };
      })
    : [{ shopifyVariantId: line.variantId, inventoryItemId: null, sku: line.sku || null, colour: pickOption(line.lineOptions, /^colou?r$/i), size: pickOption(line.lineOptions, /^size$/i), price: 0, cost: null, barcode: null, imageUrl: null }];
  // (supplierProductId, colour, size) is unique: keep clashing variants apart.
  const seen = new Set<string>();
  return raw.map((v, i) => {
    let size = v.size;
    while (seen.has(`${v.colour}|${size}`)) size = `${v.size || 'Option'} ${i + 1}`;
    seen.add(`${v.colour}|${size}`);
    return { ...v, size };
  });
}

/** Hub handle for a store product: its own Shopify handle, else the product name. */
export const hubHandleFor = (storeHandle: string | null | undefined, name: string) => slugifyHandle(storeHandle || name) || 'product';

/** Shopify CDN URLs differ only by their `?v=` cache-buster between product media and variant images. */
export const imageKey = (url: string) => url.split('?')[0];

/** Every image of a store product (its media, then variant images not among them), de-duplicated. */
export function storeProductImages(images: Prisma.JsonValue | null, variants: Array<{ imageUrl: string | null }>) {
  const media = (Array.isArray(images) ? images : []).flatMap((i) => {
    const image = i && typeof i === 'object' ? (i as { url?: unknown; altText?: unknown }) : {};
    return typeof image.url === 'string' && image.url ? [{ url: image.url, altText: typeof image.altText === 'string' ? image.altText : null }] : [];
  });
  const seen = new Set<string>();
  return [...media, ...variants.flatMap((v) => (v.imageUrl ? [{ url: v.imageUrl, altText: null }] : []))].filter((i) => {
    const key = imageKey(i.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
