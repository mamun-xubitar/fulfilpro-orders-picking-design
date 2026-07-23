'use client';

import { useEffect, useRef, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { DEFAULT_PAGINATION } from '../constants';

export function useInventoryFilters() {
  const { searchInput, setSearchInput, search } = useDebouncedSearch('', 350);
  const [searchField, setSearchField] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<string[]>([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const [stockLevel, setStockLevel] = useState('');
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);
  const stockDropdownRef = useRef<HTMLDivElement>(null);

  const [sort, setSort] = useState('title');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const { pagination, setPagination, pageNumbers, goToPage } = usePagination(DEFAULT_PAGINATION);

  // Reset to page 1 whenever any filter or sort changes.
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, searchField, storeIds, status, stockLevel, sort, dir, setPagination]);

  const queryString = buildQueryString({ pagination, search, searchField, storeIds, status, stockLevel, sort, dir });

  const handleStoreToggle = (id: string) => {
    if (id === '__clear__') {
      setStoreIds([]);
      return;
    }
    setStoreIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleStatusToggle = (value: string) => {
    setStatus((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]));
  };

  const handleStockLevelChange = (value: string) => {
    setStockLevel(value);
    setStockDropdownOpen(false);
  };

  const handleSortChange = (key: string) => {
    if (sort === key) {
      setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setDir('asc');
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchField('');
    setStoreIds([]);
    setStatus([]);
    setStockLevel('');
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) setSearchDropdownOpen(false);
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) setStoreDropdownOpen(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setStatusDropdownOpen(false);
      if (stockDropdownRef.current && !stockDropdownRef.current.contains(e.target as Node)) setStockDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = searchInput !== '' || searchField !== '' || storeIds.length > 0 || status.length > 0 || stockLevel !== '';

  return {
    queryString,
    search,
    pagination,
    setPagination,
    pageNumbers,
    goToPage,
    searchInput,
    setSearchInput,
    searchField,
    setSearchField,
    searchDropdownOpen,
    setSearchDropdownOpen,
    searchDropdownRef,
    storeIds,
    setStoreIds,
    storeDropdownOpen,
    setStoreDropdownOpen,
    storeDropdownRef,
    handleStoreToggle,
    status,
    statusDropdownOpen,
    setStatusDropdownOpen,
    statusDropdownRef,
    handleStatusToggle,
    stockLevel,
    stockDropdownOpen,
    setStockDropdownOpen,
    stockDropdownRef,
    handleStockLevelChange,
    sort,
    dir,
    handleSortChange,
    hasActiveFilters,
    handleClearFilters,
  };
}

function buildQueryString(params: {
  pagination: { page: number; pageSize: number };
  search: string;
  searchField: string;
  storeIds: string[];
  status: string[];
  stockLevel: string;
  sort: string;
  dir: 'asc' | 'desc';
}) {
  const { pagination, search, searchField, storeIds, status, stockLevel, sort, dir } = params;
  const query = new URLSearchParams();
  query.set('page', String(pagination.page));
  query.set('pageSize', String(pagination.pageSize));
  if (search) query.set('search', search);
  if (searchField) query.set('searchField', searchField);
  storeIds.forEach((id) => query.append('storeId', id));
  status.forEach((s) => query.append('status', s));
  if (stockLevel) query.set('stockLevel', stockLevel);
  query.set('sort', sort);
  query.set('dir', dir);
  return query.toString();
}
