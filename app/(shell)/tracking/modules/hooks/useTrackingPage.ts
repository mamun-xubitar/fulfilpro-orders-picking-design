'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import type { TrackingRow, Pagination, BulkRegisterModalState } from '../types';

const PAGE_SIZE = 30;

const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

export function useTrackingPage() {
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<BulkRegisterModalState | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refresh, setRefresh] = useState(0);

  const bumpRefresh = useCallback(() => setRefresh((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchRows() {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(PAGE_SIZE));
        if (search) params.set('search', search);

        const res = await fetch(`/api/tracking?${params.toString()}`);
        const json = await res.json() as { success: boolean; message: string; data: { rows: TrackingRow[]; total: number; totalPages: number } };
        if (cancelled) return;
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load');
        setRows(json.data.rows);
        setPagination({
          page,
          pageSize: PAGE_SIZE,
          total: json.data.total,
          totalPages: json.data.totalPages,
          hasPrev: page > 1,
          hasNext: page < json.data.totalPages,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tracking records');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchRows();
    return () => { cancelled = true; };
  }, [page, search, refresh]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBulkModal = async () => {
    setBulkModal({ count: null, loading: true, submitting: false, error: '' });
    try {
      const res = await fetch('/api/tracking/bulk');
      const json = await res.json() as { success: boolean; message: string; data: { count: number } };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load count');
      setBulkModal((prev) => prev ? { ...prev, count: json.data.count, loading: false } : null);
    } catch (err) {
      setBulkModal((prev) => prev ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed' } : null);
    }
  };

  const submitBulkRegister = async () => {
    if (!bulkModal) return;
    setBulkModal((prev) => prev ? { ...prev, submitting: true, error: '' } : null);
    try {
      const res = await fetch('/api/tracking/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
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
    rows, loading, error,
    pagination, page, setPage,
    searchInput, handleSearchChange,
    expandedIds, toggleExpand,
    bulkModal, openBulkModal, closeBulkModal, submitBulkRegister,
    bumpRefresh,
  };
}
