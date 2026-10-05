import type { StoreVariantTableRow } from './storeDiff';

export type DiffVariantField = 'sku' | 'barcode' | 'price' | 'stock' | 'image';

/** Edit-map key for one cell. The Image cell is stored under `storeImage` (a store MediaImage id),
 * deliberately separate from the legacy `image` key the full "Save variants" push reads as a hub
 * image id — the per-cell picker works on the store's own gallery. */
export function variantEditKey(rowKey: string, field: DiffVariantField): string {
  return `variant:${rowKey}:${field === 'image' ? 'storeImage' : field}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** What a cell currently shows: the admin's edit if any, otherwise the seed — the system value for
 * a hub-backed row, the store's own value for a Shopify-only (to-remove) row. Available seeds from
 * the store's live quantity, since that is the number a direct save would overwrite. */
export function variantFieldValue(
  edits: Record<string, string>,
  row: StoreVariantTableRow,
  field: DiffVariantField,
  stockDefault: number
): string {
  const edited = edits[variantEditKey(row.key, field)];
  if (edited !== undefined) return edited;
  const storeOnly = row.kind === 'extra-in-store';
  switch (field) {
    case 'sku':
      return storeOnly ? row.storeSku : row.systemSku;
    case 'barcode':
      return storeOnly ? row.storeBarcode : row.systemBarcode;
    case 'price':
      return (storeOnly ? (row.storePrice ?? 0) : row.systemPrice).toFixed(2);
    case 'stock':
      return String(row.storeQuantity ?? stockDefault);
    case 'image':
      return row.storeImageId ?? '';
  }
}

/** True when the cell holds something the live store variant doesn't — what shows the cell's Save
 * button. Always false for a row with no store variant yet (nothing to update; use Add instead). */
export function isVariantCellDirty(
  edits: Record<string, string>,
  row: StoreVariantTableRow,
  field: DiffVariantField,
  stockDefault: number
): boolean {
  if (!row.storeVariantId) return false;
  const value = variantFieldValue(edits, row, field, stockDefault);
  switch (field) {
    case 'sku':
      return value.trim() !== row.storeSku.trim();
    case 'barcode':
      return value.trim() !== row.storeBarcode.trim();
    case 'price': {
      const n = Number(value);
      return value.trim() !== '' && Number.isFinite(n) && round2(n) !== round2(row.storePrice ?? 0);
    }
    case 'stock': {
      const n = Number(value);
      return value.trim() !== '' && Number.isFinite(n) && Math.round(n) !== (row.storeQuantity ?? 0);
    }
    case 'image':
      return value !== (row.storeImageId ?? '');
  }
}

export const VARIANT_FIELDS: DiffVariantField[] = ['sku', 'barcode', 'stock', 'image', 'price'];

export function dirtyVariantFields(edits: Record<string, string>, row: StoreVariantTableRow, stockDefault: number): DiffVariantField[] {
  return VARIANT_FIELDS.filter((f) => isVariantCellDirty(edits, row, f, stockDefault));
}

/** Request body entry for `PATCH .../variants` carrying only `fields`. Throws nothing — an invalid
 * number is simply left out and rejected by the server's own validation if it slips through. */
export function buildVariantPatch(
  edits: Record<string, string>,
  row: StoreVariantTableRow,
  fields: DiffVariantField[],
  stockDefault: number
): Record<string, unknown> {
  const patch: Record<string, unknown> = { variantGid: row.storeVariantId, currentMediaId: row.storeImageId };
  for (const field of fields) {
    const value = variantFieldValue(edits, row, field, stockDefault);
    if (field === 'sku' || field === 'barcode') patch[field] = value.trim();
    else if (field === 'price') patch.price = Number(value);
    else if (field === 'stock') {
      patch.available = Number(value);
      patch.inventoryItemGid = row.storeInventoryItemId;
    } else patch.mediaId = value || null;
  }
  return patch;
}

/** Human label for a row, shared by confirm copy and aria-labels. */
export function variantRowLabel(row: StoreVariantTableRow): string {
  return [row.colour, row.size].filter(Boolean).join(' / ') || 'Default';
}
