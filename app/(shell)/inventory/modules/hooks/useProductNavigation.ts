'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { matchesProduct } from '../utils';
import type { ProductRecord, QuickFilterId } from '../types';

/** Predicates behind the four orange shortcut buttons in the toolbar. */
const QUICK_FILTER_TESTS: Record<QuickFilterId, (p: ProductRecord) => boolean> = {
  'buying-lt-1': (p) => p.pricing.buyingPrice < 1,
  'profit-lt-5': (p) => p.variants.some((v) => v.sellPrice - v.buyPrice < 5),
  'selling-lt-1': (p) => p.variants.some((v) => v.sellPrice < 1),
  'selling-lt-5': (p) => p.variants.some((v) => v.sellPrice < 5),
};

export function useProductNavigation(products: ProductRecord[]) {
  const [allRecords, setAllRecords] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [quickFilter, setQuickFilter] = useState<QuickFilterId | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // "All records" is a master override — it ignores the verified and quick filters.
  const filtered = useMemo(() => {
    if (allRecords) return products;
    return products.filter((p) => {
      if (verifiedOnly && !p.verified) return false;
      if (quickFilter && !QUICK_FILTER_TESTS[quickFilter](p)) return false;
      return true;
    });
  }, [products, allRecords, verifiedOnly, quickFilter]);

  /**
   * Derived rather than stored, so that when a filter change drops the selected
   * product out of the set the page falls back to the first one on its own.
   */
  const index = useMemo(() => {
    if (filtered.length === 0) return -1;
    const found = selectedId ? filtered.findIndex((p) => p.id === selectedId) : -1;
    return found >= 0 ? found : 0;
  }, [filtered, selectedId]);

  const searchResults = useMemo(() => {
    const term = searchInput.trim();
    if (!term) return [];
    return products.filter((p) => matchesProduct(p, term)).slice(0, 8);
  }, [products, searchInput]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (searchRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [searchOpen]);

  const product = index >= 0 ? filtered[index] : null;

  const goTo = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), filtered.length - 1);
    if (filtered[clamped]) setSelectedId(filtered[clamped].id);
  };

  /** Always drops back to the single-product detail view for exactly this product —
   * used by the products table's row "view" action and by selectProduct below. */
  const viewProduct = (id: string) => {
    setAllRecords(false);
    setVerifiedOnly(false);
    setQuickFilter(null);
    setSelectedId(id);
  };

  /** Picking a search result (or a newly created product) should always land on that
   * product's detail view, regardless of whether "All records" or a filter was active. */
  const selectProduct = (id: string) => {
    viewProduct(id);
    setSearchInput('');
    setSearchOpen(false);
  };

  return {
    product,
    position: index + 1,
    filteredCount: filtered.length,
    totalCount: products.length,
    canPrev: index > 0,
    canNext: index >= 0 && index < filtered.length - 1,
    goFirst: () => goTo(0),
    goPrev: () => goTo(index - 1),
    goNext: () => goTo(index + 1),
    goLast: () => goTo(filtered.length - 1),
    allRecords,
    setAllRecords,
    verifiedOnly,
    setVerifiedOnly,
    quickFilter,
    toggleQuickFilter: (id: QuickFilterId) => setQuickFilter((prev) => (prev === id ? null : id)),
    searchInput,
    setSearchInput,
    searchOpen,
    setSearchOpen,
    searchResults,
    searchRef,
    selectProduct,
    viewProduct,
  };
}
