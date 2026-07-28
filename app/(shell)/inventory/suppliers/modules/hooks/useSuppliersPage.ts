'use client';

import { useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { useSuppliersData } from './useSuppliersData';
import { useSupplierMutations } from './useSupplierMutations';
import { useSupplierConnections } from './useSupplierConnections';
import { DEFAULT_PAGINATION } from '../constants';

export function useSuppliersPage() {
  const { searchInput, setSearchInput, search } = useDebouncedSearch('', 350);
  const { pagination, setPagination, pageNumbers, goToPage } = usePagination(DEFAULT_PAGINATION);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, setPagination]);

  const queryString = buildQueryString({ pagination, search });

  const data = useSuppliersData({ queryString, setPagination });
  const mutations = useSupplierMutations({ bumpRefresh: data.bumpRefresh, setSuppliers: data.setSuppliers });
  const connections = useSupplierConnections();

  const openConnections = (supplier: (typeof data.suppliers)[number]) => connections.open(supplier);

  return {
    searchInput,
    setSearchInput,
    pagination,
    pageNumbers,
    goToPage,
    ...data,
    ...mutations,
    connections,
    openConnections,
  };
}

function buildQueryString(params: { pagination: { page: number; pageSize: number }; search: string }) {
  const query = new URLSearchParams();
  query.set('page', String(params.pagination.page));
  query.set('pageSize', String(params.pagination.pageSize));
  if (params.search) query.set('search', params.search);
  return query.toString();
}
