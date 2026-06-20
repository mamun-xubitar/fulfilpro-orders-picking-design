'use client';

import { useEffect, useState } from 'react';

export function useDebouncedSearch(initialValue = '', delay = 350) {
  const [searchInput, setSearchInput] = useState(initialValue);
  const [search, setSearch] = useState(initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), delay);
    return () => window.clearTimeout(timer);
  }, [searchInput, delay]);

  return { searchInput, setSearchInput, search, setSearch };
}
