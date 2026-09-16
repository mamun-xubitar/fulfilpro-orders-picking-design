'use client';

import { useEffect, useState } from 'react';
import type { ProductStatusValue, QuickFilterId } from '../types';
import type { ProductsSortKey } from './useProductsTable';

export const PAGE_SIZE_OPTIONS = [20, 50, 100];

type UseProductsFiltersArgs = {
  /** Only watched to reset the page to 1 when either changes — the values themselves are read
   * straight off these props by the caller's own buildParams, not re-exposed here. */
  verifiedOnly: boolean;
  quickFilter: QuickFilterId | null;
};

/** Owns All-records mode's search/status/supplier/sort/page state — split out of
 * useProductsTable so that hook stays under the ~300 line target. Every setter here resets to
 * page 1 inline, mirroring how useOrdersFilters resets its own pagination. */
export function useProductsFilters({ verifiedOnly, quickFilter }: UseProductsFiltersArgs) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE_OPTIONS[0]);

  // The input reflects every keystroke immediately; `search` (what buildParams/the fetch effect
  // actually read) only catches up 300ms later, per the project's debounced-search pattern.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearchState] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchState(searchInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const [status, setStatusState] = useState<ProductStatusValue | ''>('');
  const setStatus = (value: ProductStatusValue | '') => {
    setStatusState(value);
    setPage(1);
  };
  const [supplierId, setSupplierIdState] = useState('');
  const setSupplierId = (value: string) => {
    setSupplierIdState(value);
    setPage(1);
  };
  // Hidden by default (item 19) — a separate visibility toggle, not a filter "Clear filters"
  // resets, same treatment as the Verified toggle above it in the toolbar.
  const [includeOmitted, setIncludeOmittedState] = useState(false);
  const setIncludeOmitted = (value: boolean) => {
    setIncludeOmittedState(value);
    setPage(1);
  };
  const [sort, setSortState] = useState<ProductsSortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  // Render-time reset (same pattern as useInventoryPage's renderedProductId): Verified and the
  // quick filter live in the parent (useCatalogData) and arrive here as props, so there's no
  // setter of our own to hook a page reset into — comparing against the last-seen values catches
  // the change as it renders, without an effect round trip.
  const [applied, setApplied] = useState({ verifiedOnly, quickFilter });
  if (applied.verifiedOnly !== verifiedOnly || applied.quickFilter !== quickFilter) {
    setApplied({ verifiedOnly, quickFilter });
    if (page !== 1) setPage(1);
  }

  const hasActiveFilters = searchInput.trim() !== '' || status !== '' || supplierId !== '';
  const handleClearFilters = () => {
    setSearchInput('');
    setSearchState('');
    setStatus('');
    setSupplierId('');
  };

  const handleSortChange = (key: ProductsSortKey) => {
    if (sort === key) {
      setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortState(key);
      setDir('asc');
    }
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    searchInput,
    setSearchInput,
    search,
    status,
    setStatus,
    supplierId,
    setSupplierId,
    includeOmitted,
    setIncludeOmitted,
    sort,
    dir,
    handleSortChange,
    hasActiveFilters,
    handleClearFilters,
  };
}
