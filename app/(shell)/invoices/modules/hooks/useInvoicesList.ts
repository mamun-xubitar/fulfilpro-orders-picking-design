'use client';

import { useCallback, useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePagination, type PaginationState } from '@/hooks/usePagination';
import type { InvoiceListRow } from '@/components/invoices/invoiceForm';

export type InvoiceSortKey = 'invoiceNumber' | 'issueDate' | 'billToName' | 'total' | 'balance' | 'paymentStatus';

const INITIAL_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

/** Search, sort, store / status filters and pagination for the invoices list, plus its fetch. */
export function useInvoicesList() {
  const [rows, setRows] = useState<InvoiceListRow[]>([]);
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<InvoiceSortKey>('issueDate');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [refreshKey, setRefreshKey] = useState(0);
  const { searchInput, setSearchInput, search } = useDebouncedSearch();
  const { pagination, setPagination, pageNumbers, goToPage } = usePagination(INITIAL_PAGINATION);
  const { request, loading } = useRequest<{ invoices: InvoiceListRow[]; pagination: PaginationState }>();
  const { page, pageSize } = pagination;

  useEffect(() => {
    void request({
      url: '/api/invoices',
      method: 'GET',
      showToast: false,
      data: { search, page, pageSize, sort, dir, ...(storeId ? { storeId } : {}), ...(status ? { status } : {}) },
      onSuccess: ({ data }) => {
        setRows(data.invoices);
        setPagination(data.pagination);
      },
    });
  }, [request, search, page, pageSize, sort, dir, storeId, status, refreshKey, setPagination]);

  const resetPage = () => goToPage(1);

  return {
    rows,
    loading,
    search,
    searchInput,
    setSearchInput: (value: string) => {
      setSearchInput(value);
      resetPage();
    },
    storeId,
    setStoreId: (value: string) => {
      setStoreId(value);
      resetPage();
    },
    status,
    setStatus: (value: string) => {
      setStatus(value);
      resetPage();
    },
    sort,
    dir,
    changeSort: (key: InvoiceSortKey) => {
      if (key === sort) setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      else {
        setSort(key);
        setDir('asc');
      }
      resetPage();
    },
    pagination,
    pageNumbers,
    goToPage,
    setPageSize: (size: number) => setPagination((prev) => ({ ...prev, pageSize: size, page: 1 })),
    refresh: useCallback(() => setRefreshKey((key) => key + 1), []),
  };
}
