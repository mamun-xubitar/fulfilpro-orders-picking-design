import { useEffect, useMemo, useRef, useState } from 'react';
import type { Pagination } from '../types';
import { DEFAULT_PAGINATION, PERIODS } from '../constants';
import type { PaginationItem } from '../utils';

export type OrderQueueKey = 'all' | 'open' | 'slip_not_printed' | 'slip_printed' | 'not_packed' | 'partial' | 'packed' | 'shipped' | 'issues';
/** Tabs whose meaning already fixes the packing status, so the Packed filter is cleared when one is picked. */
const PACKING_QUEUES: OrderQueueKey[] = ['not_packed', 'partial', 'packed'];
/** What an order picker sees until they change the filters (as the old Picking List). */
export const PICKER_DEFAULT_PACKING = ['not_packed', 'partially_packed'];

export function useOrdersFilters({ userIsDecorator, userIsPicker = false, decorationView = false }: { userIsDecorator: boolean; userIsPicker?: boolean; decorationView?: boolean }) {
  const getInitialSearch = () => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('search')?.trim() ?? '';
  };
  const initialSearch = getInitialSearch();
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [searchField, setSearchField] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fulfillmentStatuses, setFulfillmentStatuses] = useState<string[]>([]);
  const [packingStatuses, setPackingStatuses] = useState<string[]>([]);
  const [printStatuses, setPrintStatuses] = useState<string[]>([]);
  const [queue, setQueueState] = useState<OrderQueueKey>('all');
  const [printStatusDropdownOpen, setPrintStatusDropdownOpen] = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [packingStatusDropdownOpen, setPackingStatusDropdownOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [calendarNav, setCalendarNav] = useState<{ year: number; month: number }>(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('all');
  const [sort, setSort] = useState<'number' | 'customer' | 'orderedAt' | null>(null);
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);
  const [syncStoreDropdownOpen, setSyncStoreDropdownOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const packingStatusDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const syncStoreDropdownRef = useRef<HTMLDivElement>(null);
  const decoratorDefaultApplied = useRef(false);
  const printStatusDropdownRef = useRef<HTMLDivElement>(null);
  const pickerDefaultApplied = useRef(false);

  useEffect(() => {
    if (userIsDecorator && !decoratorDefaultApplied.current) {
      decoratorDefaultApplied.current = true;
      setFulfillmentStatuses(['unfulfilled', 'partial']);
    }
  }, [userIsDecorator]);

  useEffect(() => {
    if (userIsPicker && !pickerDefaultApplied.current) {
      pickerDefaultApplied.current = true;
      setPackingStatuses(PICKER_DEFAULT_PACKING);
      setQueueState('open');
    }
  }, [userIsPicker]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(pagination.page));
    params.set('pageSize', String(pagination.pageSize));
    params.set('period', period === 'custom' ? 'all' : period);
    if (search) params.set('search', search);
    if (searchField) params.set('searchField', searchField);
    storeIds.forEach((id) => params.append('storeId', id));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    fulfillmentStatuses.forEach((s) => params.append('status', s));
    packingStatuses.forEach((s) => params.append('packingStatus', s));
    printStatuses.forEach((s) => params.append('printStatus', s));
    if (queue !== 'all') params.set('queue', queue);
    if (decorationView) params.set('decorationView', '1');
    if (sort) {
      params.set('sort', sort);
      params.set('dir', dir);
    }
    return params.toString();
  }, [pagination.page, pagination.pageSize, period, search, searchField, storeIds, dateFrom, dateTo, fulfillmentStatuses, packingStatuses, printStatuses, queue, decorationView, sort, dir]);

  const handleSortChange = (key: 'number' | 'customer' | 'orderedAt') => {
    if (sort === key) {
      setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setDir('asc');
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const setSortBy = (key: 'number' | 'customer' | 'orderedAt' | null, direction: 'asc' | 'desc') => {
    setSort(key);
    setDir(direction);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStoreToggle = (id: string) => {
    setStoreIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
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

  const handleStatusToggle = (status: string) => {
    setFulfillmentStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePackingStatusToggle = (status: string) => {
    if (status === '__clear__') {
      setPackingStatuses([]);
    } else {
      setPackingStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePrintStatusToggle = (status: string) => {
    if (status === '__clear__') {
      setPrintStatuses([]);
    } else {
      setPrintStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const setQueue = (next: OrderQueueKey) => {
    setQueueState(next);
    if (PACKING_QUEUES.includes(next)) setPackingStatuses([]);
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
    setSearchField('');
    setStoreIds([]);
    setPeriod('all');
    setDateFrom('');
    setDateTo('');
    setHoverDate(null);
    setFulfillmentStatuses([]);
    setPackingStatuses(userIsPicker ? PICKER_DEFAULT_PACKING : []);
    setPrintStatuses([]);
    setQueueState(userIsPicker ? 'open' : 'all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const pageNumbers = useMemo<PaginationItem[]>(() => {
    const total = pagination.totalPages;
    if (total <= 5) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (pagination.page <= 2) {
      return [1, 2, 3, 'ellipsis', total];
    }

    if (pagination.page >= total - 1) {
      return [1, 'ellipsis', total - 2, total - 1, total];
    }

    return [1, 'ellipsis', pagination.page - 1, pagination.page, pagination.page + 1, 'ellipsis', total];
  }, [pagination.page, pagination.totalPages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(e.target as Node)) {
        setPeriodDropdownOpen(false);
      }
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (packingStatusDropdownRef.current && !packingStatusDropdownRef.current.contains(e.target as Node)) {
        setPackingStatusDropdownOpen(false);
      }
      if (syncStoreDropdownRef.current && !syncStoreDropdownRef.current.contains(e.target as Node)) {
        setSyncStoreDropdownOpen(false);
      }
      if (printStatusDropdownRef.current && !printStatusDropdownRef.current.contains(e.target as Node)) {
        setPrintStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultPacking = userIsPicker ? PICKER_DEFAULT_PACKING : [];
  const packingIsDefault = packingStatuses.length === defaultPacking.length && defaultPacking.every((s) => packingStatuses.includes(s));
  const hasActiveFilters = searchInput !== '' || searchField !== '' || storeIds.length > 0 || period !== 'all' || !!dateFrom || !!dateTo || fulfillmentStatuses.length > 0 || !packingIsDefault || printStatuses.length > 0;

  return {
    queryString,
    search,
    pagination,
    setPagination,
    searchInput, setSearchInput, searchField, setSearchField,
    searchDropdownOpen, setSearchDropdownOpen, searchDropdownRef,
    storeIds, setStoreIds, storeDropdownOpen, setStoreDropdownOpen, storeDropdownRef,
    dateFrom, setDateFrom, dateTo, setDateTo, hoverDate, setHoverDate,
    fulfillmentStatuses, setFulfillmentStatuses, statusDropdownOpen, setStatusDropdownOpen, statusDropdownRef,
    packingStatuses, packingStatusDropdownOpen, setPackingStatusDropdownOpen, packingStatusDropdownRef,
    handlePackingStatusToggle, handleStoreToggle, handleStatusToggle,
    printStatuses, handlePrintStatusToggle, printStatusDropdownOpen, setPrintStatusDropdownOpen, printStatusDropdownRef,
    queue, setQueue,
    period, setPeriod, periodDropdownOpen, setPeriodDropdownOpen, periodDropdownRef,
    calendarNav, setCalendarNav, handlePeriodChange, handleCalendarDateClick,
    sort, dir, handleSortChange, setSortBy,
    hasActiveFilters, handleClearFilters,
    pageNumbers, goToPage,
    syncStoreDropdownOpen, setSyncStoreDropdownOpen, syncStoreDropdownRef,
  };
}
