'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useTrackingFilters } from './useTrackingFilters';
import type { TrackingRow, BulkRegisterModalState, StoreOption } from '../types';

export function useTrackingPage() {
  const filters = useTrackingFilters();
  const { queryString, setPagination } = filters;

  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<BulkRegisterModalState | null>(null);
  const [refresh, setRefresh] = useState(0);
  const countDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpRefresh = useCallback(() => setRefresh((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchRows() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/tracking?${queryString}`);
        const json = await res.json() as {
          success: boolean;
          message: string;
          data: { rows: TrackingRow[]; total: number; totalPages: number; stores: StoreOption[] };
        };
        if (cancelled) return;
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load');
        setRows(json.data.rows);
        setStores(json.data.stores);
        setPagination((prev) => ({
          ...prev,
          total: json.data.total,
          totalPages: json.data.totalPages,
          hasPrev: prev.page > 1,
          hasNext: prev.page < json.data.totalPages,
        }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tracking records');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchRows();
    return () => { cancelled = true; };
  }, [queryString, refresh, setPagination]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchBulkCount = useCallback(async (modal: BulkRegisterModalState) => {
    setBulkModal((prev) => prev ? { ...prev, loading: true, error: '' } : null);
    try {
      const params = new URLSearchParams();
      if (modal.dateFrom) params.set('dateFrom', modal.dateFrom);
      if (modal.dateTo) params.set('dateTo', modal.dateTo);
      modal.storeIds.forEach((id) => params.append('storeId', id));
      const res = await fetch(`/api/tracking/bulk?${params.toString()}`);
      const json = await res.json() as { success: boolean; message: string; data: { count: number } };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load count');
      setBulkModal((prev) => prev ? { ...prev, count: json.data.count, loading: false } : null);
    } catch (err) {
      setBulkModal((prev) => prev ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed' } : null);
    }
  }, []);

  const openBulkModal = useCallback(async () => {
    const now = new Date();
    const initialModal: BulkRegisterModalState = {
      count: null,
      loading: true,
      submitting: false,
      error: '',
      dateFrom: '',
      dateTo: '',
      storeIds: stores.map((s) => s.id),
      calendarNav: { year: now.getFullYear(), month: now.getMonth() },
      hoverDate: null,
      storeDropdownOpen: false,
    };
    setBulkModal(initialModal);
    await fetchBulkCount(initialModal);
  }, [stores, fetchBulkCount]);

  const handleBulkDateClick = (date: string) => {
    if (!bulkModal) return;
    let next: BulkRegisterModalState;
    if (!bulkModal.dateFrom || (bulkModal.dateFrom && bulkModal.dateTo)) {
      next = { ...bulkModal, dateFrom: date, dateTo: '', hoverDate: null };
    } else {
      const [start, end] = date >= bulkModal.dateFrom ? [bulkModal.dateFrom, date] : [date, bulkModal.dateFrom];
      next = { ...bulkModal, dateFrom: start, dateTo: end, hoverDate: null };
    }
    setBulkModal(next);
    if (countDebounceRef.current) clearTimeout(countDebounceRef.current);
    countDebounceRef.current = setTimeout(() => { void fetchBulkCount(next); }, 400);
  };

  const handleBulkStoreToggle = (id: string) => {
    if (!bulkModal) return;
    const storeIds = bulkModal.storeIds.includes(id)
      ? bulkModal.storeIds.filter((s) => s !== id)
      : [...bulkModal.storeIds, id];
    const next = { ...bulkModal, storeIds };
    setBulkModal(next);
    if (countDebounceRef.current) clearTimeout(countDebounceRef.current);
    countDebounceRef.current = setTimeout(() => { void fetchBulkCount(next); }, 400);
  };

  const handleBulkNavPrev = () => {
    setBulkModal((prev) => {
      if (!prev) return null;
      const d = new Date(prev.calendarNav.year, prev.calendarNav.month - 1, 1);
      return { ...prev, calendarNav: { year: d.getFullYear(), month: d.getMonth() } };
    });
  };

  const handleBulkNavNext = () => {
    setBulkModal((prev) => {
      if (!prev) return null;
      const d = new Date(prev.calendarNav.year, prev.calendarNav.month + 1, 1);
      return { ...prev, calendarNav: { year: d.getFullYear(), month: d.getMonth() } };
    });
  };

  const handleBulkClearDates = () => {
    if (!bulkModal) return;
    const next = { ...bulkModal, dateFrom: '', dateTo: '', hoverDate: null };
    setBulkModal(next);
    if (countDebounceRef.current) clearTimeout(countDebounceRef.current);
    countDebounceRef.current = setTimeout(() => { void fetchBulkCount(next); }, 400);
  };

  const submitBulkRegister = async () => {
    if (!bulkModal) return;
    setBulkModal((prev) => prev ? { ...prev, submitting: true, error: '' } : null);
    try {
      const res = await fetch('/api/tracking/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom: bulkModal.dateFrom || undefined,
          dateTo: bulkModal.dateTo || undefined,
          storeIds: bulkModal.storeIds,
        }),
      });
      const json = await res.json() as { success: boolean; message: string };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed');
      toast.success(json.message || 'Bulk registration queued');
      setBulkModal(null);
      bumpRefresh();
    } catch (err) {
      setBulkModal((prev) => prev ? { ...prev, submitting: false, error: err instanceof Error ? err.message : 'Failed' } : null);
    }
  };

  const closeBulkModal = () => setBulkModal(null);

  return {
    ...filters,
    rows, loading, error,
    stores,
    expandedIds, toggleExpand,
    bulkModal, openBulkModal, closeBulkModal, submitBulkRegister,
    handleBulkDateClick, handleBulkStoreToggle,
    handleBulkNavPrev, handleBulkNavNext, handleBulkClearDates,
    setBulkModal,
    bumpRefresh,
  };
}
