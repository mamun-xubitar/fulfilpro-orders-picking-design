'use client';

import { useMemo, useState } from 'react';
import { BTN_XS } from './MainImagePanel';
import StoreDiffModal from './StoreDiffModal';
import { LISTING_STATUS_BADGES } from './constants';
import type { StoreListingsState } from './hooks/useStoreListings';
import { computeStoreDiff } from './storeDiff';
import { External } from './icons';
import type { ProductRecord, StoreListingResult } from './types';
import { priceLabel } from './utils';

type StoreCardProps = {
  listing: StoreListingResult;
  selected: boolean;
  onToggle: () => void;
  product: ProductRecord;
  storeListings: StoreListingsState;
};

/** One connected-and-listed store (item 3/4) — split out of OnlineStoresPanel to stay within the
 * component size budget. The Differences badge (item 4) is computed client-side from data this
 * panel already has, so opening it costs nothing extra; the count is 0 when nothing disagrees. */
export default function StoreCard({ listing, selected, onToggle, product, storeListings }: StoreCardProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const diffCount = useMemo(() => computeStoreDiff(product, listing).total, [product, listing]);

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
        {listing.found && (
          <button
            type="button"
            onClick={() => setDiffOpen(true)}
            className={`relative flex-1 ${BTN_XS} ${diffCount > 0 ? 'border-inventory-warning/40 text-inventory-warning-ink' : ''}`}
          >
            Differences
            {diffCount > 0 && (
              <span className="ml-1 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-inventory-warning px-[3px] text-[8.5px] font-bold leading-none text-white">
                {diffCount}
              </span>
            )}
          </button>
        )}
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

      {diffOpen && <StoreDiffModal product={product} listing={listing} storeListings={storeListings} onClose={() => setDiffOpen(false)} />}
    </article>
  );
}
