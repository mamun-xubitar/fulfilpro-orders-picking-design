'use client';

import { ModalShell } from '@/components/ModalShell';
import { storePriceFromMargin } from '@/lib/inventory/store-price';
import { Pencil } from './icons';
import { WIZARD_BODY_CLASS, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import { isPublished } from './storeDraft';
import type { PricingForm, StoreListingResult } from './types';
import { formatCurrencyValue, pricingFormToInputs } from './utils';

type StoreMarginViewModalProps = {
  listings: StoreListingResult[];
  savedForm: PricingForm;
  /** This product's saved per-store margin overrides (storeId -> percent). */
  values: Record<string, number | null>;
  /** Opens the existing live-Shopify-price editor (StorePricesModal) for an already-published store. */
  onEditPrice: (listing: StoreListingResult) => void;
  onClose: () => void;
};

/**
 * Read-only "Per store margin" list, opened from the panel's store-count pill. Shows every
 * product-specific override with its margin and resolved price, plus "Edit live prices" for
 * published stores. Adding, changing or removing a margin happens only in StoreMarginEditModal
 * (the panel's "+" button), never here.
 */
export default function StoreMarginViewModal({ listings, savedForm, values, onEditPrice, onClose }: StoreMarginViewModalProps) {
  const pricing = pricingFormToInputs(savedForm);
  const overridden = listings.filter((l) => values[l.storeId] != null);

  return (
    <ModalShell
      disableBackdropClose
      title="Per store margin"
      compact
      onClose={onClose}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <button type="button" onClick={onClose} className={`w-full ${WIZARD_BTN_SECONDARY}`}>
          Close
        </button>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
        {overridden.length === 0 ? (
          <p className="py-3 text-center text-[11px] text-inventory-text-subtle">No store margins set for this product.</p>
        ) : (
          <div className="max-h-[280px] space-y-1.5 overflow-y-auto thin-scroll">
            {overridden.map((l) => {
              const margin = values[l.storeId]!;
              const price = storePriceFromMargin(pricing, margin);
              const published = isPublished(l) && !!l.productGid && l.variants.length > 0;
              return (
                <div key={l.storeId} className="space-y-[5px] rounded-[8px] border border-inventory-border px-[8px] py-[6px]">
                  <div className="flex items-center justify-between gap-[6px]">
                    <span className="min-w-0 truncate text-[11px] font-medium leading-none text-inventory-text-muted" title={l.storeName}>
                      {l.storeName}
                    </span>
                    <span className="shrink-0 text-[11px] font-bold leading-none tabular-nums text-inventory-text">{margin}%</span>
                  </div>
                  {published ? (
                    <button
                      type="button"
                      onClick={() => onEditPrice(l)}
                      className="inline-flex items-center gap-1 rounded-full border border-inventory-secondary/30 bg-inventory-secondary/10 px-[7px] py-[2px] text-[9.5px] font-bold leading-none text-inventory-secondary tabular-nums transition-colors duration-150 hover:bg-inventory-secondary/20 cursor-pointer"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      {formatCurrencyValue(price)} · Edit live prices
                    </button>
                  ) : (
                    <span className="inline-block text-[9.5px] leading-none text-inventory-text-subtle tabular-nums">{formatCurrencyValue(price)}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
