'use client';

import { useEffect, useRef } from 'react';
import { useInventoryAccess } from './InventoryAccess';
import { BTN_XS, BTN_ROW, PANEL_MAX_H, PanelHeading, panelBorderClass } from './MainImagePanel';
import StoreCard from './StoreCard';
import StoreConnectCard from './StoreConnectCard';
import type { StoreListingsState } from './hooks/useStoreListings';
import { Plus, Refresh, Store } from './icons';
import type { ProductRecord } from './types';

type OnlineStoresPanelProps = {
  storeListings: StoreListingsState;
  selectedStoreIds: Set<string>;
  onToggleStore: (storeId: string) => void;
  onToggleAll: (ids?: string[]) => void;
  onOpenPublish: () => void;
  onOpenBulkUpdate: () => void;
  /** Ticks the store then opens Publish with it pre-selected (item 3) — same flow as the header
   * "+" button, just pre-seeded with one store id. */
  onConnect: (storeId: string) => void;
  product: ProductRecord | null;
};

/** Item 3: every connected store now shows here, not only ones this product is already listed
 * on — an unlisted store gets a compact StoreConnectCard instead of the full StoreCard. Bulk
 * select/update still only concerns itself with listed stores, same as before. StoreCard itself
 * (with item 4's Differences badge) was split into its own file to stay within the size budget. */
export default function OnlineStoresPanel({
  storeListings,
  selectedStoreIds,
  onToggleStore,
  onToggleAll,
  onOpenPublish,
  onOpenBulkUpdate,
  onConnect,
  product,
}: OnlineStoresPanelProps) {
  const { listings, loading, syncing, sync } = storeListings;
  const { canEdit } = useInventoryAccess();
  const listed = listings.filter((l) => l.found);
  const unlisted = listings.filter((l) => !l.found);
  const listedIds = listed.map((l) => l.storeId);
  const selectedListedCount = listed.filter((l) => selectedStoreIds.has(l.storeId)).length;
  const allSelected = listed.length > 0 && selectedListedCount === listed.length;
  const someSelected = selectedListedCount > 0 && !allSelected;
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <section className={`flex min-w-0 flex-col rounded-[10px] border ${panelBorderClass('stores')} bg-inventory-surface shadow-inventory ${PANEL_MAX_H}`}>
      <PanelHeading
        tone="stores"
        icon={<Store className="h-3 w-3" />}
        title="Online stores"
        meta={`${listed.length}/${listings.length}`}
        action={
          canEdit ? (
            <button
              type="button"
              onClick={onOpenPublish}
              aria-label="Publish to a store"
              title="Publish to a store"
              className="flex h-[16px] w-[16px] items-center justify-center rounded-full bg-inventory-primary text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          ) : undefined
        }
      />

      {canEdit && listed.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-inventory-divider px-[8px] py-[3px]">
          <label className="flex cursor-pointer items-center gap-[5px] text-[10px] font-medium leading-none text-inventory-text-muted">
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleAll(listedIds)}
              aria-label="Select all stores"
              className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
            />
            Select all
          </label>
          {selectedListedCount > 0 && (
            <button
              type="button"
              onClick={onOpenBulkUpdate}
              className="rounded-md bg-inventory-primary px-1.5 py-[2px] text-[9.5px] font-semibold leading-none text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer"
            >
              Bulk Update ({selectedListedCount})
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-[6px] overflow-y-auto thin-scroll p-[6px]">
        {loading ? (
          <StoreCardSkeletons />
        ) : listings.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-inventory-text-subtle">No connected stores.</p>
        ) : (
          <>
            {listed.map((listing) =>
              product ? (
                <StoreCard
                  key={listing.storeId}
                  listing={listing}
                  selected={selectedStoreIds.has(listing.storeId)}
                  onToggle={() => onToggleStore(listing.storeId)}
                  product={product}
                  storeListings={storeListings}
                />
              ) : null
            )}
            {canEdit && unlisted.map((listing) => (
              <StoreConnectCard key={listing.storeId} listing={listing} onConnect={() => onConnect(listing.storeId)} />
            ))}
          </>
        )}
      </div>

      {canEdit && (
        <div className={BTN_ROW}>
          <button type="button" onClick={sync} disabled={syncing} aria-label="Sync store listings" title="Sync store listings" className={`flex-1 ${BTN_XS}`}>
            <Refresh className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync listings'}
          </button>
        </div>
      )}
    </section>
  );
}

function StoreCardSkeletons() {
  return (
    <>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted p-3">
          <div className="h-3.5 w-2/3 rounded bg-inventory-border" />
          <div className="mt-2 h-2.5 w-1/2 rounded bg-inventory-border" />
          <div className="mt-3 h-6 w-full rounded bg-inventory-border" />
        </div>
      ))}
    </>
  );
}
