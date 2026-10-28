'use client';

import { useCallback, useEffect, useState } from 'react';
import useRequest from '@/hooks/useRequest';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { usePagination, type PaginationState } from '@/hooks/usePagination';
import type { CustomerRow, CustomerSortKey, CustomerSource, CustomersResponse } from '../types';

const INITIAL_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

/** Tab, search, sort, store filter and pagination for the customers list, plus its fetch. */
export function useCustomersList() {
  const [source, setSource] = useState<CustomerSource>('system');
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [storeId, setStoreId] = useState('');
  const [sort, setSort] = useState<CustomerSortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [refreshKey, setRefreshKey] = useState(0);
  const { searchInput, setSearchInput, search } = useDebouncedSearch();
  const { pagination, setPagination, pageNumbers, goToPage } = usePagination(INITIAL_PAGINATION);
  const { request, loading } = useRequest<CustomersResponse>();
  const { page, pageSize } = pagination;

  useEffect(() => {
    void request({
      url: '/api/customers',
      method: 'GET',
      showToast: false,
      data: { source, search, page, pageSize, sort, dir, ...(storeId ? { storeId } : {}) },
      onSuccess: ({ data }) => {
        setRows(data.customers);
        setPagination(data.pagination);
      },
    });
  }, [request, source, search, page, pageSize, sort, dir, storeId, refreshKey, setPagination]);

  const resetPage = () => goToPage(1);

  const changeSource = (next: CustomerSource) => {
    setSource(next);
    setRows([]);
    setSort('name');
    setDir('asc');
    setStoreId('');
    resetPage();
  };

  const changeSort = (key: CustomerSortKey) => {
    if (key === sort) setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir('asc');
    }
    resetPage();
  };

  return {
    source,
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
    sort,
    dir,
    pagination,
    pageNumbers,
    goToPage,
    setPageSize: (size: number) => setPagination((prev) => ({ ...prev, pageSize: size, page: 1 })),
    changeSource,
    changeSort,
    refresh: useCallback(() => setRefreshKey((key) => key + 1), []),
  };
}
