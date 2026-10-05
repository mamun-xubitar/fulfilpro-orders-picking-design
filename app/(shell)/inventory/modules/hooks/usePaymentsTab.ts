'use client';

import { useEffect, useRef, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import type { PoPaymentListRecord, PoPaymentStatusValue } from '../types';

export type PaymentSortKey = 'updatedAt' | 'paidAt' | 'totalAud' | 'status' | 'poNumber' | 'supplierName' | 'productTitle';

export const PAYMENT_PAGE_SIZE_OPTIONS = [20, 50, 100];
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type Filters = { supplierId: string; status: '' | PoPaymentStatusValue; dateFrom: string; dateTo: string };
const NO_FILTERS: Filters = { supplierId: '', status: '', dateFrom: '', dateTo: '' };

type Args = {
  enabled: boolean;
  /** Bumped by the page after a payment is saved. */
  refreshKey: number;
};

/** The Payments tab: one row per purchase order that has a payment — search, filters, sorting and
 * paging. Editing a payment and its history open shared / local modals; this hook only lists. */
export function usePaymentsTab({ enabled, refreshKey }: Args) {
  const [rows, setRows] = useState<PoPaymentListRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  const { request, loading } = useRequest<{ payments: PoPaymentListRecord[]; pagination: PaginationState }>();

  const [searchInput, setSearchInputState] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<PaymentSortKey>('updatedAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(PAYMENT_PAGE_SIZE_OPTIONS[0]);
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
  /** Reset everything, then narrow to one supplier — the Suppliers tab's payment-count link. */
  const focusSupplier = (supplierId: string) => {
    setFilters({ ...NO_FILTERS, supplierId });
    setSearchInputState('');
    setSearch('');
    setPage(1);
  };
  const changeSort = (key: PaymentSortKey) => {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir(key === 'updatedAt' || key === 'paidAt' || key === 'totalAud' || key === 'poNumber' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const load = () => {
    if (!enabled) return;
    request({
      url: '/api/inventory/payments',
      method: 'GET',
      showToast: false,
      data: { search, ...filters, sort, dir, page, pageSize },
      onSuccess: ({ data }) => {
        setRows(data.payments);
        setPagination(data.pagination);
        setInitialLoading(false);
      },
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [enabled, search, filters, sort, dir, page, pageSize, refreshKey]);

  const [historyTarget, setHistoryTarget] = useState<PoPaymentListRecord | null>(null);

  return {
    rows,
    pagination,
    pageNumbers: buildPageNumbers(pagination.page, pagination.totalPages),
    loading,
    initialLoading,
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    clearFilters,
    focusSupplier,
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
    historyTarget,
    setHistoryTarget,
  };
}

export type PaymentsTabState = ReturnType<typeof usePaymentsTab>;
