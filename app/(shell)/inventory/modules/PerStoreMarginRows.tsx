'use client';

import { useState } from 'react';
import { Close, Plus } from './icons';
import type { StoreListingResult } from './types';
import { marginForStore } from './utils';

type PerStoreMarginRowsProps = {
  listings: StoreListingResult[];
  /** The panel's staged *explicit* margin overrides only (storeId -> percent, or null to clear) —
   * a store that merely inherits its global default is not included here, so it renders no row
   * until added via "+". See useProductPricing.marginDraft. Not written to the server until the
   * panel's own Save button. */
  values: Record<string, number | null>;
  onChange: (storeId: string, marginPercent: number | null) => void;
};

/**
 * "Per store margin" under Margin % — a store-specific margin that reprices that store's live
 * Shopify listing (when it's already published there) once the panel is saved, independently of
 * the product-level Sell price above. It never enters `computePricing`, so adding or editing a row
 * here leaves Sell price (ex/inc tax) unchanged — only that one store's prices move, and only on
 * Save. The panel is always editable, so every row here is always a live input. Starts with only
 * the "+" control showing — a store inheriting its global default margin (with no product-specific
 * override of its own) shows no row until one is explicitly added.
 */
export default function PerStoreMarginRows({ listings, values, onChange }: PerStoreMarginRowsProps) {
  const [adding, setAdding] = useState(false);
  const marginFor = (storeId: string) => marginForStore(storeId, values);
  const withMargin = listings.filter((l) => marginFor(l.storeId) !== null);
  const available = listings.filter((l) => marginFor(l.storeId) === null);

  return (
    <div className="space-y-0.75">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle" title="Saved margins reprice that store on Shopify when you save this panel">
          Per store margin
        </span>
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-label="Add per-store margin"
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-inventory-border-strong text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
          >
            <Plus className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-[6px]">
          <select
            autoFocus
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value, 0);
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
            aria-label="Cancel adding per-store margin"
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
          >
            <Close className="h-2.5 w-2.5" />
          </button>
        </div>
      )}

      {withMargin.map((l) => (
        <div key={l.storeId} className="flex items-center gap-[6px]">
          <span className="min-w-0 flex-1 truncate text-[11px] leading-none text-inventory-text-muted">{l.storeName}</span>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              value={values[l.storeId] ?? 0}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isFinite(value) && value >= 0) onChange(l.storeId, value);
              }}
              aria-label={`Margin for ${l.storeName}`}
              className="h-[22px] w-[68px] rounded-[7px] border border-inventory-border-strong pl-[6px] pr-[18px] text-right text-[10.5px] leading-none tabular-nums outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
            />
            <span className="pointer-events-none absolute right-[5px] top-1/2 -translate-y-1/2 text-[9px] leading-none text-inventory-text-subtle">%</span>
          </div>
          <button
            type="button"
            onClick={() => onChange(l.storeId, null)}
            aria-label={`Remove margin for ${l.storeName}`}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
          >
            <Close className="h-2.5 w-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
