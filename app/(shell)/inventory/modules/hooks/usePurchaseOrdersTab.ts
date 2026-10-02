'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildPageNumbers, type PaginationState } from '@/hooks/usePagination';
import { printPurchaseOrders } from '../poPrint';
import type { PurchaseOrderRecord, PurchaseOrderStatusValue } from '../types';

export type PoSortKey = 'number' | 'createdAt' | 'deliveryDate' | 'supplierName' | 'productTitle' | 'status';
export type PayFilter = '' | 'PAID' | 'UNPAID';

export const PO_PAGE_SIZE_OPTIONS = [20, 50, 100];
const EMPTY_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

type Filters = { supplierId: string; status: '' | PurchaseOrderStatusValue; payStatus: PayFilter; dateFrom: string; dateTo: string };
const NO_FILTERS: Filters = { supplierId: '', status: '', payStatus: '', dateFrom: '', dateTo: '' };

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
  const { request: requestList, loading } = useRequest<{ purchaseOrders: PurchaseOrderRecord[]; pagination: PaginationState }>();

  const [searchInput, setSearchInputState] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<PoSortKey>('createdAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(PO_PAGE_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<string[]>([]);
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
      },
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [enabled, search, filters, sort, dir, page, pageSize, refreshKey]);

  // Selection is narrowed to the rows on the page rather than pruned in an effect.
  const pageIds = new Set(rows.map((r) => r.id));
  const selectedIds = selected.filter((id) => pageIds.has(id));
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));
  const toggle = (id: string) => setSelected(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));
  const selectedRows = rows.filter((r) => selectedIds.includes(r.id));

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
  const { request: requestBulkReceive, loading: bulkReceiving } = useRequest<{ received: number; skipped: number; failed: string[] }>();
  const receivable = selectedRows.filter((r) => r.status !== 'CANCELLED' && r.items.some((i) => i.quantity > i.receivedQuantity));
  const confirmBulkReceive = () =>
    requestBulkReceive({
      url: '/api/inventory/purchase-orders/bulk-receive',
      method: 'POST',
      data: { ids: selectedIds },
      successMessage: 'Purchase orders received',
      onSuccess: () => {
        setReceiveConfirmOpen(false);
        setSelected([]);
        load();
        onChanged();
      },
    });

  const print = (pos: PurchaseOrderRecord[]) => {
    if (pos.length === 0) return;
    printPurchaseOrders(pos).catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Unable to print'));
  };

  const [viewTarget, setViewTarget] = useState<PurchaseOrderRecord | null>(null);

  return {
    rows,
    pagination,
    pageNumbers: buildPageNumbers(pagination.page, pagination.totalPages),
    loading,
    initialLoading,
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
    allSelected,
    toggle,
    toggleAll,
    clearSelection: () => setSelected([]),
    saveRemark,
    receivable,
    receiveConfirmOpen,
    openReceiveConfirm: () => setReceiveConfirmOpen(true),
    closeReceiveConfirm: () => setReceiveConfirmOpen(false),
    confirmBulkReceive,
    bulkReceiving,
    print,
    viewTarget,
    setViewTarget,
  };
}

export type PurchaseOrdersTabState = ReturnType<typeof usePurchaseOrdersTab>;
