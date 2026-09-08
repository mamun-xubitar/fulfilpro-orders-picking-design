'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import type { CataloguePagination, InventoryGlobals, ProductRecord, ProductsResponse, QuickFilterId } from '../types';

const EMPTY_GLOBALS: InventoryGlobals = { exchangeRate: 1, marginPercent: 0, baseCurrency: 'AUD', currencies: [{ code: 'AUD', rate: 1 }, { code: 'USD', rate: 1 }] };
const EMPTY_PAGINATION: CataloguePagination = { page: 1, pageSize: 1, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type ApiEnvelope = { success: boolean; message: string; data?: ProductsResponse };

/**
 * Owns the "All records" toggle, the Verified checkbox, the active quick filter, and the
 * single-product record stepper — every decision behind them is made server-side (this hook
 * only ever asks for one page of one product). While "All records" is on, the products table
 * (`useProductsTable`) owns its own fetch instead, so this hook's fetch is skipped entirely.
 */
export function useCatalogData() {
  const [allRecords, setAllRecordsState] = useState(false);
  const [verifiedOnly, setVerifiedOnlyState] = useState(true);
  const [quickFilter, setQuickFilterState] = useState<QuickFilterId | null>(null);

  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [pagination, setPagination] = useState<CataloguePagination>(EMPTY_PAGINATION);
  const [totalAll, setTotalAll] = useState(0);
  const [globals, setGlobals] = useState<InventoryGlobals>(EMPTY_GLOBALS);
  const [rateInput, setRateInput] = useState('');
  const [marginInput, setMarginInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  // Named distinctly from the exposed `loading` below: while "All records" is on this stays
  // whatever it last was (the fetch effect bails out without touching it) — `loading` itself is
  // derived so it reads false immediately, without an extra setState-in-effect round trip.
  const [fetching, setFetching] = useState(false);
  const [fetchNonce, setFetchNonce] = useState(0);
  const { request: requestSettings } = useRequest();

  // Refs, not state — they drive the next fetch's query params without being reactive
  // themselves, so resolving a focusId's server-side position never triggers a second fetch.
  const pageRef = useRef(1);
  const focusIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (allRecords) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);

    const params = new URLSearchParams({ mode: 'detail' });
    // Unchecked "Verified" means no constraint at all (both verified and unverified show) —
    // only send the param when the filter is actually active. The quick filter deliberately
    // never reaches this fetch — in single-product view it only narrows the current product's
    // own variants matrix (see useVariantsMatrix), so it must never move the record stepper.
    if (verifiedOnly) params.set('verified', '1');
    const focusId = focusIdRef.current;
    if (focusId) params.set('focusId', focusId);
    else params.set('page', String(pageRef.current));

    fetch(`/api/inventory/catalog?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<ApiEnvelope>)
      .then((json) => {
        if (!json.success || !json.data) throw new Error(json.message || 'Failed to load product');
        const d = json.data;
        setProduct(d.products[0] ?? null);
        setPagination(d.pagination);
        setTotalAll(d.totalAll);
        setGlobals(d.globals);
        setRateInput(d.globals.exchangeRate.toFixed(2));
        setMarginInput(String(d.globals.marginPercent));
        pageRef.current = d.pagination.page;
        focusIdRef.current = null;
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        toast.error(err instanceof Error ? err.message : 'Failed to load product');
      })
      .finally(() => {
        if (abortRef.current === controller) setFetching(false);
      });

    return () => controller.abort();
  }, [allRecords, verifiedOnly, fetchNonce]);

  const bump = () => setFetchNonce((n) => n + 1);

  const setAllRecords = (value: boolean) => setAllRecordsState(value);
  const setVerifiedOnly = (value: boolean) => {
    pageRef.current = 1;
    setVerifiedOnlyState(value);
  };
  // No pageRef reset here — the quick filter no longer affects detail-mode pagination at all.
  const toggleQuickFilter = (id: QuickFilterId) => {
    setQuickFilterState((prev) => (prev === id ? null : id));
  };

  const goFirst = () => {
    if (pagination.total === 0) return;
    pageRef.current = 1;
    bump();
  };
  const goPrev = () => {
    if (!pagination.hasPrev) return;
    pageRef.current = pagination.page - 1;
    bump();
  };
  const goNext = () => {
    if (!pagination.hasNext) return;
    pageRef.current = pagination.page + 1;
    bump();
  };
  const goLast = () => {
    if (pagination.total === 0) return;
    pageRef.current = pagination.totalPages;
    bump();
  };

  /** Jumps straight to one product's position under the current filters — used by search
   * selection and by "view" from the All-records table. */
  const focusProduct = useCallback((id: string) => {
    focusIdRef.current = id;
    bump();
  }, []);

  const refresh = useCallback(() => bump(), []);

  /** Patches the currently-focused product in place with a mutation's server response — no refetch. */
  const updateProduct = useCallback((productId: string, patch: ProductRecord) => {
    setProduct((prev) => (prev?.id === productId ? patch : prev));
  }, []);

  /** Patches the stepper's own counts from the products table's latest fetch — the table
   * refetches after every delete/bulk-action/import, so this is how "n / X of Y" stays live while
   * "All records" is on instead of freezing at whatever it was when the toggle was flipped (its
   * own fetch effect is skipped entirely while allRecords is true, see below). Never triggers a
   * fetch; only re-clamps the (also frozen) page so it can't outlive a shrunk total. */
  const syncCounts = useCallback(({ totalAll: nextTotalAll, filteredCount }: { totalAll: number; filteredCount: number }) => {
    setTotalAll(nextTotalAll);
    setPagination((prev) => {
      const totalPages = Math.max(1, filteredCount);
      const page = Math.min(prev.page, totalPages);
      pageRef.current = page;
      return { ...prev, page, total: filteredCount, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
    });
  }, []);

  /** Removes the currently-focused product from the counters immediately (no round trip), then
   * pulls its replacement — the product now sitting at the same page index, since sort order is
   * createdAt desc and pageSize is 1 in detail mode. */
  const removeProduct = useCallback((productId: string) => {
    setProduct((prev) => (prev?.id === productId ? null : prev));
    setTotalAll((n) => Math.max(0, n - 1));
    setPagination((prev) => {
      const total = Math.max(0, prev.total - 1);
      const totalPages = Math.max(1, total);
      const page = Math.min(prev.page, totalPages);
      pageRef.current = page;
      return { ...prev, page, total, totalPages, hasPrev: page > 1, hasNext: page < totalPages };
    });
    setFetchNonce((n) => n + 1);
  }, []);

  const applyGlobalRate = () => {
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter an exchange rate greater than 0');
      return;
    }
    requestSettings({
      url: '/api/inventory/settings',
      method: 'PATCH',
      data: { globalExchangeRate: value },
      successMessage: `System exchange rate set to ${value.toFixed(2)}`,
      onSuccess: () => setGlobals((prev) => ({ ...prev, exchangeRate: value })),
    });
  };

  const applyGlobalMargin = () => {
    const value = Number(marginInput);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Enter a margin of 0 or more');
      return;
    }
    requestSettings({
      url: '/api/inventory/settings',
      method: 'PATCH',
      data: { globalMarginPercent: value },
      successMessage: `System wide margin set to ${value}%`,
      onSuccess: () => setGlobals((prev) => ({ ...prev, marginPercent: value })),
    });
  };

  // Derived, not stored: reads false the instant "All records" flips on, without waiting for
  // the (skipped) fetch effect to reset it — avoids a setState call in that effect's early exit.
  const loading = fetching && !allRecords;

  return {
    loading,
    /** True only for the page's first load — a background refresh (after a mutation) never
     * flips this, so the detail view stays mounted instead of flashing to a skeleton. */
    initialLoading: loading && !loaded,
    allRecords,
    setAllRecords,
    verifiedOnly,
    setVerifiedOnly,
    quickFilter,
    toggleQuickFilter,
    product,
    position: pagination.page,
    filteredCount: pagination.total,
    totalCount: totalAll,
    canPrev: pagination.hasPrev,
    canNext: pagination.hasNext,
    goFirst,
    goPrev,
    goNext,
    goLast,
    focusProduct,
    refresh,
    updateProduct,
    removeProduct,
    syncCounts,
    globals,
    rateInput,
    setRateInput,
    applyGlobalRate,
    marginInput,
    setMarginInput,
    applyGlobalMargin,
  };
}

export type CatalogData = ReturnType<typeof useCatalogData>;
