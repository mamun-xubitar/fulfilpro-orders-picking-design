'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import type { InventoryActivityRecord } from '../types';

export type HistorySortKey = 'createdAt' | 'productName' | 'type' | 'actorName';

export const HISTORY_PAGE_SIZE_OPTIONS = [20, 50, 100];
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type Filters = { type: string; dateFrom: string; dateTo: string };
const NO_FILTERS: Filters = { type: '', dateFrom: '', dateTo: '' };

type Args = {
  /** Only fetch while the tab is on screen. */
  enabled: boolean;
};

/** The History tab: every product's activity log — search, type / date filters, sorting and paging. */
export function useHistoryTab({ enabled }: Args) {
  const [rows, setRows] = useState<InventoryActivityRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  // Which query `rows` belong to — a refetch of the same query keeps showing them instead of a skeleton.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { request: requestList, loading } = useRequest<{ activities: InventoryActivityRecord[]; pagination: PaginationState }>();

  const [searchInput, setSearchInputState] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<HistorySortKey>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(HISTORY_PAGE_SIZE_OPTIONS[0]);
  const [localRefresh, setLocalRefresh] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchInput = (value: string) => {
    setSearchInputState(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setSearchInputState('');
    setSearch('');
    setPage(1);
  };
  const changeSort = (key: HistorySortKey) => {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir(key === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const queryKey = JSON.stringify({ search, ...filters, sort, dir, page, pageSize });
  const load = () => {
    if (!enabled) return;
    requestList({
      url: '/api/inventory/history',
      method: 'GET',
      showToast: false,
      data: { search, ...filters, sort, dir, page, pageSize },
      onSuccess: ({ data }) => {
        setRows(data.activities);
        setPagination(data.pagination);
        setInitialLoading(false);
        setLoadedKey(queryKey);
      },
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [enabled, search, filters, sort, dir, page, pageSize, localRefresh]);

  return {
    rows,
    pagination,
    pageNumbers: buildPageNumbers(pagination.page, pagination.totalPages),
    loading,
    initialLoading,
    showSkeleton: initialLoading || (loading && loadedKey !== queryKey),
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    clearFilters,
    hasFilters: search !== '' || Object.values(filters).some(Boolean),
    sort,
    dir,
    changeSort,
    goToPage: setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    refresh: () => setLocalRefresh((n) => n + 1),
  };
}

export type HistoryTabState = ReturnType<typeof useHistoryTab>;
