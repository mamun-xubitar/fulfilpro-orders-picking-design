'use client';

import { useEffect, useRef, useState } from 'react';
import type { CatalogData } from './useCatalogData';
import type { ProductRecord, ProductsResponse } from '../types';

type ApiEnvelope = { success: boolean; message: string; data?: ProductsResponse };

/**
 * The toolbar's search typeahead — a thin layer on top of `useCatalogData`. Every other piece
 * of "navigation" (All records, Verified, quick filter, the record stepper) is owned by
 * `data` and just re-exposed here so components keep reading `nav.*` unchanged.
 */
export function useProductNavigation(data: CatalogData) {
  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ProductRecord[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Server-side search, debounced 300ms and abortable — searches the whole catalogue
  // regardless of the active filters, mirroring the old client-side behaviour.
  useEffect(() => {
    const term = searchInput.trim();
    abortRef.current?.abort();
    if (!term) return;
    const timer = window.setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      const params = new URLSearchParams({ mode: 'search', search: term });
      fetch(`/api/inventory/catalog?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json() as Promise<ApiEnvelope>)
        .then((json) => {
          if (!json.success || !json.data) return;
          setSearchResults(json.data.products);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (searchRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [searchOpen]);

  /** Always drops back to the single-product detail view for exactly this product —
   * used by the products table's row "view" action and by selectProduct below. */
  const viewProduct = (id: string) => {
    data.setAllRecords(false);
    data.setVerifiedOnly(false);
    if (data.quickFilter) data.toggleQuickFilter(data.quickFilter);
    data.focusProduct(id);
  };

  /** Picking a search result (or a newly created product) should always land on that
   * product's detail view, regardless of whether "All records" or a filter was active. */
  const selectProduct = (id: string) => {
    viewProduct(id);
    setSearchInput('');
    setSearchOpen(false);
  };

  return {
    allRecords: data.allRecords,
    setAllRecords: data.setAllRecords,
    verifiedOnly: data.verifiedOnly,
    setVerifiedOnly: data.setVerifiedOnly,
    quickFilter: data.quickFilter,
    toggleQuickFilter: data.toggleQuickFilter,
    product: data.product,
    position: data.position,
    filteredCount: data.filteredCount,
    totalCount: data.totalCount,
    canPrev: data.canPrev,
    canNext: data.canNext,
    goFirst: data.goFirst,
    goPrev: data.goPrev,
    goNext: data.goNext,
    goLast: data.goLast,
    removeProduct: data.removeProduct,
    searchInput,
    setSearchInput,
    searchOpen,
    setSearchOpen,
    // Derived: an emptied search box reads as no results immediately, without waiting for the
    // (skipped) debounce effect to clear stale state from the previous term.
    searchResults: searchInput.trim() ? searchResults : [],
    searchRef,
    selectProduct,
    viewProduct,
  };
}
