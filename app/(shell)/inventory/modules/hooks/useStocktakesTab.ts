'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import { printStocktake } from '../stocktakePrint';
import type { StocktakeRecord, StocktakeStatusValue } from '../types';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';

export type StocktakeSortKey = 'number' | 'createdAt' | 'productName' | 'status' | 'countedAt' | 'completedAt';

export const STOCKTAKE_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type Filters = { status: '' | StocktakeStatusValue; dateFrom: string; dateTo: string };
const NO_FILTERS: Filters = { status: '', dateFrom: '', dateTo: '' };

type Args = {
  /** Only fetch while the tab is on screen. */
  enabled: boolean;
  /** Bumped by the page after a stocktake is created so the list refetches. */
  refreshKey: number;
};

/** The Stocktake tab: every product's stocktakes — search, status / date filters, sorting, paging
 * and print. Counting, syncing and cancelling go through useStocktakeDetail, which refetches this
 * list via `refresh`. */
export function useStocktakesTab({ enabled, refreshKey }: Args) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [rows, setRows] = useState<StocktakeRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  // Which query `rows` belong to — a refetch of the same query keeps showing them instead of a skeleton.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { request: requestList, loading } = useRequest<{ stocktakes: StocktakeRecord[]; pagination: PaginationState }>();

  const [searchInput, setSearchInputState] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<StocktakeSortKey>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
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
  const changeSort = (key: StocktakeSortKey) => {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir(key === 'createdAt' || key === 'number' || key === 'countedAt' || key === 'completedAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const queryKey = JSON.stringify({ search, ...filters, sort, dir, page, pageSize });
  const load = () => {
    if (!enabled) return;
    requestList({
      url: '/api/inventory/stocktakes',
      method: 'GET',
      showToast: false,
      data: { search, ...filters, sort, dir, page, pageSize },
      onSuccess: ({ data }) => {
        setRows(data.stocktakes);
        setPagination(data.pagination);
        setInitialLoading(false);
        setLoadedKey(queryKey);
      },
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [enabled, search, filters, sort, dir, page, pageSize, refreshKey, localRefresh]);

  const print = (stocktake: StocktakeRecord) => {
    printStocktake(stocktake).catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Unable to print'));
  };

  return {
    isAdmin,
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
    print,
  };
}

export type StocktakesTabState = ReturnType<typeof useStocktakesTab>;
