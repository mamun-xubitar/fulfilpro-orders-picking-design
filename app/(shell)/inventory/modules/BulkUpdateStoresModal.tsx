'use client';

import { useEffect, useRef } from 'react';
import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import StoreBlockSeparator from './StoreBlockSeparator';
import StoreDraftBlock from './StoreDraftBlock';
import NoVariantsWarningBanner from './NoVariantsWarningBanner';
import type { ProductRecord, StoreListingResult } from './types';
import type { PublishAspect, StorePublishState } from './hooks/useStorePublish';

type BulkUpdateStoresModalProps = {
  product: ProductRecord;
  storeOptions: StoreListingResult[];
  publish: StorePublishState;
};

const ASPECT_OPTIONS: { id: PublishAspect; label: string; hint?: string }[] = [
  { id: 'images', label: 'Images' },
  { id: 'details', label: 'Product details', hint: 'title, vendor, type, category, collections, status, tags, SEO' },
  { id: 'pricing', label: 'Price & margin' },
  { id: 'variants', label: 'Variants', hint: 'SKU, barcode, available stock, include/exclude' },
];

/**
 * Checkbox-driven bulk update across every store checked on the Online stores & prices panel.
 * The left rail (mirroring the publish modal) picks/adjusts which stores are targeted; the top
 * bar picks which field groups to touch; the right column repeats one bordered block per
 * selected store, showing only those groups, so several stores read as clearly separate targets.
 */
export default function BulkUpdateStoresModal({ product, storeOptions, publish: p }: BulkUpdateStoresModalProps) {
  // Bulk update only ever targets the published product on Shopify — a store with nothing found
  // there has no live data to source from, so it's excluded here rather than in the shared hook.
  const publishableStores = storeOptions.filter((s) => s.found);
  const selectedStores = publishableStores.filter((s) => p.selectedStoreIds.has(s.storeId));
  const allChecked = p.bulkAspects.size === ASPECT_OPTIONS.length;
  // Only relevant while the Variants aspect is actually being pushed — see NoVariantsWarningBanner.
  const noVariantsStores = p.bulkAspects.has('variants') ? selectedStores.filter((s) => p.hasNoVariantsIncluded(s.storeId)) : [];

  const allSelected = publishableStores.length > 0 && publishableStores.every((s) => p.selectedStoreIds.has(s.storeId));
  const someSelected = p.selectedStoreIds.size > 0 && !allSelected;
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <ModalShell disableBackdropClose
      title={`Bulk update — ${selectedStores.length} store${selectedStores.length === 1 ? '' : 's'}`}
      compact
      onClose={p.closeBulkUpdate}
      fullScreen
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={p.closeBulkUpdate}
            className={MODAL_FOOTER_BTN_SECONDARY}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={p.bulkUpdateSelected}
            disabled={p.publishing || selectedStores.length === 0 || p.bulkAspects.size === 0 || noVariantsStores.length > 0}
            className={`ml-auto ${MODAL_FOOTER_BTN_PRIMARY}`}
          >
            {p.publishing ? 'Updating…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="mb-1 flex items-center gap-2">
            {publishableStores.length > 0 && (
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={() => p.toggleAllStores(publishableStores.map((s) => s.storeId))}
                aria-label="Select all published stores"
                title="Select all published stores"
                className="h-3 w-3 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            )}
            <p className="text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500">Published stores</p>
          </div>
          {publishableStores.length === 0 && (
            <p className="text-[11px] text-gray-400">No published stores yet — publish first before bulk-updating.</p>
          )}
          {publishableStores.map((store) => (
            <label key={store.storeId} className="flex cursor-pointer items-start gap-2 rounded-[6px] border-b border-gray-100 px-2 py-1 last:border-0 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={p.selectedStoreIds.has(store.storeId)}
                onChange={() => p.toggleStore(store.storeId)}
                className="mt-0.5 h-3 w-3 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium leading-tight text-gray-900">{store.storeName}</span>
                <span className="block truncate text-[10px] text-gray-400">{store.listingStatus.replace('_', ' ')}</span>
              </span>
            </label>
          ))}
        </aside>

        <div className="min-w-0 space-y-3">
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500">What to update</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {ASPECT_OPTIONS.map((a) => (
                <label
                  key={a.id}
                  title={a.hint}
                  className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={p.bulkAspects.has(a.id)}
                    onChange={() => p.toggleBulkAspect(a.id)}
                    className="h-3 w-3 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  {a.label}
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-1.5 border-l border-gray-300 pl-4 text-[12px] font-semibold text-gray-900">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={() => {
                    for (const a of ASPECT_OPTIONS) {
                      if (allChecked ? p.bulkAspects.has(a.id) : !p.bulkAspects.has(a.id)) p.toggleBulkAspect(a.id);
                    }
                  }}
                  className="h-3 w-3 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                All
              </label>
            </div>
          </section>

          <NoVariantsWarningBanner storeNames={noVariantsStores.map((s) => s.storeName)} />

          {selectedStores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-[11px] text-gray-400">No stores selected.</p>
          ) : (
            selectedStores.map((store, i) => (
              <div key={store.storeId} className="space-y-3">
                {i > 0 && <StoreBlockSeparator />}
                <StoreDraftBlock
                  storeId={store.storeId}
                  storeName={store.storeName}
                  storeDomain={store.storeDomain}
                  listingStatus={store.listingStatus}
                  index={i + 1}
                  total={selectedStores.length}
                  product={product}
                  draft={p.draftFor(store.storeId)}
                  onChange={(next) => p.setDraft(store.storeId, next)}
                  defaultStock={p.defaultStockFor(store.storeId)}
                  showImages={p.bulkAspects.has('images')}
                  showDetails={p.bulkAspects.has('details')}
                  showPricing={p.bulkAspects.has('pricing')}
                  showVariants={p.bulkAspects.has('variants')}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
}
