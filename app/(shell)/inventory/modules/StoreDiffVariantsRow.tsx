'use client';

import { DIFF_TONE_CLASSES, type DiffTone } from './StoreDiffFieldRow';
import StoreDiffVariantCell, { CellSaveButton } from './StoreDiffVariantCell';
import StoreDiffVariantImagePicker from './StoreDiffVariantImagePicker';
import type { StoreVariantTableRow } from './storeDiff';
import type { StoreVariantActions } from './hooks/useStoreVariantActions';
import { Check, Plus, Trash } from './icons';
import { variantRowLabel, type DiffVariantField } from './storeVariantEdit';
import type { ProductImage, StoreListingImage } from './types';

type StoreDiffVariantsRowProps = {
  row: StoreVariantTableRow;
  systemImages: ProductImage[];
  storeImages: StoreListingImage[];
  stockDefault: number;
  actions: StoreVariantActions;
  savingKey: string | null;
};

const ROW_TONE: Record<StoreVariantTableRow['kind'], DiffTone | null> = {
  match: null,
  changed: 'pricing',
  'missing-in-store': 'add',
  'extra-in-store': 'extra',
};

const ROW_BADGE: Record<StoreVariantTableRow['kind'], string | null> = {
  match: null,
  changed: 'Update',
  'missing-in-store': 'Add',
  'extra-in-store': 'Remove',
};

function thumb(images: { id: string; url: string }[], position: number | null) {
  if (!position) return null;
  return images[position - 1] ?? null;
}

/** One row of the differences modal's variants table — every hub variant plus any Shopify-only
 * ("extra in store") variant, tinted by what a full "Save variants" push would do to it. Every
 * property is editable and saves on its own (its own check button appears once it differs from the
 * store); the Actions column saves the whole row, adds a variant the store lacks, or removes one. */
export default function StoreDiffVariantsRow({ row, systemImages, storeImages, stockDefault, actions, savingKey }: StoreDiffVariantsRowProps) {
  const t = ROW_TONE[row.kind] ? DIFF_TONE_CLASSES[ROW_TONE[row.kind]!] : null;
  const label = variantRowLabel(row);
  const onStore = row.storeVariantId !== null;
  const locked = savingKey !== null;
  const systemThumb = thumb(systemImages, row.systemImagePosition);
  const dirtyCount = actions.dirtyFields(row).length;
  const rowSaving = savingKey === `variant:${row.key}:row`;
  const cellSaving = (field: DiffVariantField) => savingKey === `variant:${row.key}:${field}`;

  const cell = (field: 'sku' | 'barcode' | 'price' | 'stock', storeValue: string, aria: string, extra?: Partial<React.ComponentProps<typeof StoreDiffVariantCell>>) => (
    <StoreDiffVariantCell
      value={actions.valueOf(row, field)}
      onChange={(v) => actions.setValue(row, field, v)}
      storeValue={storeValue}
      dirty={actions.isDirty(row, field)}
      saving={cellSaving(field)}
      locked={locked}
      onSave={() => actions.saveCell(row, field)}
      ariaLabel={`${aria} for ${label}`}
      readOnlySave={!onStore}
      {...extra}
    />
  );

  return (
    <tr className={`border-b border-inventory-divider last:border-0 ${t ? t.tint : ''}`}>
      <td className="px-2 py-1.5 align-top">
        <span className="text-[11px] font-medium text-inventory-text">{label}</span>
        {ROW_BADGE[row.kind] && t && (
          <span className={`ml-1.5 inline-flex items-center rounded-full border px-[5px] py-[1px] text-[8.5px] font-bold uppercase leading-none tracking-[0.3px] ${t.border} ${t.text}`}>
            {ROW_BADGE[row.kind]}
          </span>
        )}
      </td>
      {cell('sku', row.storeSku, 'SKU')}
      {cell('barcode', row.storeBarcode, 'Barcode')}
      {cell('stock', String(row.storeQuantity ?? ''), 'Available', {
        align: 'right',
        type: 'number',
        min: '0',
        step: '1',
        hint: row.hubVariantId ? { label: 'System', value: String(stockDefault) } : undefined,
      })}
      <td className="px-2 py-1.5 align-top">
        <div className="flex items-center gap-[4px]">
          {systemThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={systemThumb.url} alt="" title="System image" className="h-[20px] w-[20px] shrink-0 rounded-[3px] border border-inventory-border object-cover" />
          ) : (
            <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center text-[9px] text-inventory-text-subtle" title="System: none">—</span>
          )}
          <div className="w-[136px]">
            <StoreDiffVariantImagePicker
              variantLabel={label}
              images={storeImages}
              selectedImageId={actions.valueOf(row, 'image') || null}
              onChange={(imageId) => (row.hubVariantId ? actions.setColourImage(row.colour, imageId) : actions.setValue(row, 'image', imageId ?? ''))}
            />
          </div>
          {onStore && <CellSaveButton show={actions.isDirty(row, 'image')} saving={cellSaving('image')} disabled={locked} label={`Save image for ${label}`} onClick={() => actions.saveCell(row, 'image')} />}
        </div>
      </td>
      {cell('price', row.storePrice !== null ? row.storePrice.toFixed(2) : '', 'Price', { align: 'right', type: 'number', min: '0' })}
      <td className="px-2 py-1.5 align-top">
        <div className="flex items-center justify-end gap-[4px]">
          {onStore ? (
            <>
              <button
                type="button"
                onClick={() => actions.saveRow(row)}
                disabled={locked || dirtyCount === 0}
                aria-label={`Save ${label}`}
                title="Save"
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-inventory-primary text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:bg-inventory-border-strong disabled:text-inventory-text-subtle cursor-pointer"
              >
                {rowSaving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Check className="h-3 w-3" />}
              </button>
              <button
                type="button"
                onClick={() => actions.removeRow(row)}
                disabled={locked}
                aria-label={`Remove ${label} from the store`}
                title="Remove from the store"
                className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border border-inventory-danger/40 text-inventory-danger-hover transition-colors duration-150 hover:bg-inventory-danger/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Trash className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => actions.addRow(row)}
              disabled={locked}
              aria-label={`Add ${label} to the store`}
              title="Add to the store"
              className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-inventory-success text-white transition-colors duration-150 hover:bg-inventory-success-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {rowSaving ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Plus className="h-3 w-3" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
