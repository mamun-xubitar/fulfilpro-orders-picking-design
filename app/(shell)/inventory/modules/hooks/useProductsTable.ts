'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { buildPageNumbers } from '@/hooks/usePagination';
import type { CataloguePagination, ProductRecord, ProductStatusValue, ProductsResponse, QuickFilterId } from '../types';

export type ProductsSortKey = 'name' | 'brand' | 'category' | 'sku' | 'status' | 'variants' | 'stock' | 'stockValue' | 'createdAt';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const EMPTY_PAGINATION: CataloguePagination = { page: 1, pageSize: PAGE_SIZE_OPTIONS[0], total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type DeleteTarget = { kind: 'selection' } | { kind: 'single'; id: string; name: string };
type ApiEnvelope<T> = { success: boolean; message: string; data?: T; errors?: string[] };

type UseProductsTableArgs = {
  /** Only fetches while "All records" is on — the record stepper (useCatalogData) owns the
   * detail-mode fetch the rest of the time. */
  enabled: boolean;
  verifiedOnly: boolean;
  quickFilter: QuickFilterId | null;
  onView: (id: string) => void;
  /** Patches the record stepper's "n / X of Y" counts from this table's own fetch response —
   * called after every load, so a delete/bulk-action/import here keeps the stepper live even
   * though its own fetch is skipped while "All records" is on. */
  onCounts?: (counts: { totalAll: number; filteredCount: number }) => void;
  /** Fired after a product is actually deleted (single or bulk) — deleting a product drops its
   * SupplierProductSupplier links, so the Suppliers tab's Products Count needs to refetch. */
  onDeleted?: () => void;
};

export function totalStockOf(p: ProductRecord): number {
  return p.variants.reduce((sum, v) => sum + v.stockOnHand, 0);
}

export function availableStockOf(p: ProductRecord): number {
  return p.variants.reduce((sum, v) => sum + (v.stockOnHand - v.allocated), 0);
}

export function stockValueOf(p: ProductRecord): number {
  return p.variants.reduce((sum, v) => sum + v.stockOnHand * v.sellPrice, 0);
}

export function useProductsTable({ enabled, verifiedOnly, quickFilter, onView, onCounts, onDeleted }: UseProductsTableArgs) {
  const [rows, setRows] = useState<ProductRecord[]>([]);
  const [pagination, setPagination] = useState<CataloguePagination>(EMPTY_PAGINATION);
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([]);
  // Named distinctly from the exposed `loading` below — see useCatalogData's `fetching` for why.
  const [fetching, setFetching] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE_OPTIONS[0]);

  // Every filter/sort/page-size setter resets to page 1 inline — mirrors how
  // useOrdersFilters resets its own pagination, instead of a useEffect side effect.
  const [search, setSearchState] = useState('');
  const setSearch = (value: string) => {
    setSearchState(value);
    setPage(1);
  };
  const [status, setStatusState] = useState<ProductStatusValue | ''>('');
  const setStatus = (value: ProductStatusValue | '') => {
    setStatusState(value);
    setPage(1);
  };
  const [supplierId, setSupplierIdState] = useState('');
  const setSupplierId = (value: string) => {
    setSupplierIdState(value);
    setPage(1);
  };
  const [sort, setSortState] = useState<ProductsSortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllFilters, setSelectAllFilters] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteTarget | null>(null);
  const [statusModal, setStatusModal] = useState<ProductStatusValue | null>(null);

  const hasActiveFilters = search.trim() !== '' || status !== '' || supplierId !== '';
  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setSupplierId('');
  };

  const buildParams = (overrides?: { page?: number; pageSize?: number }) => {
    const params = new URLSearchParams({
      mode: 'table',
      page: String(overrides?.page ?? page),
      pageSize: String(overrides?.pageSize ?? pageSize),
      sort,
      dir,
    });
    // Unchecked "Verified" means no constraint at all — only send the param when active.
    if (verifiedOnly) params.set('verified', '1');
    if (quickFilter) params.set('quickFilter', quickFilter);
    if (search.trim()) params.set('search', search.trim());
    if (status) params.set('status', status);
    if (supplierId) params.set('supplier', supplierId);
    return params;
  };

  useEffect(() => {
    abortRef.current?.abort();
    if (!enabled) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setFetching(true);

    fetch(`/api/inventory/catalog?${buildParams().toString()}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<ApiEnvelope<ProductsResponse>>)
      .then((json) => {
        if (!json.success || !json.data) throw new Error(json.message || 'Failed to load products');
        setRows(json.data.products);
        setPagination(json.data.pagination);
        setSupplierOptions(json.data.supplierOptions);
        setLoaded(true);
        if (json.data.stepperTotal !== undefined) {
          onCounts?.({ totalAll: json.data.totalAll, filteredCount: json.data.stepperTotal });
        }
        // A delete can empty out the last page the client was sitting on — model.list offsets
        // from this unclamped client page, so snap to the server's own (clamped) page rather than
        // leaving the table permanently empty.
        if (json.data.products.length === 0 && json.data.pagination.total > 0 && page !== json.data.pagination.page) {
          setPage(json.data.pagination.page);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        toast.error(err instanceof Error ? err.message : 'Failed to load products');
      })
      .finally(() => {
        if (abortRef.current === controller) setFetching(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, verifiedOnly, quickFilter, search, status, supplierId, sort, dir, page, pageSize, refreshTick]);

  const refresh = () => setRefreshTick((n) => n + 1);
  const pageNumbers = buildPageNumbers(pagination.page, pagination.totalPages);
  // Derived, not stored: reads false immediately once "All records" flips off, without waiting
  // for the (skipped) fetch effect to reset it.
  const loading = fetching && enabled;

  const handleSortChange = (key: ProductsSortKey) => {
    if (sort === key) {
      setDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortState(key);
      setDir('asc');
    }
    setPage(1);
  };

  const isCurrentPageAllSelected = rows.length > 0 && rows.every((p) => selectedIds.includes(p.id));

  const toggleSelect = (id: string) => {
    setSelectAllFilters(false);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAllOnPage = () => {
    setSelectAllFilters(false);
    setSelectedIds((prev) => (isCurrentPageAllSelected ? prev.filter((id) => !rows.some((p) => p.id === id)) : [...new Set([...prev, ...rows.map((p) => p.id)])]));
  };

  const toggleSelectAllFilters = () => {
    setSelectAllFilters((prev) => !prev);
    setSelectedIds([]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectAllFilters(false);
  };

  /** Resolves the target id set server-side when "select all matching filters" is on, instead
   * of assuming the client already has every matching id (it only ever holds one page). */
  const targetIds = async (): Promise<string[]> => {
    if (!selectAllFilters) return selectedIds;
    const params = buildParams();
    params.set('mode', 'ids');
    const res = await fetch(`/api/inventory/catalog?${params.toString()}`);
    const json = (await res.json()) as ApiEnvelope<{ ids: string[] }>;
    if (!res.ok || !json.success || !json.data) throw new Error(json.message || 'Failed to resolve selection');
    return json.data.ids;
  };

  const runBulk = async (body: Record<string, unknown>) => {
    setBulkRunning(true);
    try {
      const ids = await targetIds();
      const res = await fetch('/api/inventory/catalog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, productIds: ids }),
      });
      const json = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !json.success) throw new Error(json.message || 'Bulk action failed');
      toast.success(json.message);
      clearSelection();
      if (body.action === 'delete') onDeleted?.();
      // Re-fetches rather than patching in place — a bulk status/verified change can move rows
      // out of the current filter set entirely (e.g. unverifying while "Verified" is checked).
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed');
    } finally {
      setBulkRunning(false);
    }
  };

  const runSingleDelete = async (id: string) => {
    setBulkRunning(true);
    try {
      const res = await fetch(`/api/inventory/catalog/${id}`, { method: 'DELETE' });
      const json = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete product');
      toast.success('Product deleted');
      // Otherwise a deleted row stays "selected" forever — the bar keeps counting it, and the
      // next bulk action would re-post its (now nonexistent) id.
      setSelectedIds((prev) => prev.filter((s) => s !== id));
      onDeleted?.();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setBulkRunning(false);
      setDeleteConfirm(null);
    }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.kind === 'single') {
      void runSingleDelete(deleteConfirm.id);
      return;
    }
    setDeleteConfirm(null);
    void runBulk({ action: 'delete' });
  };

  const applyStatus = (value: ProductStatusValue) => {
    setStatusModal(null);
    void runBulk({ action: 'set_status', status: value });
  };

  const setVerified = (verified: boolean) => void runBulk({ action: 'set_verified', verified });

  return {
    search,
    setSearch,
    status,
    setStatus,
    supplierId,
    setSupplierId,
    supplierOptions,
    hasActiveFilters,
    handleClearFilters,
    sort,
    dir,
    handleSortChange,
    products: rows,
    loading,
    initialLoading: loading && !loaded,
    pagination,
    pageNumbers,
    goToPage: setPage,
    pageSize,
    setPageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    selectedIds,
    selectAllFilters,
    isCurrentPageAllSelected,
    toggleSelect,
    toggleSelectAllOnPage,
    toggleSelectAllFilters,
    clearSelection,
    bulkRunning,
    deleteConfirm,
    setDeleteConfirm,
    confirmDelete,
    statusModal,
    setStatusModal,
    applyStatus,
    setVerified,
    onView,
    refresh,
  };
}
