'use client';

import { useEffect, useRef } from 'react';
import { PanelHeading } from './MainImagePanel';
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
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading
        icon={<Store className="h-4 w-4" />}
        title="Online stores & prices"
        meta={`${listed.length}`}
        action={
          <button
            type="button"
            onClick={onOpenPublish}
            aria-label="Publish to a store"
            title="Publish to a store"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white transition-colors duration-150 hover:bg-blue-700 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        }
      />

      {listed.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-gray-600">
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              checked={allSelected}
              onChange={() => onToggleAll(listedIds)}
              aria-label="Select all stores"
              className="rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            Select all
          </label>
          {selectedListedCount > 0 && (
            <button
              type="button"
              onClick={onOpenBulkUpdate}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors duration-150 hover:bg-blue-700 cursor-pointer"
            >
              Bulk Update ({selectedListedCount})
            </button>
          )}
        </div>
      )}

      <div className="flex-1 space-y-2 p-3">
        {loading ? (
          <StoreCardSkeletons />
        ) : listings.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-gray-400">No connected stores.</p>
        ) : listed.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-gray-400">Not listed in any connected store.</p>
        ) : (
          listed.map((listing) => (
            <StoreCard key={listing.storeId} listing={listing} selected={selectedStoreIds.has(listing.storeId)} onToggle={() => onToggleStore(listing.storeId)} />
          ))
        )}
      </div>

      <div className="flex gap-2 border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          aria-label="Sync store listings"
          title="Sync store listings"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Refresh className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync listings'}
        </button>
      </div>
    </section>
  );
}

function StoreCard({ listing, selected, onToggle }: { listing: StoreListingResult; selected: boolean; onToggle: () => void }) {
  return (
    <article className={`rounded-xl border p-3 ${selected ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <label className="flex min-w-0 items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${listing.storeName}`}
            className="mt-0.5 shrink-0 rounded border-gray-300 text-blue-600 cursor-pointer"
          />
          <span className="min-w-0">
            <h4 className="truncate text-[13px] font-semibold text-gray-900">{listing.storeName}</h4>
            <p className="truncate text-[11px] text-gray-500">{listing.storeDomain}</p>
          </span>
        </label>
        <span className="shrink-0 text-[13px] font-bold text-gray-900 tabular-nums">
          {listing.found && listing.variants.length > 0 ? priceLabel(listing.variants) : <span className="text-gray-400">—</span>}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            LISTING_STATUS_BADGES[listing.listingStatus] ?? LISTING_STATUS_BADGES.NOT_LISTED
          }`}
        >
          {listing.listingStatus.replace('_', ' ')}
        </span>
        {!listing.found && !listing.error && listing.listingStatus === 'LISTED' && (
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            Missing on Shopify
          </span>
        )}
        {listing.error ? (
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
            Lookup failed
          </span>
        ) : (
          listing.found && listing.externalId && <span className="truncate text-[10px] text-gray-400">ID {listing.externalId}</span>
        )}
      </div>

      {(listing.error || listing.lastError) && <p className="mt-1.5 text-[11px] text-red-600">{listing.error ?? listing.lastError}</p>}
      {listing.found && listing.productTitle && (
        <p className="mt-1 truncate text-[11px] text-gray-500" title={listing.productTitle}>
          {listing.productTitle}
          {listing.status ? ` · ${listing.status}` : ''}
        </p>
      )}

      <div className="mt-2.5 flex gap-1.5">
        {listing.url ? (
          <a
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 py-1 text-[11px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Open
            <External className="h-3 w-3" />
          </a>
        ) : (
          <span className="flex flex-1 items-center justify-center rounded-lg border border-gray-200 py-1 text-[11px] font-semibold text-gray-300">
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
        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="h-3.5 w-2/3 rounded bg-gray-200" />
          <div className="mt-2 h-2.5 w-1/2 rounded bg-gray-200" />
          <div className="mt-3 h-6 w-full rounded bg-gray-200" />
        </div>
      ))}
    </>
  );
}
