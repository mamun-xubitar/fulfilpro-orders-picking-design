'use client';

import { PanelHeading } from './MainImagePanel';
import { PRODUCT_STATUS_BADGES } from './constants';
import type { StoreListingsState } from './hooks/useStoreListings';
import { External, Refresh, Store } from './icons';
import type { StoreListingResult } from './types';
import { formatMoney } from './utils';

type OnlineStoresPanelProps = {
  storeListings: StoreListingsState;
  onEditPrice: (listing: StoreListingResult) => void;
  onAction: (action: string) => void;
};

export default function OnlineStoresPanel({ storeListings, onEditPrice, onAction }: OnlineStoresPanelProps) {
  const { listings, loading, syncing, sync } = storeListings;
  // Only show stores this product is actually listed on — a lookup failure still surfaces (it's
  // an unknown state, not "not listed"), but a clean `found: false` result is dropped rather than
  // rendered as a "Not listed" card for every connected store.
  const listed = listings.filter((listing) => listing.found || listing.error);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Store className="h-4 w-4" />} title="Online stores & prices" meta={`${listed.length}`} />

      <div className="flex-1 space-y-2 p-3">
        {loading ? (
          <StoreCardSkeletons />
        ) : listings.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-gray-400">No connected stores.</p>
        ) : listed.length === 0 ? (
          <p className="px-1 py-8 text-center text-xs text-gray-400">Not listed in any connected store.</p>
        ) : (
          listed.map((listing) => <StoreCard key={listing.storeId} listing={listing} onEditPrice={onEditPrice} onAction={onAction} />)
        )}
      </div>

      <div className="flex gap-2 border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={() => onAction('Manage store listings')}
          className="flex-1 rounded-lg bg-blue-600 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-blue-700 cursor-pointer"
        >
          Manage store listings
        </button>
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          aria-label="Sync store listings"
          title="Sync store listings"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Refresh className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </section>
  );
}

function priceLabel(listing: StoreListingResult): string {
  if (!listing.found || listing.variants.length === 0) return '—';
  const prices = listing.variants.map((v) => v.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`;
}

function StoreCard({
  listing,
  onEditPrice,
  onAction,
}: {
  listing: StoreListingResult;
  onEditPrice: (listing: StoreListingResult) => void;
  onAction: (action: string) => void;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-[13px] font-semibold text-gray-900">{listing.storeName}</h4>
          <p className="truncate text-[11px] text-gray-500">{listing.storeDomain}</p>
        </div>
        <span className="shrink-0 text-[13px] font-bold text-gray-900 tabular-nums">
          {listing.found && listing.variants.length > 0 ? `$${priceLabel(listing)}` : <span className="text-gray-400">—</span>}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {listing.error ? (
          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
            Lookup failed
          </span>
        ) : !listing.found ? (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Not listed
          </span>
        ) : (
          <>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                PRODUCT_STATUS_BADGES[listing.status ?? 'ARCHIVED'] ?? PRODUCT_STATUS_BADGES.ARCHIVED
              }`}
            >
              {listing.status}
            </span>
            {listing.externalId && <span className="truncate text-[10px] text-gray-400">ID {listing.externalId}</span>}
          </>
        )}
      </div>

      {listing.error && <p className="mt-1.5 text-[11px] text-red-600">{listing.error}</p>}

      <div className="mt-2.5 flex gap-1.5">
        <StoreButton disabled={!listing.found} onClick={() => onEditPrice(listing)}>
          Edit price
        </StoreButton>
        <StoreButton disabled={!listing.found} onClick={() => onAction(`Pushing the price to ${listing.storeName}`)}>
          Update
        </StoreButton>
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

function StoreButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-lg border border-gray-300 py-1 text-[11px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      {children}
    </button>
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
