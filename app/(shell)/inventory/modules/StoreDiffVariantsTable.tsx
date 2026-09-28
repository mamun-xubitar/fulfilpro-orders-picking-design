'use client';

import StoreDiffVariantsRow from './StoreDiffVariantsRow';
import type { StoreVariantTableRow } from './storeDiff';
import type { ProductImage, StoreListingImage } from './types';

type StoreDiffVariantsTableProps = {
  rows: StoreVariantTableRow[];
  systemImages: ProductImage[];
  storeImages: StoreListingImage[];
  /** hubVariantId -> Available default (this store's live quantity, or a split of hub stock for a
   * not-yet-there variant) — same resolution the publish modal seeds its own input with. */
  stockDefaults: Record<string, number>;
  edits: Record<string, string>;
  setEdit: (key: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
};

const TH_CLASS = 'px-2 py-1 text-left text-[9.5px] font-bold uppercase tracking-[0.3px] text-inventory-text-subtle';

/**
 * The differences modal's full variants table (item 4) — every hub variant plus any
 * Shopify-only variant, shaped like the publish modal's own Variants / stock matrix so the two
 * read the same way, with each mismatched row tinted by the action a sync would take on it (see
 * StoreDiffVariantsRow). One "Save variants to store" button pushes every change at once — see
 * useStoreDiff's `saveVariants`, which reconciles the whole list rather than one row at a time.
 */
export default function StoreDiffVariantsTable({ rows, systemImages, storeImages, stockDefaults, edits, setEdit, onSave, saving }: StoreDiffVariantsTableProps) {
  // Shopify-style: an image is assigned per colour, not per variant — picking one for a row
  // applies to every row sharing its colour, mirroring the publish modal's own setVariantImage
  // (StoreDraftBlock.tsx).
  const handleImageChange = (colour: string, imageId: string | null) => {
    const colourKey = colour.toLowerCase();
    for (const r of rows) {
      if (r.hubVariantId && r.colour.toLowerCase() === colourKey) setEdit(`variant:${r.key}:image`, imageId ?? '');
    }
  };

  return (
    <div>
      <div className="mb-[6px] flex items-center justify-between">
        <h4 className="text-[9.5px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Variants</h4>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-[24px] items-center rounded-[6px] bg-inventory-primary px-[10px] text-[10.5px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save variants to store'}
        </button>
      </div>
      <div className="overflow-x-auto thin-scroll rounded-[8px] border border-inventory-border">
        <table className="w-full min-w-[640px] text-[11px] leading-none">
          <thead>
            <tr className="border-b border-inventory-border bg-inventory-surface-muted">
              <th className={TH_CLASS}>Variant</th>
              <th className={TH_CLASS}>SKU</th>
              <th className={TH_CLASS}>Barcode</th>
              <th className={`${TH_CLASS} text-right`}>Available</th>
              <th className={TH_CLASS}>Image</th>
              <th className={`${TH_CLASS} text-right`}>Price (AUD)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <StoreDiffVariantsRow
                key={row.key}
                row={row}
                systemImages={systemImages}
                storeImages={storeImages}
                stockDefault={stockDefaults[row.hubVariantId ?? ''] ?? 0}
                editValue={(field, fallback) => edits[`variant:${row.key}:${field}`] ?? fallback}
                onEditChange={(field, value) => setEdit(`variant:${row.key}:${field}`, value)}
                onImageChange={handleImageChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
