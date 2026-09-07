'use client';

import type { StoreListingResult } from './types';
import { priceLabel } from './utils';

type StorePriceChipsProps = {
  listings: StoreListingResult[];
  onEditPrice: (listing: StoreListingResult) => void;
};

/** One chip per store this product is listed on, under Tax — clicking a chip opens the existing
 * per-store price modal (StorePricesModal), the same one the Online stores & prices panel used
 * before its per-store Edit price button was replaced by this shortcut. */
export default function StorePriceChips({ listings, onEditPrice }: StorePriceChipsProps) {
  const listed = listings.filter((l) => l.found && l.variants.length > 0);
  if (listed.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {listed.map((l) => (
        <button
          key={l.storeId}
          type="button"
          onClick={() => onEditPrice(l)}
          className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-100 cursor-pointer"
        >
          <span className="max-w-20 truncate">{l.storeName}</span>
          <span className="tabular-nums text-gray-500">{priceLabel(l.variants)}</span>
        </button>
      ))}
    </div>
  );
}
