'use client';

import { LISTING_STATUS_BADGES } from './constants';
import type { StoreListingResult } from './types';

type StoreConnectCardProps = {
  listing: StoreListingResult;
  onConnect: () => void;
};

/**
 * Item 3 — a connected store the product isn't listed on yet. Every connected store now shows up
 * in this panel (not just ones already listed), each with its own status; this is the "not
 * listed" state, with a Connect button that pre-selects the store and opens Publish.
 */
export default function StoreConnectCard({ listing, onConnect }: StoreConnectCardProps) {
  return (
    <article className="rounded-[8px] border border-dashed border-inventory-border-strong bg-inventory-surface-muted/40 p-[6px]">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <h4 className="truncate text-[10.5px] font-bold leading-tight text-inventory-text">{listing.storeName}</h4>
          <p className="truncate text-[9px] leading-tight text-inventory-text-subtle">{listing.storeDomain}</p>
        </span>
        <span
          className={`shrink-0 inline-flex items-center whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] ${
            listing.error ? LISTING_STATUS_BADGES.FAILED : LISTING_STATUS_BADGES.NOT_LISTED
          }`}
        >
          {listing.error ? 'Lookup failed' : 'Not listed'}
        </span>
      </div>
      {listing.error && <p className="mt-[6px] text-[10px] leading-tight text-inventory-danger">{listing.error}</p>}
      <button
        type="button"
        onClick={onConnect}
        className="mt-[6px] flex h-[22px] w-full items-center justify-center rounded-[6px] bg-inventory-primary text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer"
      >
        Connect
      </button>
    </article>
  );
}
