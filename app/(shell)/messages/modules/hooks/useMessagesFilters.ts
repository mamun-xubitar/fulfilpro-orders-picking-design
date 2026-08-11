'use client';

import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../constants';

export function useMessagesFilters() {
  const [search, setSearchRaw] = useState('');
  const [page, setPage] = useState(1);

  const setSearch = useCallback((s: string) => {
    setSearchRaw(s);
    setPage(1);
  }, []);

  function buildQueryString() {
    const params = new URLSearchParams({ page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) });
    if (search) params.set('search', search);
    return params.toString();
  }

  return { search, setSearch, page, setPage, buildQueryString };
}
