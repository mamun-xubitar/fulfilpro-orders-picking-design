'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';

export type GlobalStoreMarginRow = { storeId: string; storeName: string; marginPercent: number | null };

/**
 * The "Per store margin" row on the inventory toolbar's Store-wide defaults card — a global
 * fallback margin per connected store, used when a product has no product-specific per-store
 * margin of its own (see the resolution chain in lib/inventory/store-price.ts). Self-contained,
 * like the page's other global-defaults controls (System wide margin), so it's called directly
 * from ProductsToolbar rather than threaded through useInventoryPage.
 */
export function useGlobalStoreMargins() {
  const [stores, setStores] = useState<GlobalStoreMarginRow[]>([]);
  // Draft text per store, seeded from the loaded value — kept separate from `stores` so a typed
  // (not-yet-applied) edit in one row survives another row's own Apply/reload.
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const { request: requestList, loading } = useRequest<{ stores: GlobalStoreMarginRow[] }>();
  const { request: requestSave, loading: saving } = useRequest<{ storeId: string; marginPercent: number | null }>();

  const load = () => {
    requestList({
      url: '/api/inventory/settings/store-margins',
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => {
        setStores(data.stores);
        setInputs(Object.fromEntries(data.stores.map((s) => [s.storeId, s.marginPercent !== null ? String(s.marginPercent) : ''])));
      },
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  const setInput = (storeId: string, value: string) => setInputs((prev) => ({ ...prev, [storeId]: value }));

  /** Blank clears the store's default (falls back further to each product's own sell price);
   * anything else must be a finite, non-negative percentage. */
  const apply = (storeId: string) => {
    const trimmed = (inputs[storeId] ?? '').trim();
    const marginPercent = trimmed === '' ? null : Number(trimmed);
    if (marginPercent !== null && (!Number.isFinite(marginPercent) || marginPercent < 0)) {
      toast.error('Enter a margin of 0 or more');
      return;
    }
    requestSave({
      url: '/api/inventory/settings/store-margins',
      method: 'PATCH',
      data: { storeId, marginPercent },
      successMessage: marginPercent === null ? 'Store margin removed' : `Store margin set to ${marginPercent}%`,
      onSuccess: ({ data }) => {
        setStores((prev) => prev.map((s) => (s.storeId === storeId ? { ...s, marginPercent: data.marginPercent } : s)));
        setInput(storeId, data.marginPercent !== null ? String(data.marginPercent) : '');
      },
    });
  };

  return { stores, loading, inputs, setInput, apply, saving };
}

export type GlobalStoreMarginsState = ReturnType<typeof useGlobalStoreMargins>;
