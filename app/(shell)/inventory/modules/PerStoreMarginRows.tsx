'use client';

import { useState } from 'react';
import { Close, Plus } from './icons';
import type { StoreListingResult } from './types';

type PerStoreMarginRowsProps = {
  listings: StoreListingResult[];
  onSetMargin: (storeId: string, marginPercent: number | null) => void;
  /** Add/edit/remove only while the Pricing & margin panel itself is in edit mode — matches
   * every other field in that panel (Currency, Margin %, Tax), which all require Edit first
   * rather than writing straight to the API on blur. */
  editing: boolean;
};

/**
 * "Per store margin" under Margin % — a store-specific margin that reprices that store's live
 * Shopify listing immediately on save (when it's already published there), independently of the
 * product-level Sell price above. It never enters `computePricing`, so adding or editing a row
 * here leaves Sell price (ex/inc tax) unchanged — only that one store's prices move.
 */
export default function PerStoreMarginRows({ listings, onSetMargin, editing }: PerStoreMarginRowsProps) {
  const [adding, setAdding] = useState(false);
  const withMargin = listings.filter((l) => l.marginPercent !== null);
  const available = listings.filter((l) => l.marginPercent === null);

  if (!editing && withMargin.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-gray-600" title="Saving a margin here reprices that store on Shopify right away">
          Per store margin
        </span>
        {editing && available.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            aria-label="Add per-store margin"
            className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {editing && adding && (
        <div className="flex items-center gap-2">
          <select
            autoFocus
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onSetMargin(e.target.value, 0);
              setAdding(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAdding(false);
            }}
            aria-label="Select a store to add a margin for"
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
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
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
          >
            <Close className="h-3 w-3" />
          </button>
        </div>
      )}

      {withMargin.map((l) =>
        editing ? (
          <div key={l.storeId} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-700">{l.storeName}</span>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                defaultValue={l.marginPercent ?? 0}
                onBlur={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value) && value >= 0) onSetMargin(l.storeId, value);
                }}
                aria-label={`Margin for ${l.storeName}`}
                className="w-20 rounded-lg border border-gray-300 py-1 pl-2 pr-6 text-right text-[13px] tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">%</span>
            </div>
            <button
              type="button"
              onClick={() => onSetMargin(l.storeId, null)}
              aria-label={`Remove margin for ${l.storeName}`}
              className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
            >
              <Close className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div key={l.storeId} className="flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-gray-700">{l.storeName}</span>
            <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{Number(l.marginPercent).toFixed(1)} %</span>
          </div>
        )
      )}
    </div>
  );
}
