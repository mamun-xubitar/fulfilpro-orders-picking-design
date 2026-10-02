'use client';

import type { StoreVariantTableRow } from '../storeDiff';
import {
  buildVariantPatch,
  dirtyVariantFields,
  isVariantCellDirty,
  variantEditKey,
  variantFieldValue,
  variantRowLabel,
  type DiffVariantField,
} from '../storeVariantEdit';
import type { StoreActionConfirm } from './useStoreActionConfirm';
import type { StoreEditRunner } from './useStoreEditRunner';

type Args = {
  rows: StoreVariantTableRow[];
  edits: Record<string, string>;
  setEdit: (key: string, value: string) => void;
  stockDefaults: Record<string, number>;
  run: StoreEditRunner;
  confirm: StoreActionConfirm;
};

/** Per-cell and per-row direct saves for the differences modal's variants table. A cell's Save
 * pushes just that property; a row's Save pushes every dirty property of the row in one request;
 * Add creates a system variant the store lacks; Remove deletes one from the store. */
export function useStoreVariantActions({ rows, edits, setEdit, stockDefaults, run, confirm }: Args) {
  const stockOf = (row: StoreVariantTableRow) => stockDefaults[row.hubVariantId ?? ''] ?? 0;

  const valueOf = (row: StoreVariantTableRow, field: DiffVariantField) => variantFieldValue(edits, row, field, stockOf(row));
  const isDirty = (row: StoreVariantTableRow, field: DiffVariantField) => isVariantCellDirty(edits, row, field, stockOf(row));
  const dirtyFields = (row: StoreVariantTableRow) => dirtyVariantFields(edits, row, stockOf(row));
  const setValue = (row: StoreVariantTableRow, field: DiffVariantField, value: string) => setEdit(variantEditKey(row.key, field), value);

  /** Shopify-style: a variant image is chosen per colour, so picking one updates every hub-backed
   * row sharing the colour (mirrors the publish modal's setVariantImage). */
  const setColourImage = (colour: string, imageId: string | null) => {
    const key = colour.toLowerCase();
    for (const r of rows) {
      if (r.kind !== 'extra-in-store' && r.colour.toLowerCase() === key) setEdit(variantEditKey(r.key, 'image'), imageId ?? '');
    }
  };

  const save = (rowsToSave: { row: StoreVariantTableRow; fields: DiffVariantField[] }[], key: string, message: string) =>
    run(
      key,
      { path: 'variants', method: 'PATCH', json: { variants: rowsToSave.map(({ row, fields }) => buildVariantPatch(edits, row, fields, stockOf(row))) } },
      message
    );

  const saveCell = (row: StoreVariantTableRow, field: DiffVariantField) => {
    // An image save covers every same-colour row that's dirty on it — they were edited together.
    const targets =
      field === 'image'
        ? rows.filter((r) => r.storeVariantId && r.colour.toLowerCase() === row.colour.toLowerCase() && isVariantCellDirty(edits, r, 'image', stockOf(r)))
        : [row];
    return save(
      targets.map((r) => ({ row: r, fields: [field] })),
      `variant:${row.key}:${field}`,
      `${variantRowLabel(row)} — ${field === 'stock' ? 'available' : field} saved`
    );
  };

  const saveRow = (row: StoreVariantTableRow) => {
    const fields = dirtyFields(row);
    if (fields.length === 0) return Promise.resolve(false);
    return save([{ row, fields }], `variant:${row.key}:row`, `${variantRowLabel(row)} saved`);
  };

  const addRow = (row: StoreVariantTableRow) =>
    run(
      `variant:${row.key}:row`,
      {
        path: 'variants',
        method: 'POST',
        json: {
          hubVariantId: row.hubVariantId,
          sku: valueOf(row, 'sku'),
          barcode: valueOf(row, 'barcode'),
          price: Number(valueOf(row, 'price')),
          available: Number(valueOf(row, 'stock')),
          // Optional — whichever store image the admin picked for the new variant.
          mediaId: valueOf(row, 'image') || null,
        },
      },
      `${variantRowLabel(row)} added to the store`
    );

  const removeRow = (row: StoreVariantTableRow) => {
    if (!row.storeVariantId) return;
    confirm.ask({
      title: `Remove ${variantRowLabel(row)} from the store?`,
      body: row.kind === 'extra-in-store'
        ? "This variant isn't on the system product. It will be deleted from the store, along with its stock there."
        : `Deletes this variant from the store, along with its stock there. The system product keeps ${variantRowLabel(row)}.`,
      confirmLabel: 'Remove variant',
      tone: 'danger',
      run: () => run(`variant:${row.key}:row`, { path: 'variants', method: 'DELETE', json: { variantGids: [row.storeVariantId] } }, `${variantRowLabel(row)} removed from the store`),
    });
  };

  return { valueOf, isDirty, dirtyFields, setValue, setColourImage, saveCell, saveRow, addRow, removeRow };
}

export type StoreVariantActions = ReturnType<typeof useStoreVariantActions>;
