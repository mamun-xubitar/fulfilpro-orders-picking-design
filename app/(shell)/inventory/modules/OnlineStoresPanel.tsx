'use client';

import { useEffect, useRef } from 'react';
import { BTN_XS, BTN_ROW, PanelHeading, panelBorderClass } from './MainImagePanel';
import { LISTING_STATUS_BADGES } from './constants';
import type { StoreListingsState } from './hooks/useStoreListings';
import { External, Plus, Refresh, Store } from './icons';
import type { StoreListingResult } from './types';
import { priceLabel } from './utils';

type OnlineStoresPanelProps = {
  storeListings: StoreListingsState;
  selectedStoreIds: Set<string>;
  onToggleStore: (storeId: string) => void;
  onToggleAll: (ids?: string[]) => void;
  onOpenPublish: () => void;
  onOpenBulkUpdate: () => void;
};

export default function OnlineStoresPanel({
  storeListings,
  selectedStoreIds,
  onToggleStore,
  onToggleAll,
  onOpenPublish,
  onOpenBulkUpdate,
}: OnlineStoresPanelProps) {
  const { listings, loading, syncing, sync } = storeListings;
  // Only show a card for a store where this product's handle actually matches on Shopify (`found`)
  // — a store it isn't on yet doesn't belong in this "where it's currently listed" list. Publishing
  // to a brand-new store still goes through the separate "+" button/modal, which lists every
  // connected store regardless of match.
  const listed = listings.filter((l) => l.found);
  const listedIds = listed.map((l) => l.storeId);
  const selectedListedCount = listed.filter((l) => selectedStoreIds.has(l.storeId)).length;
  const allSelected = listed.length > 0 && selectedListedCount === listed.length;
  const someSelected = selectedListedCount > 0 && !allSelected;
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <section className={`flex min-w-0 flex-col rounded-[10px] border ${panelBorderClass('stores')} bg-inventory-surface shadow-inventory xl:min-h-0`}>
      <PanelHeading
        tone="stores"
        icon={<Store className="h-3 w-3" />}
        title="Online stores"
        meta={`${listed.length}`}
        action={
          <button
            type="button"
            onClick={onOpenPublish}
            aria-label="Publish to a store"
            title="Publish to a store"
            className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-inventory-primary text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        }
      />

      {listed.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-inventory-divider px-[8px] py-[4px]">
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
              className="rounded-md bg-inventory-primary px-1.5 py-[3px] text-[9.5px] font-semibold text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer"
            >
              Bulk Update ({selectedListedCount})
            </button>
          )}
        </div>
      )}

      <div className="max-h-80 space-y-[6px] overflow-y-auto p-[6px]">
        {loading ? (
          <StoreCardSkeletons />
        ) : listings.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-inventory-text-subtle">No connected stores.</p>
        ) : listed.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-inventory-text-subtle">Not listed in any connected store.</p>
        ) : (
          listed.map((listing) => (
            <StoreCard key={listing.storeId} listing={listing} selected={selectedStoreIds.has(listing.storeId)} onToggle={() => onToggleStore(listing.storeId)} />
          ))
        )}
      </div>

      <div className={BTN_ROW}>
        <button type="button" onClick={sync} disabled={syncing} aria-label="Sync store listings" title="Sync store listings" className={`flex-1 ${BTN_XS}`}>
          <Refresh className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync listings'}
        </button>
      </div>
    </section>
  );
}

function StoreCard({ listing, selected, onToggle }: { listing: StoreListingResult; selected: boolean; onToggle: () => void }) {
  return (
    <article className={`rounded-[8px] border p-[6px] ${selected ? 'border-inventory-secondary/35 bg-inventory-secondary/10/40' : 'border-inventory-border bg-inventory-surface'}`}>
      <div className="flex items-start justify-between gap-2">
        <label className="flex min-w-0 items-start gap-[5px]">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${listing.storeName}`}
            className="mt-[2px] h-3 w-3 shrink-0 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
          />
          <span className="min-w-0">
            <h4 className="truncate text-[10.5px] font-bold leading-tight text-inventory-text">{listing.storeName}</h4>
            <p className="truncate text-[9px] leading-tight text-inventory-text-subtle">{listing.storeDomain}</p>
          </span>
        </label>
        <span className="shrink-0 text-[11.5px] font-bold leading-none text-inventory-text tabular-nums">
          {listing.found && listing.variants.length > 0 ? priceLabel(listing.variants) : <span className="text-inventory-text-subtle">—</span>}
        </span>
      </div>

      <div className="mt-[6px] flex flex-wrap items-center gap-[6px]">
        <span
          className={`inline-flex items-center whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] ${
            LISTING_STATUS_BADGES[listing.listingStatus] ?? LISTING_STATUS_BADGES.NOT_LISTED
          }`}
        >
          {listing.listingStatus.replace('_', ' ')}
        </span>
        {!listing.found && !listing.error && listing.listingStatus === 'LISTED' && (
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-inventory-warning/30 bg-inventory-warning/10 px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-warning-ink">
            Missing on Shopify
          </span>
        )}
        {listing.error ? (
          <span className="inline-flex items-center whitespace-nowrap rounded-full border border-inventory-danger/30 bg-inventory-danger/10 px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-danger-hover">
            Lookup failed
          </span>
        ) : (
          listing.found && listing.externalId && <span className="truncate text-[9px] leading-none text-inventory-text-subtle">ID {listing.externalId}</span>
        )}
      </div>

      {(listing.error || listing.lastError) && <p className="mt-[6px] text-[10px] leading-tight text-inventory-danger">{listing.error ?? listing.lastError}</p>}
      {listing.found && listing.productTitle && (
        <p className="mt-[4px] truncate text-[10px] leading-tight text-inventory-text-subtle" title={listing.productTitle}>
          {listing.productTitle}
          {listing.status ? ` · ${listing.status}` : ''}
        </p>
      )}

      <div className="mt-[6px] flex gap-[6px]">
        {listing.url ? (
          <a href={listing.url} target="_blank" rel="noopener noreferrer" className={`flex-1 ${BTN_XS}`}>
            Open
            <External className="h-3 w-3" />
          </a>
        ) : (
          <span className="flex h-[22px] flex-1 items-center justify-center rounded-[6px] border border-inventory-border text-[10px] font-bold leading-none text-inventory-border-strong">
            Open
          </span>
        )}
      </div>
    </article>
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
