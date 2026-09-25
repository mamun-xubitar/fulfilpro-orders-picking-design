'use client';

import { DIFF_TONE_CLASSES, type DiffTone } from './StoreDiffFieldRow';
import StoreDraftVariantImage from './StoreDraftVariantImage';
import type { StoreVariantTableRow } from './storeDiff';
import type { ProductImage, StoreListingImage } from './types';

type DiffVariantField = 'sku' | 'barcode' | 'price' | 'stock' | 'image';

type StoreDiffVariantsRowProps = {
  row: StoreVariantTableRow;
  systemImages: ProductImage[];
  storeImages: StoreListingImage[];
  /** This row's Available default (this store's live quantity, or a split of hub stock for a
   * not-yet-there variant) — the input's starting value until the admin types over it. */
  stockDefault: number;
  editValue: (field: DiffVariantField, fallback: string) => string;
  onEditChange: (field: DiffVariantField, value: string) => void;
  /** Picking an image is Shopify-style — applies to every row that shares this row's colour, not
   * just this one, mirroring the publish modal's own `setVariantImage`. Routed separately from
   * `onEditChange` since it fans out across rows instead of writing a single row's edit. */
  onImageChange: (colour: string, imageId: string | null) => void;
};

const ROW_TONE: Record<StoreVariantTableRow['kind'], DiffTone | null> = {
  match: null,
  changed: 'pricing',
  'missing-in-store': 'add',
  'extra-in-store': 'extra',
};

const ROW_INPUT_CLASS =
  'h-[22px] w-full rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

function thumb(images: { id: string; url: string }[], position: number | null) {
  if (!position) return null;
  return images[position - 1] ?? null;
}

/** One row of the differences modal's variants table (item 4) — every hub variant plus any
 * Shopify-only ("extra in store") variant, tinted by the action a "Save variants" push would take
 * on it: added (missing in store), removed (extra in store), updated (a field disagrees), or left
 * alone (already matching). SKU/barcode/price are editable for hub-backed rows; a mismatched
 * field shows the store's current value struck through underneath. */
export default function StoreDiffVariantsRow({ row, systemImages, storeImages, stockDefault, editValue, onEditChange, onImageChange }: StoreDiffVariantsRowProps) {
  const tone = ROW_TONE[row.kind];
  const t = tone ? DIFF_TONE_CLASSES[tone] : null;
  const editable = row.kind !== 'extra-in-store';
  const variantLabel = [row.colour, row.size].filter(Boolean).join(' / ') || 'Default';
  const systemThumb = thumb(systemImages, row.systemImagePosition);
  const storeThumb = thumb(storeImages, row.storeImagePosition);

  return (
    <tr className={`border-b border-inventory-divider last:border-0 ${t ? `${t.tint}` : ''}`}>
      <td className="px-2 py-1.5 align-top">
        <span className="text-[11px] font-medium text-inventory-text">{variantLabel}</span>
        {row.kind !== 'match' && t && (
          <span className={`ml-1.5 inline-flex items-center rounded-full border px-[5px] py-[1px] text-[8.5px] font-bold uppercase leading-none tracking-[0.3px] ${t.border} ${t.text}`}>
            {row.kind === 'missing-in-store' ? 'Add' : row.kind === 'extra-in-store' ? 'Remove' : 'Update'}
          </span>
        )}
      </td>
      <DiffCell
        editable={editable}
        mismatched={row.mismatchedFields.has('sku')}
        storeValue={row.storeSku}
        value={editValue('sku', row.systemSku)}
        onChange={(v) => onEditChange('sku', v)}
      />
      <DiffCell
        editable={editable}
        mismatched={row.mismatchedFields.has('barcode')}
        storeValue={row.storeBarcode}
        value={editValue('barcode', row.systemBarcode)}
        onChange={(v) => onEditChange('barcode', v)}
      />
      <td className="px-2 py-1.5 text-right align-top">
        {editable ? (
          <input
            type="number"
            step="1"
            min="0"
            value={editValue('stock', String(stockDefault))}
            onChange={(e) => onEditChange('stock', e.target.value)}
            aria-label={`Available for ${variantLabel}`}
            className={`${ROW_INPUT_CLASS} text-right tabular-nums`}
          />
        ) : (
          <span className="text-[11px] tabular-nums text-inventory-text-subtle">{row.storeQuantity ?? '—'}</span>
        )}
      </td>
      <td className="px-2 py-1.5 align-top">
        {editable ? (
          <div className="flex items-center gap-[4px]">
            <ImageThumb image={storeThumb} title="Store" />
            <div className="w-[140px]">
              <StoreDraftVariantImage
                variantLabel={variantLabel}
                storeName="the hub gallery"
                images={systemImages}
                selectedImageId={editValue('image', row.systemImageId ?? '') || null}
                onChange={(imageId) => onImageChange(row.colour, imageId)}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-[4px]">
            <ImageThumb image={storeThumb} title="Store" />
            <ImageThumb image={systemThumb} title="System" />
          </div>
        )}
      </td>
      {editable ? (
        <DiffCell
          align="right"
          editable
          mismatched={row.mismatchedFields.has('price')}
          storeValue={row.storePrice !== null ? row.storePrice.toFixed(2) : ''}
          value={editValue('price', row.systemPrice.toFixed(2))}
          onChange={(v) => onEditChange('price', v)}
          type="number"
        />
      ) : (
        <td className="px-2 py-1.5 text-right align-top text-[11px] tabular-nums text-inventory-text-subtle">
          {row.storePrice !== null ? row.storePrice.toFixed(2) : '—'}
        </td>
      )}
    </tr>
  );
}

function DiffCell({
  editable,
  mismatched,
  storeValue,
  value,
  onChange,
  align = 'left',
  type = 'text',
}: {
  editable: boolean;
  mismatched: boolean;
  storeValue: string;
  value: string;
  onChange: (value: string) => void;
  align?: 'left' | 'right';
  type?: 'text' | 'number';
}) {
  return (
    <td className={`px-2 py-1.5 align-top ${align === 'right' ? 'text-right' : ''}`}>
      {editable ? (
        <input
          type={type}
          step={type === 'number' ? '0.01' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${ROW_INPUT_CLASS} ${align === 'right' ? 'text-right tabular-nums' : ''}`}
        />
      ) : (
        <span className="text-[11px] text-inventory-text-subtle">{storeValue || '—'}</span>
      )}
      {editable && mismatched && (
        <div className="mt-[2px] truncate text-[9.5px] leading-none text-inventory-text-subtle line-through decoration-inventory-text-subtle/60">
          {storeValue || '(empty)'}
        </div>
      )}
    </td>
  );
}

function ImageThumb({ image, title }: { image: { url: string } | null; title: string }) {
  if (!image) return <span className="text-[9px] text-inventory-text-subtle" title={`${title}: none`}>—</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.url} alt="" title={title} className="h-[20px] w-[20px] rounded-[3px] border border-inventory-border object-cover" />;
}
