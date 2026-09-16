'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { buildPageNumbers } from '@/hooks/usePagination';
import { PAGE_SIZE_OPTIONS, useProductsFilters } from './useProductsFilters';
import type { CataloguePagination, ProductRecord, ProductStatusValue, ProductsResponse, QuickFilterId } from '../types';

export type ProductsSortKey = 'name' | 'brand' | 'category' | 'sku' | 'status' | 'variants' | 'stock' | 'stockValue' | 'createdAt';

const EMPTY_PAGINATION: CataloguePagination = { page: 1, pageSize: PAGE_SIZE_OPTIONS[0], total: 0, totalPages: 1, hasPrev: false, hasNext: false };
const EMPTY_TOTALS = { stockOnHand: 0, stockValue: 0 };

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
  const [totals, setTotals] = useState<{ stockOnHand: number; stockValue: number }>(EMPTY_TOTALS);
  const [supplierOptions, setSupplierOptions] = useState<{ id: string; name: string }[]>([]);
  // Named distinctly from the exposed `loading` below — see useCatalogData's `fetching` for why.
  const [fetching, setFetching] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const filters = useProductsFilters({ verifiedOnly, quickFilter });
  const { page, setPage, pageSize, search, status, supplierId, includeOmitted, sort, dir } = filters;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllFilters, setSelectAllFilters] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteTarget | null>(null);
  const [statusModal, setStatusModal] = useState<ProductStatusValue | null>(null);

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
    if (includeOmitted) params.set('includeOmitted', '1');
    return params;
  };

  useEffect(() => {
    abortRef.current?.abort();
    if (!enabled) return;
    const controller = new AbortController();
    abortRef.current = controller;
    // Canonical "fetching data" effect shape (see React's Effects guide) — the loading flag has
    // to flip the instant the request starts, not after it resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFetching(true);

    fetch(`/api/inventory/catalog?${buildParams().toString()}`, { signal: controller.signal })
      .then((res) => res.json() as Promise<ApiEnvelope<ProductsResponse>>)
      .then((json) => {
        if (!json.success || !json.data) throw new Error(json.message || 'Failed to load products');
        setRows(json.data.products);
        setPagination(json.data.pagination);
        setSupplierOptions(json.data.supplierOptions);
        setTotals(json.data.totals ?? EMPTY_TOTALS);
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
  }, [enabled, verifiedOnly, quickFilter, search, status, supplierId, includeOmitted, sort, dir, page, pageSize, refreshTick]);

  const refresh = () => setRefreshTick((n) => n + 1);
  const pageNumbers = buildPageNumbers(pagination.page, pagination.totalPages);
  // Derived, not stored: reads false immediately once "All records" flips off, without waiting
  // for the (skipped) fetch effect to reset it.
  const loading = fetching && enabled;

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

  /** Bulk omit/restore for the selection bar — goes through the same bulk endpoint (and its
   * "select all matching filters" resolution) as Set status / Mark verified above. */
  const bulkSetOmitted = (omitted: boolean) => void runBulk({ action: 'set_omitted', omitted });

  /** Item 19 — per-row omit switch. A direct PATCH like any other product-details field, not a
   * bulk action: omitting one product at a time doesn't need "select all matching filters". */
  const toggleOmitted = async (id: string, omitted: boolean) => {
    try {
      const res = await fetch(`/api/inventory/catalog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ omitted }),
      });
      const json = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update product');
      toast.success(omitted ? 'Product omitted' : 'Product restored');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  return {
    searchInput: filters.searchInput,
    setSearch: filters.setSearchInput,
    status,
    setStatus: filters.setStatus,
    supplierId,
    setSupplierId: filters.setSupplierId,
    includeOmitted: filters.includeOmitted,
    setIncludeOmitted: filters.setIncludeOmitted,
    toggleOmitted,
    supplierOptions,
    hasActiveFilters: filters.hasActiveFilters,
    handleClearFilters: filters.handleClearFilters,
    sort,
    dir,
    handleSortChange: filters.handleSortChange,
    products: rows,
    loading,
    pagination,
    totals,
    pageNumbers,
    goToPage: setPage,
    pageSize,
    setPageSize: filters.setPageSize,
    pageSizeOptions: filters.pageSizeOptions,
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
    bulkSetOmitted,
    onView,
    refresh,
  };
}
