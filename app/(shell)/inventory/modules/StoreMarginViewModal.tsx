'use client';

import { ModalShell } from '@/components/ModalShell';
import { storePriceFromMargin } from '@/lib/inventory/store-price';
import { isPublished } from './storeDraft';
import { WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import type { PricingForm, StoreListingResult } from './types';
import { formatCurrencyValue, pricingFormToInputs } from './utils';

type StoreMarginViewModalProps = {
  listings: StoreListingResult[];
  savedForm: PricingForm;
  /** This product's saved per-store margin overrides (storeId -> percent). */
  values: Record<string, number | null>;
  /** Opens the existing live-Shopify-price editor for an already-published store. */
  onEditPrice: (listing: StoreListingResult) => void;
  /** Opens the Add/edit modal, pre-selecting this store's row (or blank, from the footer). */
  onEditMargin: (storeId?: string) => void;
  onClose: () => void;
};

/**
 * Read-only "Per store margin" list, opened from the panel's store-count pill. Shows every
 * product-specific override with its resolved live-currency price; changing or removing a margin
 * happens in StoreMarginEditModal (opened via a row's Edit action, or the footer's Add / edit
 * margins button), never here.
 */
export default function StoreMarginViewModal({ listings, savedForm, values, onEditPrice, onEditMargin, onClose }: StoreMarginViewModalProps) {
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
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className={`flex-1 ${WIZARD_BTN_SECONDARY}`}>
            Close
          </button>
          <button type="button" onClick={() => onEditMargin()} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
            Add / edit margins
          </button>
        </div>
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
                <div key={l.storeId} className="flex items-center gap-[6px] rounded-[8px] border border-inventory-border px-[8px] py-[6px]">
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium leading-none text-inventory-text-muted" title={l.storeName}>
                      {l.storeName}
                    </span>
                    {published ? (
                      <button
                        type="button"
                        onClick={() => onEditPrice(l)}
                        className="mt-[3px] block text-[9.5px] leading-none text-inventory-secondary hover:underline cursor-pointer"
                      >
                        {formatCurrencyValue(price)} · Edit live prices
                      </button>
                    ) : (
                      <span className="mt-[3px] block text-[9.5px] leading-none text-inventory-text-subtle">{formatCurrencyValue(price)}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] font-bold leading-none tabular-nums text-inventory-text">{margin}%</span>
                  <button
                    type="button"
                    onClick={() => onEditMargin(l.storeId)}
                    className="shrink-0 rounded-[6px] border border-inventory-border-strong px-[7px] py-[3px] text-[9.5px] font-bold leading-none text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
