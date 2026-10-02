'use client';

import StoreDiffVariantsRow from './StoreDiffVariantsRow';
import type { StoreVariantTableRow } from './storeDiff';
import type { StoreVariantActions } from './hooks/useStoreVariantActions';
import type { ProductImage, StoreListingImage } from './types';

type StoreDiffVariantsTableProps = {
  rows: StoreVariantTableRow[];
  systemImages: ProductImage[];
  storeImages: StoreListingImage[];
  /** hubVariantId -> Available default (the hub's full available quantity). */
  stockDefaults: Record<string, number>;
  actions: StoreVariantActions;
  savingKey: string | null;
  onSave: () => void;
  saving: boolean;
};

const TH_CLASS = 'px-2 py-1 text-left text-[9.5px] font-bold uppercase tracking-[0.3px] text-inventory-text-subtle';

/**
 * The differences modal's full variants table — every hub variant plus any Shopify-only variant,
 * shaped like the publish modal's own Variants / stock matrix. Each cell and each row saves
 * straight to the store (see StoreDiffVariantsRow); "Save variants to store" is the older
 * all-at-once push, which reconciles the whole list to match the system.
 */
export default function StoreDiffVariantsTable({ rows, systemImages, storeImages, stockDefaults, actions, savingKey, onSave, saving }: StoreDiffVariantsTableProps) {
  return (
    <div>
      <div className="mb-[6px] flex items-center justify-between">
        <h4 className="text-[9.5px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Variants</h4>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || savingKey !== null}
          className="flex h-[24px] items-center rounded-[6px] border border-inventory-primary/50 px-[10px] text-[10.5px] font-bold text-inventory-primary transition-colors duration-150 hover:bg-inventory-primary/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save variants to store'}
        </button>
      </div>
      <div className="overflow-x-auto thin-scroll rounded-[8px] border border-inventory-border">
        <table className="w-full min-w-[960px] text-[11px] leading-none">
          <thead>
            <tr className="border-b border-inventory-border bg-inventory-surface-muted">
              <th className={TH_CLASS}>Variant</th>
              <th className={TH_CLASS}>SKU</th>
              <th className={TH_CLASS}>Barcode</th>
              <th className={`${TH_CLASS} text-right`}>Available</th>
              <th className={TH_CLASS}>Image</th>
              <th className={`${TH_CLASS} text-right`}>Price (AUD)</th>
              <th className={`${TH_CLASS} text-right`}>Actions</th>
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
                actions={actions}
                savingKey={savingKey}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
