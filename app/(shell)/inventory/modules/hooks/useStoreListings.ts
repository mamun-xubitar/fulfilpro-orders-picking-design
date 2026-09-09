'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { StoreListingResult, StoreListingVariant } from '../types';

type ApiEnvelope<T> = { success: boolean; message: string; data?: T; errors?: string[] };

export function useStoreListings(productId: string | null) {
  const [listings, setListings] = useState<StoreListingResult[]>([]);
  // Named distinctly from the exposed `loading` below — see useCatalogData's `fetching` for why.
  const [fetching, setFetching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleared synchronously during render when the product changes (React's recommended pattern
  // for resetting state on a prop change) — a slow in-flight response for a product the admin
  // has already navigated away from is also aborted below, so it can never paint stale stores.
  const [renderedProductId, setRenderedProductId] = useState(productId);
  if (productId !== renderedProductId) {
    setRenderedProductId(productId);
    if (listings.length > 0) setListings([]);
  }

  useEffect(() => {
    abortRef.current?.abort();
    if (!productId) return;

    const controller = new AbortController();
    abortRef.current = controller;

    (function run() {
      setFetching(true);
      fetch(`/api/inventory/catalog/${productId}/store-listings`, { signal: controller.signal })
        .then((res) => res.json() as Promise<ApiEnvelope<{ listings: StoreListingResult[] }>>)
        .then((json) => {
          if (!json.success) throw new Error(json.message || 'Failed to load store listings');
          setListings(json.data!.listings);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          toast.error(err instanceof Error ? err.message : 'Failed to load store listings');
        })
        .finally(() => {
          if (abortRef.current === controller) setFetching(false);
        });
    })();

    return () => controller.abort();
  }, [productId]);

  const loading = fetching && !!productId;

  const sync = async () => {
    if (!productId) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/inventory/catalog/${productId}/store-listings`, { method: 'POST' });
      const json = (await res.json()) as ApiEnvelope<{ listings: StoreListingResult[] }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to sync store listings');
      setListings(json.data!.listings);
      toast.success('Store listings synced');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sync store listings');
    } finally {
      setSyncing(false);
    }
  };

  const savePrices = async (storeId: string, productGid: string, variants: { id: string; price: number }[]): Promise<boolean> => {
    if (!productId) return false;
    setSavingStoreId(storeId);
    try {
      const res = await fetch(`/api/inventory/catalog/${productId}/store-listings/${storeId}/prices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productGid, variants }),
      });
      const json = (await res.json()) as ApiEnvelope<{ variants: StoreListingVariant[] }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update price');

      const updatedById = new Map(json.data!.variants.map((v) => [v.id, v]));
      setListings((prev) =>
        prev.map((listing) =>
          listing.storeId === storeId
            ? { ...listing, variants: listing.variants.map((v) => updatedById.get(v.id) ?? v) }
            : listing
        )
      );
      toast.success('Price updated');
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update price');
      return false;
    } finally {
      setSavingStoreId(null);
    }
  };

  /** Persists (or, with `marginPercent: null`, clears) one store's per-store margin — called
   * only from the Pricing & margin panel's own Save (see useProductPricing.savePricing), never on
   * blur/change, so a store is never repriced until the admin explicitly saves. When that store is
   * already published, saving immediately reprices every mapped variant on Shopify to match — the
   * server does the push and returns the updated variants, merged in here the same way
   * `savePrices` does, so the price chip reflects it without a manual Sync. A store that isn't
   * listed yet (or a Shopify-side repricing failure) still keeps the saved margin. `silent`
   * suppresses this call's own toast — used when several stores are saved together, so the panel
   * shows one combined summary instead of one toast per store. */
  const setMargin = async (storeId: string, marginPercent: number | null, options?: { silent?: boolean }): Promise<boolean> => {
    if (!productId) return false;
    try {
      const res = await fetch(`/api/inventory/catalog/${productId}/store-listings/${storeId}/margin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marginPercent }),
      });
      const json = (await res.json()) as ApiEnvelope<{ marginPercent: number | null; repriced?: boolean; variants?: StoreListingVariant[] }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save store margin');

      const updatedById = json.data!.variants ? new Map(json.data!.variants.map((v) => [v.id, v])) : null;
      setListings((prev) =>
        prev.map((listing) =>
          listing.storeId === storeId
            ? {
                ...listing,
                marginPercent: json.data!.marginPercent,
                variants: updatedById ? listing.variants.map((v) => updatedById.get(v.id) ?? v) : listing.variants,
              }
            : listing
        )
      );
      if (!options?.silent) toast.success(json.message);
      return true;
    } catch (err) {
      if (!options?.silent) toast.error(err instanceof Error ? err.message : 'Failed to save store margin');
      return false;
    }
  };

  return { listings, loading, syncing, savingStoreId, sync, savePrices, setMargin };
}

export type StoreListingsState = ReturnType<typeof useStoreListings>;
