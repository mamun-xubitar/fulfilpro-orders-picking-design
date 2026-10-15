'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import { printPurchaseOrders } from '../poPrint';
import type { PurchaseOrderRecord, PurchaseOrderStatusValue } from '../types';
import { receiveLocationOptions } from './usePurchaseOrder';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';

export type PoSortKey = 'number' | 'createdAt' | 'deliveryDate' | 'supplierName' | 'productTitle' | 'status';
export type PayFilter = '' | 'PAID' | 'UNPAID';

export const PO_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type Filters = { supplierId: string; status: '' | PurchaseOrderStatusValue; payStatus: PayFilter; dateFrom: string; dateTo: string };
const NO_FILTERS: Filters = { supplierId: '', status: '', payStatus: '', dateFrom: '', dateTo: '' };
/** Both the list endpoint's `pageSize` and bulk-receive's `ids` are capped at this many. */
const API_BATCH = 100;
type ApiEnvelope<T> = { success: boolean; message: string; data?: T };

type Args = {
  /** Only fetch while the tab is on screen. */
  enabled: boolean;
  /** Bumped by the page after a receive / payment save so the list refetches. */
  refreshKey: number;
  /** Fired after something here changed stock or payments (bulk receive), so other tabs refresh. */
  onChanged: () => void;
};

/** The Purchase Orders tab: every PO of every product — search, filters, sorting, paging, row
 * selection, inline remark, bulk receive and print. Receive / Pay for a single PO open the shared
 * modals owned by the page (usePurchaseOrder / usePoPayment), not state in here. */
export function usePurchaseOrdersTab({ enabled, refreshKey, onChanged }: Args) {
  const [rows, setRows] = useState<PurchaseOrderRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationState>(EMPTY_PAGINATION);
  const [initialLoading, setInitialLoading] = useState(true);
  // Which query `rows` belong to — a refetch of the same query keeps showing them instead of a skeleton.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const { request: requestList, loading } = useRequest<{ purchaseOrders: PurchaseOrderRecord[]; pagination: PaginationState }>();

  const [searchInput, setSearchInputState] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<PoSortKey>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectAllFilters, setSelectAllFilters] = useState(false);
  const [matchingRows, setMatchingRows] = useState<PurchaseOrderRecord[] | null>(null);
  const [resolving, setResolving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSearchInput = (value: string) => {
    setSearchInputState(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };
  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setSearchInputState('');
    setSearch('');
    setPage(1);
  };
  /** Reset everything, then narrow to one supplier — the Suppliers tab's PO-count link. */
  const focusSupplier = (supplierId: string) => {
    setFilters({ ...NO_FILTERS, supplierId });
    setSearchInputState('');
    setSearch('');
    setPage(1);
  };
  const changeSort = (key: PoSortKey) => {
    if (key === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(key);
      setDir(key === 'createdAt' || key === 'number' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const queryKey = JSON.stringify({ search, ...filters, sort, dir, page, pageSize });
  const load = () => {
    if (!enabled) return;
    requestList({
      url: '/api/inventory/purchase-orders',
      method: 'GET',
      showToast: false,
      data: { search, ...filters, sort, dir, page, pageSize },
      onSuccess: ({ data }) => {
        setRows(data.purchaseOrders);
        setPagination(data.pagination);
        setInitialLoading(false);
        setLoadedKey(queryKey);
      },
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [enabled, search, filters, sort, dir, page, pageSize, refreshKey]);

  // Selection is narrowed to the rows on the page rather than pruned in an effect.
  const pageIds = new Set(rows.map((r) => r.id));
  const selectedIds = selected.filter((id) => pageIds.has(id));
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));
  const toggle = (id: string) => {
    setSelectAllFilters(false);
    setSelected(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  };
  const toggleAll = () => {
    setSelectAllFilters(false);
    setSelected(allSelected ? [] : rows.map((r) => r.id));
  };
  const toggleSelectAllFilters = () => {
    setSelectAllFilters((prev) => !prev);
    setSelected([]);
  };
  const clearSelection = () => {
    setSelected([]);
    setSelectAllFilters(false);
  };
  const selectedRows = rows.filter((r) => selectedIds.includes(r.id));

  /** "Select all matching filters" only ever has one page on the client, so the full rows are
   * fetched (in API_BATCH pages, with the current filters and sort) when an action needs them.
   * Resolves to null — after a toast — if a page fails. */
  const resolveTargets = async (): Promise<PurchaseOrderRecord[] | null> => {
    if (!selectAllFilters) return selectedRows;
    setResolving(true);
    try {
      const all: PurchaseOrderRecord[] = [];
      let pageNo = 1;
      let totalPages = 1;
      do {
        const params = new URLSearchParams({ search, ...filters, sort, dir, page: String(pageNo), pageSize: String(API_BATCH) });
        const res = await fetch(`/api/inventory/purchase-orders?${params.toString()}`);
        const json = (await res.json()) as ApiEnvelope<{ purchaseOrders: PurchaseOrderRecord[]; pagination: PaginationState }>;
        if (!res.ok || !json.success || !json.data) throw new Error(json.message || 'Failed to resolve selection');
        all.push(...json.data.purchaseOrders);
        totalPages = json.data.pagination.totalPages;
        pageNo++;
      } while (pageNo <= totalPages);
      return all;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve selection');
      return null;
    } finally {
      setResolving(false);
    }
  };
  const targetRows = selectAllFilters ? (matchingRows ?? []) : selectedRows;

  const { request: requestRemark } = useRequest<PurchaseOrderRecord>();
  const saveRemark = (po: PurchaseOrderRecord, poRemark: string) => {
    if ((po.poRemark ?? '') === poRemark.trim().toUpperCase()) return;
    requestRemark({
      url: `/api/inventory/purchase-orders/${po.id}`,
      method: 'PATCH',
      data: { poRemark },
      successMessage: 'Remark saved',
      onSuccess: ({ data }) => setRows((prev) => prev.map((r) => (r.id === data.id ? data : r))),
    });
  };

  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [bulkReceiving, setBulkReceiving] = useState(false);
  /** Where each PO's receipt is put away, by PO id; variants not kept there use their own first location. */
  const [receiveLocationIds, setReceiveLocationIds] = useState<Record<string, string>>({});
  const isReceivable = (r: PurchaseOrderRecord) => r.status !== 'CANCELLED' && r.items.some((i) => i.quantity > i.receivedQuantity);
  const receivable = targetRows.filter(isReceivable);
  const openReceiveConfirm = async () => {
    let rowsToReceive = selectedRows;
    if (selectAllFilters) {
      const resolved = await resolveTargets();
      if (!resolved) return;
      setMatchingRows(resolved);
      rowsToReceive = resolved;
    }
    setReceiveLocationIds(Object.fromEntries(rowsToReceive.filter(isReceivable).map((r) => [r.id, receiveLocationOptions(r.items)[0]?.id ?? ''])));
    setReceiveConfirmOpen(true);
  };
  const closeReceiveConfirm = () => {
    setReceiveConfirmOpen(false);
    setMatchingRows(null);
  };
  const confirmBulkReceive = async () => {
    setBulkReceiving(true);
    const ids = targetRows.map((r) => r.id);
    let received = 0;
    let skipped = 0;
    let failed = 0;
    let errorMessage = '';
    try {
      for (let i = 0; i < ids.length; i += API_BATCH) {
        const batch = ids.slice(i, i + API_BATCH);
        const res = await fetch('/api/inventory/purchase-orders/bulk-receive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch, locationIds: Object.fromEntries(batch.map((id) => [id, receiveLocationIds[id]]).filter(([, locationId]) => locationId)) }),
        });
        const json = (await res.json()) as ApiEnvelope<{ received: number; skipped: number; failed: string[] }>;
        if (!res.ok || !json.success || !json.data) throw new Error(json.message || 'Could not receive the selected purchase orders');
        received += json.data.received;
        skipped += json.data.skipped;
        failed += json.data.failed.length;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Could not receive the selected purchase orders';
    }
    const parts = [`${received} purchase order${received === 1 ? '' : 's'} received`];
    if (skipped > 0) parts.push(`${skipped} skipped (nothing outstanding or cancelled)`);
    if (failed > 0) parts.push(`${failed} failed`);
    if (errorMessage) toast.error(received > 0 ? `${parts.join(' · ')} · ${errorMessage}` : errorMessage);
    else toast.success(parts.join(' · '));
    setBulkReceiving(false);
    if (errorMessage && received === 0) return;
    closeReceiveConfirm();
    clearSelection();
    load();
    onChanged();
  };

  const print = (pos: PurchaseOrderRecord[]) => {
    if (pos.length === 0) return;
    printPurchaseOrders(pos).catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Unable to print'));
  };

  const printSelection = async () => {
    const resolved = await resolveTargets();
    if (resolved) print(resolved);
  };

  const [viewTarget, setViewTarget] = useState<PurchaseOrderRecord | null>(null);

  return {
    rows,
    pagination,
    pageNumbers: buildPageNumbers(pagination.page, pagination.totalPages),
    loading,
    initialLoading,
    showSkeleton: initialLoading || (loading && loadedKey !== queryKey),
    searchInput,
    setSearchInput,
    filters,
    setFilter,
    clearFilters,
    focusSupplier,
    hasFilters: search !== '' || Object.values(filters).some(Boolean),
    sort,
    dir,
    changeSort,
    goToPage: setPage,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    selectedIds,
    selectedRows,
    selectAllFilters,
    hasSelection: selectAllFilters || selectedIds.length > 0,
    resolving,
    targetRows,
    resolveTargets,
    allSelected,
    toggle,
    toggleAll,
    toggleSelectAllFilters,
    clearSelection,
    saveRemark,
    receivable,
    receiveLocationIds,
    setReceiveLocation: (poId: string, locationId: string) => setReceiveLocationIds((prev) => ({ ...prev, [poId]: locationId })),
    receiveConfirmOpen,
    openReceiveConfirm,
    closeReceiveConfirm,
    confirmBulkReceive,
    bulkReceiving,
    print,
    printSelection,
    viewTarget,
    setViewTarget,
  };
}

export type PurchaseOrdersTabState = ReturnType<typeof usePurchaseOrdersTab>;
