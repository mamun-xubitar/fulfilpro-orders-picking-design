'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import type { ProductRecord } from '../types';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';

export type RecommendSortKey = 'name' | 'brand' | 'reorder' | 'stock';

export const RECOMMEND_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type Args = {
  /** Only fetch while the tab is on screen. */
  enabled: boolean;
  /** Bumped by the page after something changed stock (a receive, an adjustment, a stocktake) so the list refetches. */
  refreshKey: number;
};

/** The Purchase Recommend tab: every product with at least one variant in the Reorder state
 * (available stock below its trigger) — search, supplier filter, sorting and paging. Read-only;
 * a purchase order is raised from the product's own Variant tab. */
export function usePurchaseRecommendTab({ enabled, refreshKey }: Args) {
  const [rows, setRows] = useState<ProductRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  // Which query `rows` belong to — a refetch of the same query keeps showing them instead of a skeleton.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { request: requestList, loading } = useRequest<{ products: ProductRecord[]; pagination: PaginationState }>();

  const [searchInput, setSearchInputState] = useState('');
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierIdState] = useState('');
  const [sort, setSort] = useState<RecommendSortKey>('reorder');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [viewTarget, setViewTarget] = useState<ProductRecord | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchInput = (value: string) => {
    setSearchInputState(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };
  const setSupplierId = (value: string) => {
    setSupplierIdState(value);
    setPage(1);
  };
  const clearFilters = () => {
    setSupplierIdState('');
    setSearchInputState('');
    setSearch('');
    setPage(1);
  };
  const changeSort = (key: RecommendSortKey) => {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir(key === 'name' || key === 'brand' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const queryKey = JSON.stringify({ search, supplierId, sort, dir, page, pageSize });
  const load = () => {
    if (!enabled) return;
    requestList({
      url: '/api/inventory/purchase-recommendations',
      method: 'GET',
      showToast: false,
      data: { search, supplier: supplierId, sort, dir, page, pageSize },
      onSuccess: ({ data }) => {
        // The last page can empty out (its products were restocked) — snap back to the server's clamped page.
        if (data.products.length === 0 && data.pagination.total > 0 && data.pagination.page !== page) {
          setPage(data.pagination.page);
          return;
        }
        setRows(data.products);
        setPagination(data.pagination);
        setInitialLoading(false);
        setLoadedKey(queryKey);
      },
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [enabled, search, supplierId, sort, dir, page, pageSize, refreshKey]);

  return {
    rows,
    pagination,
    pageNumbers: buildPageNumbers(pagination.page, pagination.totalPages),
    loading,
    initialLoading,
    showSkeleton: initialLoading || (loading && loadedKey !== queryKey),
    searchInput,
    setSearchInput,
    supplierId,
    setSupplierId,
    clearFilters,
    hasFilters: search !== '' || supplierId !== '',
    sort,
    dir,
    changeSort,
    goToPage: setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    viewTarget,
    setViewTarget,
  };
}

export type PurchaseRecommendTabState = ReturnType<typeof usePurchaseRecommendTab>;
