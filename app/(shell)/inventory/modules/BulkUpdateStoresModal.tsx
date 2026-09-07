'use client';

import { ModalShell } from '@/components/ModalShell';
import StoreDraftBlock from './StoreDraftBlock';
import type { ProductRecord, StoreListingResult } from './types';
import type { PublishAspect, StorePublishState } from './hooks/useStorePublish';

type BulkUpdateStoresModalProps = {
  product: ProductRecord;
  storeOptions: StoreListingResult[];
  publish: StorePublishState;
};

const ASPECT_OPTIONS: { id: PublishAspect; label: string }[] = [
  { id: 'images', label: 'Images' },
  { id: 'details', label: 'Product details' },
  { id: 'pricing', label: 'Price & margin' },
  { id: 'variants', label: 'Variants' },
];

/**
 * Checkbox-driven bulk update across every store checked on the Online stores & prices panel.
 * Step 1 (top bar) picks which field groups to touch; step 2 repeats one bordered block per
 * selected store, showing only those groups, so several stores read as clearly separate targets.
 */
export default function BulkUpdateStoresModal({ product, storeOptions, publish: p }: BulkUpdateStoresModalProps) {
  const selectedStores = storeOptions.filter((s) => p.selectedStoreIds.has(s.storeId));
  const allChecked = p.bulkAspects.size === ASPECT_OPTIONS.length;

  return (
    <ModalShell
      title={`Bulk update — ${p.selectedStoreIds.size} store${p.selectedStoreIds.size === 1 ? '' : 's'}`}
      onClose={p.closeBulkUpdate}
      fullScreen
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={p.closeBulkUpdate}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={p.bulkUpdateSelected}
            disabled={p.publishing || p.selectedStoreIds.size === 0 || p.bulkAspects.size === 0}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {p.publishing ? 'Updating…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">What to update</p>
          <div className="flex flex-wrap items-center gap-4">
            {ASPECT_OPTIONS.map((a) => (
              <label key={a.id} className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={p.bulkAspects.has(a.id)}
                  onChange={() => p.toggleBulkAspect(a.id)}
                  className="rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                {a.label}
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-1.5 border-l border-gray-300 pl-4 text-[13px] font-semibold text-gray-900">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => {
                  for (const a of ASPECT_OPTIONS) {
                    if (allChecked ? p.bulkAspects.has(a.id) : !p.bulkAspects.has(a.id)) p.toggleBulkAspect(a.id);
                  }
                }}
                className="rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              All
            </label>
          </div>
        </section>

        {selectedStores.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-[13px] text-gray-400">No stores selected.</p>
        ) : (
          selectedStores.map((store) => (
            <StoreDraftBlock
              key={store.storeId}
              storeName={store.storeName}
              storeDomain={store.storeDomain}
              product={product}
              draft={p.draftFor(store.storeId)}
              onChange={(next) => p.setDraft(store.storeId, next)}
              showDetails={p.bulkAspects.has('details')}
              showPricing={p.bulkAspects.has('pricing')}
              showVariants={p.bulkAspects.has('variants')}
            />
          ))
        )}
      </div>
    </ModalShell>
  );
}
