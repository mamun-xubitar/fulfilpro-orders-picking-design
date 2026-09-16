'use client';

import { storePriceFromMargin } from '@/lib/inventory/store-price';
import { isPublished } from './storeDraft';
import { formatCurrencyValue, marginForStore, pricingFormToInputs } from './utils';
import type { PricingForm, StoreListingResult } from './types';

type StoreMarginPriceChipsProps = {
  listings: StoreListingResult[];
  /** The panel's live pricing draft — an unsaved cost/margin/tax edit is reflected immediately,
   * consistent with the panel's own "Sell price (inc tax)" figure. */
  form: PricingForm;
  /** The panel's staged per-store margin edits, already merged over each store's live margin —
   * see useProductPricing.marginDraft. */
  marginDraft: Record<string, number | null>;
  onEditPrice: (listing: StoreListingResult) => void;
  onUnpublished: (storeName: string) => void;
};

/**
 * One badge per store with a per-store margin set, showing the price that margin produces from
 * the hub's current landed cost and tax — via the same storePriceFromMargin formula the publish
 * draft and the server-side reprice both use (lib/inventory/store-price.ts), so this can never
 * drift from what Save actually applies to that store. Clicking a published store opens the
 * existing StorePricesModal; an unpublished one just explains why via toast instead of opening a
 * modal with nothing to edit. Replaces StorePriceChips (parked in PricingMarginPanel), which
 * showed each store's *live* Shopify price rather than what its own margin computes.
 */
export default function StoreMarginPriceChips({ listings, form, marginDraft, onEditPrice, onUnpublished }: StoreMarginPriceChipsProps) {
  const pricing = pricingFormToInputs(form);
  const margined = listings
    .map((listing) => ({ listing, margin: marginForStore(listing.storeId, marginDraft) }))
    .filter((entry): entry is { listing: StoreListingResult; margin: number } => entry.margin !== null);

  if (margined.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-[4px]">
      {margined.map(({ listing, margin }) => {
        const published = isPublished(listing) && !!listing.productGid && listing.variants.length > 0;
        const price = storePriceFromMargin(pricing, margin);
        return (
          <button
            key={listing.storeId}
            type="button"
            onClick={() => (published ? onEditPrice(listing) : onUnpublished(listing.storeName))}
            title={published ? undefined : `Publish this product to ${listing.storeName} before editing its price`}
            className={`flex items-center gap-[3px] rounded-full border px-[5px] py-[1px] text-[9px] font-semibold leading-none transition-colors duration-150 cursor-pointer ${
              published
                ? 'border-inventory-border bg-inventory-surface-muted text-inventory-text-muted hover:bg-inventory-surface-hover'
                : 'border-dashed border-inventory-border-strong bg-inventory-surface text-inventory-text-subtle hover:bg-inventory-surface-hover'
            }`}
          >
            <span className="max-w-20 truncate">{listing.storeName}</span>
            <span className="tabular-nums text-inventory-text-subtle">{formatCurrencyValue(price)}</span>
          </button>
        );
      })}
    </div>
  );
}
