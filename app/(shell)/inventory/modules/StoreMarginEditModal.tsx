'use client';

import { useState } from 'react';
import { ModalShell } from '@/components/ModalShell';
import { storePriceFromMargin } from '@/lib/inventory/store-price';
import { Close, Plus } from './icons';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import type { PricingForm, StoreListingResult } from './types';
import { formatCurrencyValue, pricingFormToInputs } from './utils';

type StoreMarginEditModalProps = {
  listings: StoreListingResult[];
  /** The product's last-*saved* pricing — the price preview reprices from this, same as the
   * server does, rather than from any unsaved pricing-form edit. */
  savedForm: PricingForm;
  /** This product's saved per-store margin overrides (storeId -> percent) — a store that merely
   * inherits its global default is not included, so it starts no row here. */
  values: Record<string, number | null>;
  /** Opens straight into "add a store" — used when the panel's own "+" button launches the
   * modal and there's still a store without an override. */
  startAdding?: boolean;
  saving: boolean;
  /** Persists one store's margin (`null` clears it) — resolves `{ ok, error? }` so a failure can
   * be shown inline under that store's row. */
  onSave: (storeId: string, marginPercent: number | null) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

function validateMargin(raw: string): string | null {
  const value = raw.trim();
  if (value === '') return 'Enter a margin';
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000 || !/^\d+(\.\d{1,2})?$/.test(value)) return 'Enter a margin between 0 and 1000';
  return null;
}

/**
 * "Per store margin" add/edit modal for a single product — same shell and mechanics as "Per store
 * margin defaults" (GlobalStoreMarginModal), but scoped to this product's own overrides. Rows are
 * added, edited and removed locally, and Apply saves every changed row immediately (no longer
 * staged behind the Pricing & margin panel's own Save). Cancel discards the local draft.
 */
export default function StoreMarginEditModal({ listings, savedForm, values, startAdding, saving, onSave, onClose }: StoreMarginEditModalProps) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null).map(([id, v]) => [id, String(v)]))
  );
  const [adding, setAdding] = useState(!!startAdding);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const added = listings.filter((l) => l.storeId in draft);
  const available = listings.filter((l) => !(l.storeId in draft));
  const pricing = pricingFormToInputs(savedForm);

  const clearError = (storeId: string) =>
    setRowErrors((prev) => {
      if (!(storeId in prev)) return prev;
      const next = { ...prev };
      delete next[storeId];
      return next;
    });

  const addStore = (storeId: string) => setDraft((prev) => ({ ...prev, [storeId]: '' }));
  const removeStore = (storeId: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[storeId];
      return next;
    });
    clearError(storeId);
  };
  const setValue = (storeId: string, value: string) => {
    setDraft((prev) => ({ ...prev, [storeId]: value }));
    clearError(storeId);
  };

  const handleApply = async () => {
    const errors: Record<string, string> = {};
    for (const storeId of Object.keys(draft)) {
      const error = validateMargin(draft[storeId]);
      if (error) errors[storeId] = error;
    }
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Only rows that actually differ from what's saved — an unchanged store is never re-saved
    // (and so never repriced on Shopify) just because Apply was pressed.
    const dirty: [string, number | null][] = [];
    for (const l of listings) {
      const saved = values[l.storeId] ?? null;
      const next = l.storeId in draft ? Number(draft[l.storeId]) : null;
      if (next !== saved) dirty.push([l.storeId, next]);
    }

    const failed: Record<string, string> = {};
    for (const [storeId, marginPercent] of dirty) {
      const result = await onSave(storeId, marginPercent);
      if (!result.ok) failed[storeId] = result.error ?? 'Failed to save store margin';
    }
    if (Object.keys(failed).length > 0) {
      setRowErrors(failed);
      return;
    }
    onClose();
  };

  return (
    <ModalShell
      disableBackdropClose
      title="Per store margin"
      compact
      onClose={onClose}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] leading-snug text-inventory-text-subtle">Overrides this store&apos;s default margin for this product only. Saved on Apply.</p>
          {available.length > 0 && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              aria-label="Add a store"
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-inventory-border-strong text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          )}
        </div>

        {adding && available.length > 0 && (
          <div className="flex items-center gap-[4px]">
            <select
              autoFocus
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) addStore(e.target.value);
                setAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAdding(false);
              }}
              aria-label="Select a store to add a margin for"
              className="h-[22px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[10.5px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
            >
              <option value="" disabled>
                Select a store…
              </option>
              {available.map((l) => (
                <option key={l.storeId} value={l.storeId}>
                  {l.storeName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAdding(false)}
              aria-label="Cancel adding a store"
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
            >
              <Close className="h-2.5 w-2.5" />
            </button>
          </div>
        )}

        {added.length === 0 && !adding ? (
          <p className="py-3 text-center text-[11px] text-inventory-text-subtle">No store margins set for this product. Use + to add one.</p>
        ) : (
          <div className="max-h-[280px] space-y-1.5 overflow-y-auto thin-scroll">
            {added.map((l) => {
              const raw = draft[l.storeId];
              const error = rowErrors[l.storeId];
              const price = validateMargin(raw) === null ? storePriceFromMargin(pricing, Number(raw)) : null;
              return (
                <div key={l.storeId} className="rounded-[8px] border border-inventory-border px-[8px] py-[6px]">
                  <div className="flex items-center gap-[4px]">
                    <div className="flex min-w-0 flex-1 items-center gap-[5px]" title={l.storeName}>
                      <span className="truncate text-[11px] font-medium leading-none text-inventory-text-muted">{l.storeName}</span>
                      <span className="shrink-0 rounded-full border border-inventory-border-strong bg-inventory-surface-muted px-[6px] py-[1px] text-[9.5px] font-semibold leading-none text-inventory-text-muted tabular-nums">
                        {price !== null ? formatCurrencyValue(price) : '—'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1000"
                        value={raw}
                        onChange={(e) => setValue(l.storeId, e.target.value)}
                        aria-label={`Margin for ${l.storeName}`}
                        aria-invalid={!!error}
                        className={`h-[22px] w-[62px] rounded-[7px] border pl-[6px] pr-[18px] text-right text-[10.5px] leading-none tabular-nums outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring ${
                          error ? 'border-inventory-danger/50' : 'border-inventory-border-strong'
                        }`}
                      />
                      <span className="pointer-events-none absolute right-[5px] top-1/2 -translate-y-1/2 text-[9px] leading-none text-inventory-text-subtle">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeStore(l.storeId)}
                      aria-label={`Remove margin for ${l.storeName}`}
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
                    >
                      <Close className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  {error && <p className="mt-1 text-right text-[10px] leading-none text-inventory-danger">{error}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
