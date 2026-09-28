'use client';

import { useMemo, useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { storePriceFromMargin } from '@/lib/inventory/store-price';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import type { PricingForm, StoreListingResult } from './types';
import { formatCurrencyValue, pricingFormToInputs } from './utils';

type StoreMarginEditModalProps = {
  listings: StoreListingResult[];
  /** The product's last-*saved* pricing — the price preview reprices from this, same as the
   * server does, rather than from any unsaved pricing-form edit. */
  savedForm: PricingForm;
  /** This product's saved per-store margin overrides (storeId -> percent) — a store that merely
   * inherits its global default is not included, so it starts unselected here. */
  values: Record<string, number | null>;
  /** Pre-selects this store — used when the panel's own "+" button, or the view modal's per-row
   * edit action, opens straight into a specific store rather than a blank picker. */
  initialStoreId?: string;
  saving: boolean;
  /** Saves immediately (unlike the old staged draft, which only reached the server on the panel's
   * own pricing Save) — resolves `{ ok, error? }` so a server-side validation failure can be shown
   * inline instead of only via toast. */
  onSave: (storeId: string, marginPercent: number | null) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

/**
 * Add/edit a single store's per-store margin. Saves directly on Apply — there is no longer a
 * staged draft that waits on the Pricing & margin panel's own Save. Picking an already-overridden
 * store prefills its current margin; picking one with no override starts it at an empty field so
 * "0%" is never silently implied. Removing an override is a distinct, confirmed action, since it
 * immediately reprices a live Shopify listing back to whatever the store's own default resolves
 * to.
 */
export default function StoreMarginEditModal({ listings, savedForm, values, initialStoreId, saving, onSave, onClose }: StoreMarginEditModalProps) {
  const [storeId, setStoreId] = useState(initialStoreId ?? '');
  const [margin, setMargin] = useState(() => {
    const existing = initialStoreId ? values[initialStoreId] : null;
    return existing != null ? String(existing) : '';
  });
  const [errors, setErrors] = useState<{ storeId?: string; margin?: string; general?: string }>({});
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const pricing = useMemo(() => pricingFormToInputs(savedForm), [savedForm]);
  const selectedStore = listings.find((l) => l.storeId === storeId) ?? null;
  const hasExistingMargin = storeId in values && values[storeId] !== null;

  const parsedMargin = Number(margin);
  const marginValid = margin.trim() !== '' && Number.isFinite(parsedMargin) && parsedMargin >= 0 && parsedMargin <= 1000 && /^\d+(\.\d{1,2})?$/.test(margin.trim());
  const preview = marginValid ? storePriceFromMargin(pricing, parsedMargin) : null;

  const selectStore = (id: string) => {
    setStoreId(id);
    setConfirmingRemove(false);
    const existing = id in values ? values[id] : null;
    setMargin(existing != null ? String(existing) : '');
    setErrors({});
  };

  const changeMargin = (value: string) => {
    setMargin(value);
    setConfirmingRemove(false);
    setErrors((prev) => (prev.margin || prev.general ? { ...prev, margin: undefined, general: undefined } : prev));
  };

  const validate = (): boolean => {
    const next: { storeId?: string; margin?: string } = {};
    if (!storeId) next.storeId = 'Select a store';
    if (!marginValid) next.margin = margin.trim() === '' ? 'Enter a margin' : 'Enter a margin between 0 and 1000, with at most 2 decimals';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleApply = async () => {
    if (!validate()) return;
    const result = await onSave(storeId, parsedMargin);
    if (result.ok) onClose();
    else setErrors((prev) => ({ ...prev, general: result.error }));
  };

  const handleRemove = async () => {
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    const result = await onSave(storeId, null);
    if (result.ok) onClose();
    else setErrors((prev) => ({ ...prev, general: result.error }));
  };

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
            Cancel
          </button>
          <button type="button" onClick={handleApply} disabled={saving} className={`flex-1 ${WIZARD_BTN_PRIMARY}`}>
            {saving && SPINNER}
            {saving ? 'Applying…' : 'Apply'}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
        <p className="text-[11px] leading-snug text-inventory-text-subtle">Overrides this store&apos;s default margin for this product only, and saves immediately.</p>

        <div>
          <select
            value={storeId}
            onChange={(e) => selectStore(e.target.value)}
            aria-label="Select a store"
            className={`h-[24px] w-full rounded-[7px] border px-[6px] text-[10.5px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer ${
              errors.storeId ? 'border-inventory-danger/50' : 'border-inventory-border-strong'
            }`}
          >
            <option value="" disabled>
              Select a store…
            </option>
            {listings.map((l) => (
              <option key={l.storeId} value={l.storeId}>
                {l.storeName}
                {values[l.storeId] != null ? ` — ${values[l.storeId]}%` : ''}
              </option>
            ))}
          </select>
          {errors.storeId && <p className="mt-1 text-[10.5px] leading-none text-inventory-danger">{errors.storeId}</p>}
        </div>

        {storeId && (
          <div className="flex items-center gap-[6px]">
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="1000"
                value={margin}
                onChange={(e) => changeMargin(e.target.value)}
                aria-label={`Margin for ${selectedStore?.storeName ?? 'store'}`}
                placeholder="0.0"
                className={`h-[24px] w-[72px] rounded-[7px] border pl-[6px] pr-[18px] text-right text-[10.5px] leading-none tabular-nums outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring ${
                  errors.margin ? 'border-inventory-danger/50' : 'border-inventory-border-strong'
                }`}
              />
              <span className="pointer-events-none absolute right-[5px] top-1/2 -translate-y-1/2 text-[9px] leading-none text-inventory-text-subtle">%</span>
            </div>
            <span className="text-[11px] leading-none text-inventory-text-subtle">
              {preview !== null ? `→ ${formatCurrencyValue(preview)}` : '—'}
            </span>
          </div>
        )}
        {errors.margin && <p className="text-[10.5px] leading-none text-inventory-danger">{errors.margin}</p>}
        {errors.general && <p className="text-[10.5px] leading-none text-inventory-danger">{errors.general}</p>}

        {hasExistingMargin && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={saving}
            className="text-[10.5px] font-semibold leading-none text-inventory-danger hover:underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmingRemove ? 'Click again to confirm remove' : 'Remove this store’s margin'}
          </button>
        )}
      </div>
    </ModalShell>
  );
}
