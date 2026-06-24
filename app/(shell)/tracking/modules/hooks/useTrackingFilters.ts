'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Pagination } from '../types';
import { PERIODS } from '../constants';

const PAGE_SIZE = 30;
const DEFAULT_PAGINATION: Pagination = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

export function useTrackingFilters() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [calendarNav, setCalendarNav] = useState<{ year: number; month: number }>(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);

  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
  };

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(pagination.page));
    params.set('pageSize', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (period !== 'custom') params.set('period', period);
    storeIds.forEach((id) => params.append('storeId', id));
    statuses.forEach((s) => params.append('status', s));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString();
  }, [pagination.page, search, period, storeIds, statuses, dateFrom, dateTo]);

  const handleStoreToggle = (id: string) => {
    setStoreIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusToggle = (status: string) => {
    setStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePeriodChange = (value: (typeof PERIODS)[number]['value']) => {
    setPeriod(value);
    if (value !== 'custom') {
      setDateFrom('');
      setDateTo('');
      setHoverDate(null);
      setPeriodDropdownOpen(false);
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCalendarDateClick = (date: string) => {
    if (!dateFrom || (dateFrom && dateTo)) {
      setDateFrom(date);
      setDateTo('');
      setHoverDate(null);
      setPeriod('custom');
      setPagination((prev) => ({ ...prev, page: 1 }));
    } else {
      const [start, end] = date >= dateFrom ? [dateFrom, date] : [date, dateFrom];
      setDateFrom(start);
      setDateTo(end);
      setHoverDate(null);
      setPeriodDropdownOpen(false);
      setPeriod('custom');
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStoreIds([]);
    setStatuses([]);
    setPeriod('all');
    setDateFrom('');
    setDateTo('');
    setHoverDate(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setPeriodDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = searchInput !== '' || storeIds.length > 0 || period !== 'all' || !!dateFrom || !!dateTo || statuses.length > 0;

  return {
    queryString,
    searchInput, handleSearchChange,
    storeIds, storeDropdownOpen, setStoreDropdownOpen, storeDropdownRef, handleStoreToggle,
    statuses, statusDropdownOpen, setStatusDropdownOpen, statusDropdownRef, handleStatusToggle,
    period, setPeriod, dateFrom, setDateFrom, dateTo, setDateTo, hoverDate, setHoverDate,
    periodDropdownOpen, setPeriodDropdownOpen, periodDropdownRef,
    calendarNav, setCalendarNav,
    handlePeriodChange, handleCalendarDateClick,
    hasActiveFilters, handleClearFilters,
    pagination, setPagination, goToPage,
  };
}
