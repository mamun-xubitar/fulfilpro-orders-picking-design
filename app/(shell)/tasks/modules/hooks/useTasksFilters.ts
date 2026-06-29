'use client';

import { useState, useCallback } from 'react';
import type { TaskStateFilter } from '../types';
import { DEFAULT_PAGE_SIZE } from '../constants';

export function useTasksFilters() {
  const [tab, setTabRaw] = useState<TaskStateFilter>('all');
  const [search, setSearch] = useState('');
  const [filterAssigneeId, setFilterAssigneeId] = useState('');
  const [page, setPage] = useState(1);

  const setTab = useCallback((t: TaskStateFilter) => {
    setTabRaw(t);
    setPage(1);
  }, []);

  const setSearchAndReset = useCallback((s: string) => {
    setSearch(s);
    setPage(1);
  }, []);

  const setAssigneeAndReset = useCallback((id: string) => {
    setFilterAssigneeId(id);
    setPage(1);
  }, []);

  function buildQueryString(extra?: Record<string, string>) {
    const params = new URLSearchParams({ state: tab, page: String(page), pageSize: String(DEFAULT_PAGE_SIZE) });
    if (search) params.set('search', search);
    if (filterAssigneeId) params.set('assigneeId', filterAssigneeId);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  }

  function buildCountQueryString() {
    const params = new URLSearchParams();
    if (filterAssigneeId) params.set('assigneeId', filterAssigneeId);
    return params.toString();
  }

  return {
    tab,
    setTab,
    search,
    setSearch: setSearchAndReset,
    filterAssigneeId,
    setFilterAssigneeId: setAssigneeAndReset,
    page,
    setPage,
    buildQueryString,
    buildCountQueryString,
  };
}
