'use client';

/* eslint-disable @next/next/no-img-element */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import OrdersPagination from '../../orders/modules/OrdersPagination';
import { printDocumentInHiddenFrame } from '../../orders/modules/packingSlipPrint';
import type { ShippingLine } from '../../orders/modules/types';
import { formatShippingMoney, getShippingDiscountCodes, getShippingLineFinalPrice } from '../../orders/modules/utils';
import { isOrderPickerRole } from '@/lib/roles';

type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };
type Pagination = { page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean };
type PaginationItem = number | 'ellipsis';
type StoreOption = { id: string; name: string; storeDomain: string };
type Recipient = { id: string; name: string; email: string; role: string };
type PickingLine = { lineItemId: string; quantity: number; full: boolean };
type PickingItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  title: string;
  variantTitle: string;
  variantOptions: Array<{ name: string; value: string }>;
  imageUrl: string | null;
  sku: string;
  vendor: string;
  qty: number;
  packedQuantity: number;
  packedDate: string | null;
  lastPackedUpdate: string | null;
  fulfilledQuantity: number;
};
type PackingConfirmation = {
  id: string;
  confirmedAt: string;
  canceledAt: string | null;
  lines: PickingLine[];
};
type PickingOrder = {
  id: string;
  number: string;
  customer: string;
  customerEmail: string | null;
  phone: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  note: string | null;
  canceled: boolean;
  closed: boolean;
  orderedAt: string;
  storeId: string;
  storeName: string;
  storeDomain: string;
  shippingLines: ShippingLine[];
  items: PickingItem[];
  vendors: string[];
  printed: boolean;
  lastPrintedAt: string | null;
  packingStatus: 'packed' | 'partially_packed' | 'not_packed';
  packedQuantity: number;
  totalQuantity: number;
  lastPackedAt: string | null;
  lastPackingUpdateAt: string | null;
  noteCount: number;
  messageCount: number;
  fulfillmentStatus: string | null;
  packingConfirmations: PackingConfirmation[];
};
type Note = {
  id: string;
  note: string;
  authorName: string | null;
  authorEmail: string | null;
  createdAt: string;
  updatedAt: string;
};
type Message = {
  id: string;
  adminName: string;
  adminEmail: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
  createdAt: string;
};
type PrintItem = PickingItem & { printQuantity: number; removed: boolean; printLocation: string; printRemark: string; printNote: string };
type PrintOrder = PickingOrder & { printItems: PrintItem[] };
type NoteModalState = { order: PickingOrder; notes: Note[]; note: string; editingNoteId: string | null; loading: boolean; saving: boolean; deletingId: string | null; error: string };
type MessageModalState = { order: PickingOrder; messages: Message[]; selectedUserId: string; message: string; loading: boolean; sending: boolean; error: string };
type OrderSyncJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  error: string | null;
  finishedAt: string | null;
};

const DEFAULT_PAGINATION: Pagination = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };
const PACKED_FILTERS = [
  { value: 'not_packed', label: 'Not Packed' },
  { value: 'partially_packed', label: 'Partial Packed' },
  { value: 'packed', label: 'Packed' },
] as const;
const PRINT_FILTERS = [
  { value: 'not_printed', label: 'Slip Not Printed' },
  { value: 'printed', label: 'Slip Printed' },
] as const;
const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
] as const;
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function PickingListPage() {
  const { data: session } = useSession();
  const isPicker = isOrderPickerRole(session?.user?.role);
  const isAdmin = session?.user?.role === 'admin';
  const initialSearch = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('search')?.trim() ?? '';
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['value']>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [packedStatuses, setPackedStatuses] = useState<string[]>(['not_packed', 'partially_packed']);
  const [printStatuses, setPrintStatuses] = useState<string[]>([]);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [packedStatusDropdownOpen, setPackedStatusDropdownOpen] = useState(false);
  const [printStatusDropdownOpen, setPrintStatusDropdownOpen] = useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [syncStoreDropdownOpen, setSyncStoreDropdownOpen] = useState(false);
  const [syncStoreIds, setSyncStoreIds] = useState<string[]>([]);
  const [calendarNav, setCalendarNav] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fullChecks, setFullChecks] = useState<Record<string, boolean>>({});
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncJob, setSyncJob] = useState<OrderSyncJob | null>(null);
  const [lastSynced, setLastSynced] = useState('');
  const [syncRefreshNeeded, setSyncRefreshNeeded] = useState(false);
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshingIds, setRefreshingIds] = useState<Record<string, boolean>>({});
  const [printModal, setPrintModal] = useState<PrintOrder[] | null>(null);
  const [notifyModal, setNotifyModal] = useState<null | { type: 'confirm' | 'cancel'; order: PickingOrder; lines?: PickingLine[]; confirmationId?: string; selectedUserIds: string[]; message: string; saving: boolean }>(null);
  const [noteModal, setNoteModal] = useState<null | NoteModalState>(null);
  const [messageModal, setMessageModal] = useState<null | MessageModalState>(null);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const packedStatusDropdownRef = useRef<HTMLDivElement>(null);
  const printStatusDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const syncStoreDropdownRef = useRef<HTMLDivElement>(null);
  const activeSyncJobIdRef = useRef<string | null>(null);
  const completedSyncJobIdRef = useRef<string | null>(null);

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
    storeIds.forEach((id) => params.append('storeId', id));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    packedStatuses.forEach((status) => params.append('packedStatus', status));
    printStatuses.forEach((status) => params.append('printStatus', status));
    return params.toString();
  }, [dateFrom, dateTo, packedStatuses, pagination.page, pagination.pageSize, period, printStatuses, search, storeIds]);

  const loadSyncStatus = useCallback(async (refreshAfterCompletion = false) => {
    const res = await fetch('/api/orders/sync');
    const json = (await res.json()) as ApiResponse<{
      activeJob: OrderSyncJob | null;
      lastSuccessfulJob: OrderSyncJob | null;
      latestJob: OrderSyncJob | null;
    }>;

    if (!res.ok || !json.success) {
      throw new Error(getApiErrorMessage(json, 'Failed to load Shopify order sync status'));
    }

    setSyncJob(json.data.activeJob);
    if (json.data.activeJob) {
      activeSyncJobIdRef.current = json.data.activeJob.id;
    }

    if (json.data.lastSuccessfulJob?.finishedAt) {
      const completedJobId = json.data.lastSuccessfulJob.id;
      setLastSynced(`Last synced: ${formatSyncDate(json.data.lastSuccessfulJob.finishedAt)}`);

      if (
        refreshAfterCompletion &&
        activeSyncJobIdRef.current === completedJobId &&
        completedSyncJobIdRef.current !== completedJobId
      ) {
        completedSyncJobIdRef.current = completedJobId;
        activeSyncJobIdRef.current = null;
        setSyncRefreshNeeded(
          json.data.lastSuccessfulJob.totalCreated > 0 || json.data.lastSuccessfulJob.totalUpdated > 0
        );
      }
    }

    if (
      refreshAfterCompletion &&
      json.data.latestJob?.status === 'failed' &&
      activeSyncJobIdRef.current === json.data.latestJob.id
    ) {
      setError(json.data.latestJob.error || 'Shopify order sync failed');
      activeSyncJobIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchSyncStatus = async () => {
      try {
        await loadSyncStatus(false);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load Shopify order sync status');
      }
    };
    void fetchSyncStatus();
    return () => {
      cancelled = true;
    };
  }, [loadSyncStatus]);

  useEffect(() => {
    if (!syncJob || (syncJob.status !== 'queued' && syncJob.status !== 'running')) return;
    const timer = window.setInterval(() => {
      void loadSyncStatus(true).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load Shopify order sync status');
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loadSyncStatus, syncJob]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/picking-list?${queryString}`);
        const json = (await res.json()) as ApiResponse<{ orders: PickingOrder[]; stores: StoreOption[]; recipients: Recipient[]; pagination: Pagination }>;
        if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load picking list'));
        if (cancelled) return;
        setOrders(json.data.orders);
        setStores(json.data.stores);
        setRecipients(json.data.recipients);
        setPagination(json.data.pagination);
        setSelectedIds((prev) => prev.filter((id) => json.data.orders.some((order) => order.id === id)));
        setExpandedIds((prev) => prev.filter((id) => json.data.orders.some((order) => order.id === id)));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load picking list');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [queryString, refreshToken]);

  const selectedOrders = orders.filter((order) => selectedIds.includes(order.id));
  const allPageSelected = orders.length > 0 && orders.every((order) => selectedIds.includes(order.id));
  const allSelectedExpanded = selectedIds.length > 0 && selectedIds.every((id) => expandedIds.includes(id));
  const defaultPackedStatuses = ['not_packed', 'partially_packed'];
  const isPackedStatusDefault = packedStatuses.length === defaultPackedStatuses.length && defaultPackedStatuses.every((status) => packedStatuses.includes(status));
  const hasActiveFilters = searchInput !== '' || storeIds.length > 0 || period !== 'all' || !!dateFrom || !!dateTo || !isPackedStatusDefault || printStatuses.length > 0;
  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
  const syncMessage = syncActive
    ? syncJob.status === 'queued'
      ? 'Sync queued'
      : `Syncing: ${syncJob.totalFetched} fetched`
    : lastSynced || 'Not synced yet';
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

  function rowItemKey(orderId: string, itemIndex: number) {
    return `${orderId}:${itemIndex}`;
  }

  function getRemaining(item: PickingItem) {
    return Math.max(0, item.qty - item.packedQuantity);
  }

  function getPickingLines(order: PickingOrder) {
    return order.items.map((item, index) => {
      const key = rowItemKey(order.id, index);
      const remaining = getRemaining(item);
      const full = Boolean(fullChecks[key]);
      const requested = Math.min(remaining, Math.max(0, partialValues[key] ?? 0));
      const quantity = full ? remaining : requested;
      return quantity > 0 ? { lineItemId: item.id, quantity, full } : null;
    }).filter((line): line is PickingLine => Boolean(line));
  }

  function setOrderFullChecks(order: PickingOrder, checked: boolean) {
    setFullChecks((prev) => {
      const next = { ...prev };
      order.items.forEach((item, index) => {
        const remaining = getRemaining(item);
        if (remaining > 0) next[rowItemKey(order.id, index)] = checked;
      });
      return next;
    });
    setPartialValues((prev) => {
      const next = { ...prev };
      order.items.forEach((item, index) => {
        const remaining = getRemaining(item);
        if (remaining > 0) next[rowItemKey(order.id, index)] = checked ? remaining : 0;
      });
      return next;
    });
  }

  function toggleAllPage() {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !orders.some((order) => order.id === id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...orders.map((order) => order.id)])));
    }
  }

  function toggleBulkView(targetIds: string[]) {
    if (targetIds.length === 0) return;
    setExpandedIds((prev) => {
      const targetSet = new Set(targetIds);
      const allExpanded = targetIds.every((id) => prev.includes(id));
      if (allExpanded) {
        return prev.filter((id) => !targetSet.has(id));
      }
      const next = [...prev];
      for (const id of targetIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  }

  function toggleStore(id: string) {
    setStoreIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function toggleFilter(value: string, setter: Dispatch<SetStateAction<string[]>>) {
    setter((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function toggleSyncStore(id: string) {
    setSyncStoreIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  }

  function handlePeriodChange(value: (typeof PERIODS)[number]['value']) {
    setPeriod(value);
    if (value !== 'custom') {
      setDateFrom('');
      setDateTo('');
      setHoverDate(null);
      setPeriodDropdownOpen(false);
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function handleCalendarDateClick(date: string) {
    if (!dateFrom || (dateFrom && dateTo)) {
      setDateFrom(date);
      setDateTo('');
      setHoverDate(null);
      setPeriod('custom');
      setPagination((prev) => ({ ...prev, page: 1 }));
      return;
    }

    const [start, end] = date >= dateFrom ? [dateFrom, date] : [date, dateFrom];
    setDateFrom(start);
    setDateTo(end);
    setHoverDate(null);
    setPeriodDropdownOpen(false);
    setPeriod('custom');
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setStoreIds([]);
    setPeriod('all');
    setDateFrom('');
    setDateTo('');
    setHoverDate(null);
    setPackedStatuses(['not_packed', 'partially_packed']);
    setPrintStatuses([]);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function refreshList() {
    setRefreshRotation((prev) => prev + 360);
    setSyncRefreshNeeded(false);
    setRefreshToken((value) => value + 1);
  }

  function goToPage(page: number) {
    setPagination((prev) => ({ ...prev, page }));
  }

  async function syncOrders() {
    if (syncActive) return;
    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: syncStoreIds.length > 0 ? syncStoreIds : undefined }),
      });
      const json = (await res.json()) as ApiResponse<{ job: OrderSyncJob; alreadyRunning: boolean }>;
      if ((!res.ok && res.status !== 409) || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to queue Shopify order sync'));
      setSyncJob(json.data.job);
      activeSyncJobIdRef.current = json.data.job.id;
      setSyncRefreshNeeded(false);
      if (json.data.alreadyRunning) {
        toast.info('A Shopify order sync is already running.');
      } else {
        toast.success('Shopify order sync queued.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue Shopify order sync');
    } finally {
      setSyncing(false);
    }
  }

  async function refreshOrder(order: PickingOrder) {
    setRefreshingIds((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/picking-list/orders/${encodeURIComponent(order.id)}/refresh`, { method: 'POST' });
      const json = (await res.json()) as ApiResponse<PickingOrder>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to refresh order'));
      setOrders((prev) => prev.map((item) => item.id === order.id ? json.data : item));
      setSelectedIds((prev) => prev.filter((id) => id !== order.id || json.data.id === order.id));
      toast.success(`Order ${order.number} refreshed from Shopify`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh order');
    } finally {
      setRefreshingIds((prev) => ({ ...prev, [order.id]: false }));
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(target)) setStoreDropdownOpen(false);
      if (packedStatusDropdownRef.current && !packedStatusDropdownRef.current.contains(target)) setPackedStatusDropdownOpen(false);
      if (printStatusDropdownRef.current && !printStatusDropdownRef.current.contains(target)) setPrintStatusDropdownOpen(false);
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(target)) setPeriodDropdownOpen(false);
      if (syncStoreDropdownRef.current && !syncStoreDropdownRef.current.contains(target)) setSyncStoreDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openConfirmPacked(order: PickingOrder) {
    const lines = getPickingLines(order);
    if (lines.length === 0) {
      toast.error('Select Full or enter a partial quantity before confirming packed.');
      return;
    }
    setNotifyModal({ type: 'confirm', order, lines, selectedUserIds: recipients.filter((r) => r.role === 'admin').map((r) => r.id), message: '', saving: false });
  }

  function openCancelPacked(order: PickingOrder, confirmationId?: string) {
    const active = confirmationId
      ? order.packingConfirmations.find((confirmation) => confirmation.id === confirmationId && !confirmation.canceledAt)
      : order.packingConfirmations.find((confirmation) => !confirmation.canceledAt);
    if (!active) {
      toast.error('This order has no active packed confirmation to cancel.');
      return;
    }
    setNotifyModal({ type: 'cancel', order, confirmationId: active.id, selectedUserIds: recipients.filter((r) => r.role === 'admin').map((r) => r.id), message: '', saving: false });
  }

  async function submitNotifyAction() {
    if (!notifyModal || notifyModal.saving) return;
    setNotifyModal((prev) => prev ? { ...prev, saving: true } : prev);
    try {
      const isConfirm = notifyModal.type === 'confirm';
      const res = await fetch(
        isConfirm
          ? `/api/orders/${notifyModal.order.id}/packing-confirmations`
          : `/api/orders/${notifyModal.order.id}/packing-confirmations/${notifyModal.confirmationId}`,
        {
          method: isConfirm ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lines: notifyModal.lines ?? [],
            notifyUserIds: notifyModal.selectedUserIds,
            notifyMessage: notifyModal.message,
          }),
        }
      );
      const json = (await res.json()) as ApiResponse<{ order: PickingOrder }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Packing update failed'));
      setOrders((prev) => prev.map((order) => order.id === json.data.order.id ? json.data.order : order));
      setNotifyModal(null);
      toast.success(isConfirm ? 'Packed quantities confirmed' : 'Packed confirmation canceled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Packing update failed');
      setNotifyModal((prev) => prev ? { ...prev, saving: false } : prev);
    }
  }

  function openPrintModal(targetOrders: PickingOrder[]) {
    if (targetOrders.length === 0) {
      toast.error('Select at least one order to print.');
      return;
    }
    setPrintModal(targetOrders.map((order) => ({
      ...order,
      printItems: order.items
        .filter((item) => getRemaining(item) > 0)
        .map((item) => ({
          ...item,
          printQuantity: getRemaining(item),
          removed: false,
          printLocation: "",
          printRemark: "",
          printNote: "",
        })),
    })));
  }

  async function printPickingSlips() {
    if (!printModal) return;
    const printableOrders = printModal.map((order) => ({
      ...order,
      printItems: order.printItems.filter((item) => !item.removed && item.printQuantity > 0),
    })).filter((order) => order.printItems.length > 0);
    if (printableOrders.length === 0) {
      toast.error('At least one item must remain on the picking slip.');
      return;
    }
    const printHtml = buildPickingSlipDocument(printableOrders);
    try {
      await printDocumentInHiddenFrame(printHtml);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to start print. Please try again.');
      return;
    }

    try {
      const res = await fetch('/api/picking-list/prints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: printableOrders.map((order) => ({
            orderId: order.id,
            items: order.printItems.map((item) => ({
              lineItemId: item.id,
              name: item.name,
              sku: item.sku,
              variant: getVariantText(item),
              quantity: item.printQuantity,
              location: item.printLocation,
              remark: item.printRemark,
              note: item.printNote,
            })),
          })),
        }),
      });
      const json = (await res.json()) as ApiResponse<{ printedOrderIds: string[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to record print'));
      const now = new Date().toISOString();
      setOrders((prev) => prev.map((order) => json.data.printedOrderIds.includes(order.id) ? { ...order, printed: true, lastPrintedAt: now } : order));
      setPrintModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record print');
    }
  }

  async function openNoteModal(order: PickingOrder) {
    setNoteModal({ order, notes: [], note: '', editingNoteId: null, loading: true, saving: false, deletingId: null, error: '' });
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/notes`);
      const json = (await res.json()) as ApiResponse<Note[]>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load notes'));
      setNoteModal((prev) => prev && prev.order.id === order.id ? { ...prev, notes: json.data, loading: false } : prev);
      setOrders((prev) => prev.map((item) => item.id === order.id ? { ...item, noteCount: json.data.length } : item));
    } catch (err) {
      setNoteModal((prev) => prev && prev.order.id === order.id ? { ...prev, error: err instanceof Error ? err.message : 'Failed to load notes', loading: false } : prev);
    }
  }

  function closeNoteModal() {
    if (noteModal?.saving || noteModal?.deletingId) return;
    setNoteModal(null);
  }

  function startEditNote(note: Note) {
    setNoteModal((prev) => prev ? { ...prev, note: note.note, editingNoteId: note.id, error: '' } : prev);
  }

  function cancelEditNote() {
    setNoteModal((prev) => prev ? { ...prev, note: '', editingNoteId: null, error: '' } : prev);
  }

  async function submitNote() {
    if (!noteModal || noteModal.saving) return;
    const note = noteModal.note.trim();
    if (!note) {
      setNoteModal((prev) => prev ? { ...prev, error: 'Note is required.' } : prev);
      return;
    }
    const editingNoteId = noteModal.editingNoteId;
    const orderId = noteModal.order.id;
    setNoteModal((prev) => prev ? { ...prev, saving: true, error: '' } : prev);
    try {
      const res = await fetch(
        editingNoteId
          ? `/api/orders/${encodeURIComponent(orderId)}/notes/${encodeURIComponent(editingNoteId)}`
          : `/api/orders/${encodeURIComponent(orderId)}/notes`,
        {
        method: editingNoteId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
        }
      );
      const json = (await res.json()) as ApiResponse<Note>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, editingNoteId ? 'Failed to update note' : 'Failed to add note'));
      setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, noteCount: editingNoteId ? order.noteCount : order.noteCount + 1 } : order));
      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        const notes = editingNoteId
          ? prev.notes.map((item) => item.id === editingNoteId ? json.data : item)
          : [json.data, ...prev.notes];
        return { ...prev, notes, note: '', editingNoteId: null, saving: false };
      });
      toast.success(editingNoteId ? 'Note updated.' : 'Note added.');
    } catch (err) {
      setNoteModal((prev) => prev ? { ...prev, error: err instanceof Error ? err.message : 'Failed to save note', saving: false } : prev);
    }
  }

  async function deleteNote(noteId: string) {
    if (!noteModal || noteModal.deletingId) return;
    if (!window.confirm('Delete this note?')) return;
    const orderId = noteModal.order.id;
    setNoteModal((prev) => prev ? { ...prev, deletingId: noteId, error: '' } : prev);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to delete note'));
      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        return {
          ...prev,
          notes: prev.notes.filter((item) => item.id !== noteId),
          note: prev.editingNoteId === noteId ? '' : prev.note,
          editingNoteId: prev.editingNoteId === noteId ? null : prev.editingNoteId,
          deletingId: null,
        };
      });
      setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, noteCount: Math.max(0, order.noteCount - 1) } : order));
      toast.info('Note deleted.');
    } catch (err) {
      setNoteModal((prev) => prev ? { ...prev, deletingId: null, error: err instanceof Error ? err.message : 'Failed to delete note' } : prev);
    }
  }

  async function openMessageModal(order: PickingOrder) {
    setMessageModal({ order, messages: [], selectedUserId: '', message: '', loading: true, sending: false, error: '' });
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`);
      const json = (await res.json()) as ApiResponse<{ admins: Recipient[]; messages: Message[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load messages'));
      setRecipients(json.data.admins);
      setMessageModal((prev) => prev && prev.order.id === order.id ? { ...prev, messages: json.data.messages, selectedUserId: json.data.admins[0]?.id ?? '', loading: false } : prev);
      setOrders((prev) => prev.map((item) => item.id === order.id ? { ...item, messageCount: json.data.messages.length } : item));
    } catch (err) {
      setMessageModal((prev) => prev && prev.order.id === order.id ? { ...prev, error: err instanceof Error ? err.message : 'Failed to load messages', loading: false } : prev);
    }
  }

  async function submitMessage() {
    if (!messageModal || messageModal.sending) return;
    const message = messageModal.message.trim();
    if (!messageModal.selectedUserId || !message) {
      setMessageModal((prev) => prev ? { ...prev, error: 'Select a recipient and enter a message.' } : prev);
      return;
    }
    setMessageModal((prev) => prev ? { ...prev, sending: true, error: '' } : prev);
    try {
      const res = await fetch(`/api/orders/${messageModal.order.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: messageModal.selectedUserId, message }),
      });
      const json = (await res.json()) as ApiResponse<Message>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to send message'));
      setOrders((prev) => prev.map((order) => order.id === messageModal.order.id ? { ...order, messageCount: order.messageCount + 1 } : order));
      setMessageModal((prev) => prev ? { ...prev, messages: [json.data, ...prev.messages], message: '', sending: false } : prev);
      toast.success('Message sent.');
    } catch (err) {
      setMessageModal((prev) => prev ? { ...prev, error: err instanceof Error ? err.message : 'Failed to send message', sending: false } : prev);
    }
  }

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex min-w-48 flex-1 items-center overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm sm:flex-none sm:w-64">
          <svg className="ml-3 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="name order# SKU address... (space = AND)" className="min-w-0 flex-1 px-2 py-2 text-sm outline-none" />
        </div>

        {!isPicker && (
          <MultiSelectDropdown
            refEl={storeDropdownRef}
            open={storeDropdownOpen}
            setOpen={setStoreDropdownOpen}
            buttonLabel={storeIds.length === 0 ? 'All Stores' : `${storeIds.length} Store${storeIds.length > 1 ? 's' : ''}`}
            allLabel="All Stores"
            allActive={storeIds.length === 0}
            onClear={() => { setStoreIds([]); setPagination((prev) => ({ ...prev, page: 1 })); }}
            options={stores.map((store) => ({ value: store.id, label: store.name }))}
            selectedValues={storeIds}
            onToggle={toggleStore}
          />
        )}

        {!isPicker && (
          <div className="relative" ref={periodDropdownRef}>
          <button onClick={() => setPeriodDropdownOpen((prev) => !prev)} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50">
            {period === 'custom'
              ? dateFrom && dateTo
                ? `${fmtCalDate(dateFrom)} - ${fmtCalDate(dateTo)}`
                : dateFrom
                  ? `From ${fmtCalDate(dateFrom)}`
                  : 'Custom Range'
              : PERIODS.find((item) => item.value === period)?.label ?? 'All Time'}
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {periodDropdownOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-max min-w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              {PERIODS.map((item) => (
                <button key={item.value} onClick={() => handlePeriodChange(item.value)} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${period === item.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>
                  {item.label}
                  {period === item.value && <span className="text-blue-600">✓</span>}
                </button>
              ))}
              {period === 'custom' && (
                <div className="border-t border-gray-100 p-3" onMouseLeave={() => setHoverDate(null)}>
                  <div className="mb-3 flex items-center justify-between">
                    <button onClick={(event) => { event.stopPropagation(); setCalendarNav((prev) => { const date = new Date(prev.year, prev.month - 1, 1); return { year: date.getFullYear(), month: date.getMonth() }; }); }} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex gap-10 select-none text-xs font-semibold text-gray-700">
                      {[0, 1].map((offset) => {
                        const date = new Date(calendarNav.year, calendarNav.month + offset, 1);
                        return <span key={offset}>{MONTH_LABELS[date.getMonth()]} {date.getFullYear()}</span>;
                      })}
                    </div>
                    <button onClick={(event) => { event.stopPropagation(); setCalendarNav((prev) => { const date = new Date(prev.year, prev.month + 1, 1); return { year: date.getFullYear(), month: date.getMonth() }; }); }} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  <div className="flex gap-5">
                    {[0, 1].map((offset) => (
                      <CalendarMonth
                        key={offset}
                        year={new Date(calendarNav.year, calendarNav.month + offset, 1).getFullYear()}
                        month={new Date(calendarNav.year, calendarNav.month + offset, 1).getMonth()}
                        dateFrom={dateFrom}
                        dateTo={dateTo}
                        hoverDate={hoverDate}
                        onDateClick={handleCalendarDateClick}
                        onHoverDate={(date) => !dateTo && setHoverDate(date)}
                      />
                    ))}
                  </div>
                  {(dateFrom || dateTo) && (
                    <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="text-xs text-gray-400">{dateFrom && dateTo ? `${fmtCalDate(dateFrom)} - ${fmtCalDate(dateTo)}` : dateFrom ? `From ${fmtCalDate(dateFrom)}` : ''}</span>
                      <button onClick={(event) => { event.stopPropagation(); setDateFrom(''); setDateTo(''); setPeriod('all'); }} className="text-xs text-gray-400 hover:text-red-500">Clear dates</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        )}

        <MultiSelectDropdown
          refEl={packedStatusDropdownRef}
          open={packedStatusDropdownOpen}
          setOpen={setPackedStatusDropdownOpen}
          buttonLabel={packedStatuses.length === 0 ? 'All Packed Statuses' : `${packedStatuses.length} Packed Status${packedStatuses.length > 1 ? 'es' : ''}`}
          allLabel="All Packed Statuses"
          allActive={packedStatuses.length === 0}
          onClear={() => { setPackedStatuses([]); setPagination((prev) => ({ ...prev, page: 1 })); }}
          options={PACKED_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
          selectedValues={packedStatuses}
          onToggle={(value) => toggleFilter(value, setPackedStatuses)}
        />

        <MultiSelectDropdown
          refEl={printStatusDropdownRef}
          open={printStatusDropdownOpen}
          setOpen={setPrintStatusDropdownOpen}
          buttonLabel={printStatuses.length === 0 ? 'All Print Statuses' : `${printStatuses.length} Print Status${printStatuses.length > 1 ? 'es' : ''}`}
          allLabel="All Print Statuses"
          allActive={printStatuses.length === 0}
          onClear={() => { setPrintStatuses([]); setPagination((prev) => ({ ...prev, page: 1 })); }}
          options={PRINT_FILTERS.map((item) => ({ value: item.value, label: item.label }))}
          selectedValues={printStatuses}
          onToggle={(value) => toggleFilter(value, setPrintStatuses)}
        />

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
          {!isPicker && (
            <div ref={syncStoreDropdownRef} className="relative">
            <div className="flex items-stretch gap-0">
              <button onClick={() => void syncOrders()} disabled={syncing || loading || syncActive} className="flex items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                <svg className={`h-4 w-4 ${syncing || syncActive ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5m0 0h-5m5 0v5M19 5A9 9 0 005 19m0 0h5m-5 0v-5" />
                </svg>
                {syncActive ? 'Syncing...' : syncing ? 'Queueing...' : 'Sync'}
              </button>
              <button onClick={() => setSyncStoreDropdownOpen((prev) => !prev)} disabled={syncing || loading || syncActive} className="flex items-center rounded-r-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {syncStoreDropdownOpen && (
              <div className="absolute right-0 z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Select Stores to Sync</div>
                <button onClick={() => setSyncStoreIds([])} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${syncStoreIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>All Stores</button>
                {stores.length > 0 && <div className="my-1 border-t border-gray-100" />}
                {stores.map((store) => (
                  <CheckOption key={store.id} label={store.name} selected={syncStoreIds.includes(store.id)} onClick={() => toggleSyncStore(store.id)} />
                ))}
              </div>
            )}
            </div>
          )}
          <button onClick={refreshList} disabled={syncing} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${syncRefreshNeeded ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transition: 'transform .6s ease', transform: `rotate(${refreshRotation}deg)` }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          {!isPicker && <span className="min-w-0 flex-1 text-xs text-gray-400 sm:flex-none sm:whitespace-nowrap">{syncMessage}</span>}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-900">{selectedIds.length} order{selectedIds.length === 1 ? '' : 's'} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleBulkView(selectedIds)} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100">{allSelectedExpanded ? 'Collapse' : 'Expand'}</button>
            <button onClick={() => openPrintModal(selectedOrders)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Print picking slip</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-3 text-left"><input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} className="rounded border-gray-300 text-blue-600" /></th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Order</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Store</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Ordered At</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Packed Qty</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Packed Date</th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase text-gray-500">Note</th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="py-12 text-center text-gray-400">Loading picking list...</td></tr>}
              {!loading && error && <tr><td colSpan={10} className="py-12 text-center text-red-500">{error}</td></tr>}
              {!loading && !error && orders.length === 0 && <tr><td colSpan={10} className="py-16 text-center text-gray-400">No picking orders found.</td></tr>}
              {!loading && !error && orders.map((order) => {
                const isExpanded = expandedIds.includes(order.id);
                const isSelected = selectedIds.includes(order.id);
                const isAllPacked = order.packingStatus === 'packed' || (order.totalQuantity > 0 && order.packedQuantity >= order.totalQuantity);
                const canConfirmPacked = !order.closed && !order.canceled && order.packedQuantity < order.totalQuantity && getPickingLines(order).length > 0;
                const orderRowClass = (() => {
                  if (isSelected) return 'border-b border-blue-200 bg-blue-100 hover:bg-blue-200';
                  if (order.canceled) return 'border-b border-red-200 bg-red-100 hover:bg-red-200';
                  if (order.closed) return 'border-b border-gray-200 bg-gray-100 hover:bg-gray-200';
                  if (order.packingStatus === 'packed') return 'border-b border-blue-200 bg-blue-100 hover:bg-blue-200';
                  if (order.packingStatus === 'partially_packed') return 'border-b border-amber-200 bg-amber-100 hover:bg-amber-200';
                  return 'border-b border-gray-100 hover:bg-gray-50';
                })();
                return (
                  <Fragment key={order.id}>
                    <tr className={`${orderRowClass} transition-colors duration-100`}>
                      <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => setSelectedIds((prev) => prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id])} className="rounded border-gray-300 text-blue-600" /></td>
                      <td className="px-3 py-3 font-mono font-medium text-gray-900">{order.number}</td>
                      <td className="px-3 py-3 text-gray-600">{order.storeName}</td>
                      <td className="px-3 py-3 text-gray-700">{order.customer}</td>
                      <td className="px-3 py-3 text-gray-600">{formatDateTime(order.orderedAt)}</td>
                      <td className="px-3 py-3"><StatusChips order={order} isAdmin={isAdmin} /></td>
                      <td className="px-3 py-3 font-medium text-gray-700">{order.packedQuantity}/{order.totalQuantity}</td>
                      <td className="px-3 py-3 text-gray-600">{order.lastPackedAt ? formatDateTime(order.lastPackedAt) : '-'}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="tooltip inline-flex">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void openNoteModal(order);
                            }}
                            className="relative inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600"
                            aria-label={`Notes for ${order.number}`}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v14l-4-3H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8M8 12h5" />
                            </svg>
                            {order.noteCount > 0 && (
                              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                                {order.noteCount > 99 ? '99+' : order.noteCount}
                              </span>
                            )}
                          </button>
                          <span className="tt">Order Notes</span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <div className="tooltip">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setExpandedIds((prev) => prev.includes(order.id) ? prev.filter((id) => id !== order.id) : [...prev, order.id]);
                              }}
                              className="cursor-pointer rounded-lg p-1.5 text-xs font-medium text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600"
                              aria-label={`${isExpanded ? 'Hide' : 'View'} details for ${order.number}`}
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                            <span className="tt">View Details</span>
                          </div>
                          <div className="tooltip">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                openPrintModal([order]);
                              }}
                              disabled={isAllPacked}
                              className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                              aria-label={`Print picking slip for ${order.number}`}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <span className="tt">Print Picking Slip</span>
                          </div>
                          <div className="tooltip">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void openMessageModal(order);
                              }}
                              disabled={isAllPacked}
                              className="relative cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                              aria-label={`Messages for ${order.number}`}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.4-3.5A7.5 7.5 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {order.messageCount > 0 && (
                                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                                  {order.messageCount > 99 ? '99+' : order.messageCount}
                                </span>
                              )}
                            </button>
                            <span className="tt">Messages</span>
                          </div>
                          <div className="tooltip">
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void refreshOrder(order);
                              }}
                              disabled={isAllPacked || refreshingIds[order.id]}
                              className="cursor-pointer rounded-lg p-1.5 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                              aria-label={`Refresh ${order.number}`}
                            >
                              <svg className={`h-4 w-4 ${refreshingIds[order.id] ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <span className="tt">Refresh Order</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="border-b border-gray-200 bg-gray-50 p-3 sm:p-5">
                          <div className={`grid w-[calc(100vw-2.5rem)] min-w-0 max-w-full gap-3 sm:w-[calc(100vw-4rem)] sm:gap-5 lg:w-full ${isPicker ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)]' : 'lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,260px)]'}`}>
                            {!isPicker && (
                              <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                                <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">Customer Details</h3>
                              <div className="space-y-1 text-sm text-gray-700">
                                <p className="font-semibold text-gray-900">{order.customer}</p>
                                {[order.address, order.address2, order.city, order.state, order.zip, order.country].filter(Boolean).map((line, lineIndex) => <p key={`${order.id}-address-${lineIndex}`}>{line}</p>)}
                                {order.shippingLines.length > 0 && (
                                  <div className="mt-3 space-y-1.5">
                                    <h4 className="text-[11px] font-semibold uppercase text-gray-400">Delivery Method</h4>
                                    {order.shippingLines.map((line, lineIndex) => {
                                      const finalPrice = getShippingLineFinalPrice(line);
                                      const isFree = finalPrice <= 0;
                                      const discountCodes = getShippingDiscountCodes(line);
                                      return (
                                        <div key={`${order.id}-shipping-${line.id || lineIndex}-${lineIndex}`} className="min-w-0 rounded-md border border-blue-100 bg-white/70 px-2.5 py-2 text-xs text-gray-600">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium text-gray-800">{line.title || line.code || 'Shipping'}</span>
                                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {isFree ? 'Free' : 'Paid'}
                                            </span>
                                            {discountCodes.map((code, codeIndex) => (
                                              <span key={`${line.id || lineIndex}-discount-${codeIndex}`} className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
                                                {code}
                                              </span>
                                            ))}
                                          </div>
                                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                                            <span>Price: {formatShippingMoney(line.price, line.currencyCode)}</span>
                                            <span>Discounted: {formatShippingMoney(finalPrice, line.currencyCode)}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {order.note && <p className="mt-3 whitespace-pre-wrap rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{order.note}</p>}
                              </div>
                            </section>
                            )}

                            <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                              <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">Order Items</h3>
                              <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-xs md:min-w-[760px]">
                                  <thead>
                                    <tr className="border-b border-gray-200 text-gray-500">
                                      <th className="py-2 text-left font-medium">Item</th>
                                      <th className="py-2 text-left font-medium">SKU</th>
                                      <th className="py-2 text-center font-medium">Qty</th>
                                      <th className="py-2 text-center font-medium">Packed</th>
                                      <th className="py-2 text-left font-medium">Packed Date</th>
                                      {isAdmin && <th className="py-2 text-center font-medium">Fulfilled</th>}
                                      <th className="py-2 text-left font-medium">
                                        <label className="inline-flex cursor-pointer items-center justify-start gap-1.5">
                                          <input
                                            type="checkbox"
                                            checked={order.items.some((item) => getRemaining(item) > 0) && order.items.every((item, itemIndex) => getRemaining(item) === 0 || Boolean(fullChecks[rowItemKey(order.id, itemIndex)]))}
                                            disabled={!order.items.some((item) => getRemaining(item) > 0)}
                                            onChange={(event) => setOrderFullChecks(order, event.target.checked)}
                                            className="cursor-pointer rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                          />
                                          <span>Full</span>
                                        </label>
                                      </th>
                                      <th className="py-2 text-center font-medium">Partial</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.items.filter((item) => item.fulfilledQuantity < item.qty).map((item, itemIndex) => {
                                      const key = rowItemKey(order.id, itemIndex);
                                      const remaining = getRemaining(item);
                                      const isFull = Boolean(fullChecks[key]);
                                      const partialVal = partialValues[key] ?? 0;
                                      const itemRowClass = (() => {
                                        if (item.packedQuantity >= item.qty && item.qty > 0) return 'border-b border-emerald-200 bg-emerald-100';
                                        if ((isFull || partialVal >= remaining) && remaining > 0) return 'border-b border-blue-200 bg-blue-100';
                                        if (partialVal > 0) return 'border-b border-pink-200 bg-pink-100';
                                        if (item.packedQuantity > 0) return 'border-b border-purple-200 bg-purple-100';
                                        return 'border-b border-gray-100';
                                      })();
                                      return (
                                        <tr key={`${order.id}-item-${item.id || itemIndex}-${itemIndex}`} className={`${itemRowClass} transition-colors duration-100`}>
                                          <td className="py-2 pr-3">
                                            <div className="flex items-center gap-2">
                                              <div className="h-10 w-10 overflow-hidden rounded border border-gray-200 bg-gray-100">
                                                {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                                              </div>
                                              <div className="min-w-0">
                                                <div className="break-words font-medium text-gray-800">{item.name}</div>
                                                {getVariantText(item) && <div className="break-words text-gray-400">{getVariantText(item)}</div>}
                                              </div>
                                            </div>
                                          </td>
                                          <td className="py-2 pr-3 font-mono text-gray-500">{item.sku || '-'}</td>
                                          <td className="py-2 text-center text-gray-700">{item.qty}</td>
                                          <td className="py-2 text-center text-gray-700">{item.packedQuantity}/{item.qty}</td>
                                          <td className="py-2 text-gray-600">{item.packedDate ? formatDateTime(item.packedDate) : '-'}</td>
                                          {isAdmin && (
                                            <td className="py-2 text-center">
                                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.fulfilledQuantity >= item.qty ? 'bg-green-100 text-green-700' : item.fulfilledQuantity > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {item.fulfilledQuantity}/{item.qty}
                                              </span>
                                            </td>
                                          )}
                                          <td className="py-2 text-left">
                                            <input type="checkbox" checked={Boolean(fullChecks[key])} disabled={remaining === 0} onChange={(event) => { setFullChecks((prev) => ({ ...prev, [key]: event.target.checked })); setPartialValues((prev) => ({ ...prev, [key]: event.target.checked ? remaining : 0 })); }} className="cursor-pointer rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50" />
                                          </td>
                                          <td className="py-2 text-center">
                                            <input type="number" min={0} max={remaining} value={Math.min(remaining, partialValues[key] ?? 0)} disabled={remaining === 0 || Boolean(fullChecks[key])} onChange={(event) => setPartialValues((prev) => ({ ...prev, [key]: clampNumber(event.target.value, remaining) }))} className="w-16 rounded border border-gray-300 px-2 py-1 text-center disabled:bg-gray-100" />
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </section>

                            <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                              <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">Actions</h3>
                              <button onClick={() => openConfirmPacked(order)} disabled={!canConfirmPacked} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400">Confirm packed</button>
                              <div className="mt-4 space-y-2 text-xs text-gray-500">
                                {order.packingConfirmations.filter((c) => !c.canceledAt).length === 0 ? <p>No packing history.</p> : order.packingConfirmations.filter((c) => !c.canceledAt).slice(0, 5).map((confirmation) => (
                                  <div key={confirmation.id} className="flex items-start justify-between gap-2 rounded border border-gray-200 p-2">
                                    <div>
                                      <div className="font-medium text-gray-700">Packed {formatDateTime(confirmation.confirmedAt)}</div>
                                      <div>{confirmation.lines.reduce((sum, line) => sum + line.quantity, 0)} item(s)</div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => openCancelPacked(order, confirmation.id)}
                                      className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                                      aria-label={`Cancel packed confirmation from ${formatDateTime(confirmation.confirmedAt)}`}
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m5-10l-1 13a1 1 0 01-1 .9H8a1 1 0 01-1-.9L6 7" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </section>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <OrdersPagination
          pagination={pagination}
          loading={loading}
          pageNumbers={pageNumbers}
          onPageChange={goToPage}
        />
      </div>

      {printModal && <PrintModal orders={printModal} setOrders={setPrintModal} onClose={() => setPrintModal(null)} onPrint={() => void printPickingSlips()} />}
      {notifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">{notifyModal.type === 'confirm' ? 'Confirm packed' : 'Cancel packed'}</h3>
              <p className="text-sm text-gray-500">Order {notifyModal.order.number}</p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">Notify users</span>
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
                  {recipients.map((recipient) => {
                    const isAdmin = recipient.role === 'admin';
                    return (
                      <label key={recipient.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${isAdmin ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}`}>
                        <input
                          type="checkbox"
                          checked={notifyModal.selectedUserIds.includes(recipient.id)}
                          readOnly={isAdmin}
                          disabled={isAdmin}
                          onChange={isAdmin ? undefined : () => setNotifyModal((prev) => prev ? { ...prev, selectedUserIds: prev.selectedUserIds.includes(recipient.id) ? prev.selectedUserIds.filter((id) => id !== recipient.id) : [...prev.selectedUserIds, recipient.id] } : prev)}
                          className={`rounded border-gray-300 text-blue-600 ${isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                        />
                        <span>{recipient.name}</span>
                        <span className="text-xs text-gray-400">{recipient.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <label className="block text-sm text-gray-700">
                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Email message (optional)</span>
                <textarea value={notifyModal.message} onChange={(event) => setNotifyModal((prev) => prev ? { ...prev, message: event.target.value } : prev)} rows={4} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
              <button onClick={() => setNotifyModal(null)} disabled={notifyModal.saving} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => void submitNotifyAction()} disabled={notifyModal.saving} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{notifyModal.saving ? 'Saving...' : 'Submit'}</button>
            </div>
          </div>
        </div>
      )}
      {noteModal && (
        <NoteModal
          state={noteModal}
          setState={setNoteModal}
          onClose={closeNoteModal}
          onSubmit={() => void submitNote()}
          onStartEdit={startEditNote}
          onCancelEdit={cancelEditNote}
          onDelete={(noteId) => void deleteNote(noteId)}
        />
      )}
      {messageModal && <MessageModal state={messageModal} setState={setMessageModal} recipients={recipients} onClose={() => !messageModal.sending && setMessageModal(null)} onSubmit={() => void submitMessage()} />}
    </main>
  );
}

function MultiSelectDropdown({
  refEl,
  open,
  setOpen,
  buttonLabel,
  allLabel,
  allActive,
  onClear,
  options,
  selectedValues,
  onToggle,
}: {
  refEl: RefObject<HTMLDivElement | null>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  buttonLabel: string;
  allLabel: string;
  allActive: boolean;
  onClear: () => void;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="relative" ref={refEl}>
      <button onClick={() => setOpen((prev) => !prev)} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50">
        {buttonLabel}
        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button onClick={onClear} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${allActive ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>
            {allLabel}
          </button>
          {options.length > 0 && <div className="my-1 border-t border-gray-100" />}
          {options.map((option) => (
            <CheckOption key={option.value} label={option.label} selected={selectedValues.includes(option.value)} onClick={() => onToggle(option.value)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
      <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
        {selected && (
          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="truncate text-gray-700">{label}</span>
    </button>
  );
}

function CalendarMonth({
  year,
  month,
  dateFrom,
  dateTo,
  hoverDate,
  onDateClick,
  onHoverDate,
}: {
  year: number;
  month: number;
  dateFrom: string;
  dateTo: string;
  hoverDate: string | null;
  onDateClick: (date: string) => void;
  onHoverDate: (date: string) => void;
}) {
  const days = getMonthDays(year, month);
  const today = new Date().toISOString().split('T')[0];
  const effectiveTo = !dateTo && hoverDate ? hoverDate : dateTo;
  const rangeStart = dateFrom && effectiveTo ? (dateFrom <= effectiveTo ? dateFrom : effectiveTo) : dateFrom;
  const rangeEnd = dateFrom && effectiveTo ? (dateFrom <= effectiveTo ? effectiveTo : dateFrom) : effectiveTo;

  return (
    <div>
      <div className="mb-1 grid grid-cols-7">
        {DAY_LABELS.map((label) => (
          <div key={label} className="flex h-6 w-8 select-none items-center justify-center text-xs font-medium text-gray-400">{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          if (!date) return <div key={index} className="h-8 w-8" />;
          const isStart = date === dateFrom;
          const isEnd = !!dateTo && date === dateTo;
          const inRange = !!(rangeStart && rangeEnd && date > rangeStart && date < rangeEnd);
          const isToday = date === today;
          let className = 'flex h-8 w-8 cursor-pointer select-none items-center justify-center text-xs transition-colors ';
          if (isStart || isEnd) className += 'rounded-full bg-blue-600 font-semibold text-white';
          else if (inRange) className += 'bg-blue-100 text-blue-800 hover:bg-blue-200';
          else if (isToday) className += 'rounded-full font-bold text-blue-500 hover:bg-gray-100';
          else className += 'rounded-full text-gray-700 hover:bg-gray-100';
          return (
            <button key={date} type="button" className={className} onClick={(event) => { event.stopPropagation(); onDateClick(date); }} onMouseEnter={() => onHoverDate(date)}>
              {new Date(`${date}T00:00:00`).getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusChips({ order, isAdmin }: { order: PickingOrder; isAdmin: boolean }) {
  const packClass = order.packingStatus === 'packed'
    ? 'bg-green-100 text-green-700 border-green-200'
    : order.packingStatus === 'partially_packed'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-gray-100 text-gray-600 border-gray-200';
  const packLabel = order.packingStatus === 'packed' ? 'Packed' : order.packingStatus === 'partially_packed' ? 'Partial Packed' : 'Pending';
  const fulfillmentClass = order.fulfillmentStatus === 'fulfilled'
    ? 'bg-green-100 text-green-700 border-green-200'
    : order.fulfillmentStatus === 'partial'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : '';
  const fulfillmentLabel = order.fulfillmentStatus === 'fulfilled' ? 'Fulfilled' : order.fulfillmentStatus === 'partial' ? 'Partial Fulfilled' : '';
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${packClass}`}>{packLabel}</span>
      {isAdmin && fulfillmentLabel && (
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${fulfillmentClass}`}>{fulfillmentLabel}</span>
      )}
      {order.printed && (
        <span className="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Slip Printed</span>
      )}
    </div>
  );
}

function PrintModal({ orders, setOrders, onClose, onPrint }: { orders: PrintOrder[]; setOrders: Dispatch<SetStateAction<PrintOrder[] | null>>; onClose: () => void; onPrint: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Print picking slip</h3>
            <p className="text-sm text-gray-500">{orders.length} order{orders.length === 1 ? '' : 's'}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">×</button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {orders.map((order) => (
            <section key={order.id} className="rounded-lg border border-gray-200">
              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div>
                  <div className="font-semibold text-gray-900">{order.storeName}</div>
                  <div className="text-sm text-gray-500">Order {order.number}</div>
                </div>
                <div className="text-sm text-gray-500">
                  <div>Print date: {new Date().toLocaleString()}</div>
                  <div>{order.customer}</div>
                </div>
              </div>
              <div className="overflow-x-auto p-4">
                <table className="w-full min-w-[760px] text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="w-[34%] py-2 pr-4 text-left font-medium">Item</th>
                      <th className="py-2 text-left font-medium">Others</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.printItems.map((item, itemIndex) => (
                      <Fragment key={`${order.id}-print-item-${item.id || itemIndex}-${itemIndex}`}>
                        <tr className={`align-top ${item.removed ? 'opacity-40' : ''}`}>
                          <td className="py-3 pr-4 text-gray-800">
                            <div className="text-sm font-semibold text-gray-900">{item.title || item.name}</div>
                            <div className="mt-1 text-gray-500"><span className="font-semibold uppercase">SKU:</span> <span className="font-mono">{item.sku || '-'}</span></div>
                          </td>
                          <td className="py-3">
                            <div className="grid grid-cols-[minmax(0,1fr)_5rem_2rem] items-end gap-3">
                              <label className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Variant</span>
                                <div className="truncate text-gray-700">{getVariantText(item) || '-'}</div>
                              </label>
                              <label>
                                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Qty</span>
                                <input type="number" min={1} max={getRemainingForPrint(item)} value={item.printQuantity} disabled={item.removed} onChange={(event) => updatePrintItem(setOrders, order.id, item.id, { printQuantity: clampNumber(event.target.value, getRemainingForPrint(item), 1) })} className="w-full rounded border border-gray-300 px-2 py-1 text-center disabled:bg-gray-100" />
                              </label>
                              <button type="button" onClick={() => updatePrintItem(setOrders, order.id, item.id, { removed: !item.removed })} className={`flex h-8 w-8 items-center justify-center rounded border ${item.removed ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-500 hover:bg-red-50 hover:text-red-600'}`} aria-label={item.removed ? 'Restore item' : 'Remove item'}>
                                {item.removed ? (
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6.3 3.7L4 10M4 15a8 8 0 0 0 13.7 5.3L20 14" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6 6 18M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <label>
                                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Location</span>
                                <input value={item.printLocation} disabled={item.removed} onChange={(event) => updatePrintItem(setOrders, order.id, item.id, { printLocation: event.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" />
                              </label>
                              <label>
                                <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Remark</span>
                                <input value={item.printRemark} disabled={item.removed} onChange={(event) => updatePrintItem(setOrders, order.id, item.id, { printRemark: event.target.value })} className="w-full rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" />
                              </label>
                            </div>
                          </td>
                        </tr>
                        <tr className={`border-b border-gray-100 ${item.removed ? 'opacity-40' : ''}`}>
                          <td colSpan={2} className="pb-3 pt-0">
                            <label>
                              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Note</span>
                              <textarea value={item.printNote} rows={3} disabled={item.removed} onChange={(event) => updatePrintItem(setOrders, order.id, item.id, { printNote: event.target.value })} className="w-full resize-none rounded border border-gray-300 px-2 py-1 disabled:bg-gray-100" />
                            </label>
                          </td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
          <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600">Cancel</button>
          <button onClick={onPrint} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Print</button>
        </div>
      </div>
    </div>
  );
}

function NoteModal({
  state,
  setState,
  onClose,
  onSubmit,
  onStartEdit,
  onCancelEdit,
  onDelete,
}: {
  state: NoteModalState;
  setState: Dispatch<SetStateAction<NoteModalState | null>>;
  onClose: () => void;
  onSubmit: () => void;
  onStartEdit: (note: Note) => void;
  onCancelEdit: () => void;
  onDelete: (noteId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="picking-order-notes-title" onClick={onClose}>
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 id="picking-order-notes-title" className="text-base font-semibold text-gray-900">Order notes</h3>
            <p className="mt-1 text-sm text-gray-500">Order {state.order.number} · {state.order.customer}</p>
          </div>
          <button type="button" onClick={onClose} disabled={state.saving || Boolean(state.deletingId)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
          {state.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading notes...</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">{state.editingNoteId ? 'Update note' : 'Add note'}</span>
                  <textarea value={state.note} onChange={(event) => setState((prev) => prev ? { ...prev, note: event.target.value, error: '' } : prev)} rows={8} maxLength={5000} disabled={state.saving} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100" placeholder="Write a note for this order" />
                </label>
                {state.error && <p className="text-sm text-red-600">{state.error}</p>}
                <div className="flex items-center gap-2">
                  {state.editingNoteId && (
                    <button type="button" onClick={onCancelEdit} disabled={state.saving} className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">Cancel</button>
                  )}
                  <button type="button" onClick={onSubmit} disabled={state.saving} className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {state.saving ? 'Saving...' : state.editingNoteId ? 'Update Note' : 'Add Note'}
                  </button>
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Notes</h4>
                {state.notes.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">No notes added yet.</div>
                ) : (
                  <div className="space-y-3">
                    {state.notes.map((note) => {
                      const wasEdited = note.updatedAt !== note.createdAt;
                      return (
                        <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">{note.authorName || note.authorEmail || 'Unknown user'}</p>
                              {note.authorEmail && note.authorName && <p className="truncate text-xs text-gray-500">{note.authorEmail}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button type="button" onClick={() => onStartEdit(note)} disabled={state.saving || Boolean(state.deletingId)} className="rounded-lg px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Edit</button>
                              <button type="button" onClick={() => onDelete(note.id)} disabled={state.saving || Boolean(state.deletingId)} className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{state.deletingId === note.id ? 'Deleting...' : 'Delete'}</button>
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{note.note}</p>
                          <p className="mt-2 text-xs text-gray-400">{formatDateTime(note.createdAt)}{wasEdited && ` · Edited ${formatDateTime(note.updatedAt)}`}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageModal({ state, setState, recipients, onClose, onSubmit }: { state: MessageModalState; setState: Dispatch<SetStateAction<MessageModalState | null>>; recipients: Recipient[]; onClose: () => void; onSubmit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0" role="dialog" aria-modal="true" aria-labelledby="picking-message-title" onClick={onClose}>
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div>
            <h3 id="picking-message-title" className="text-base font-semibold text-gray-900">Admin message</h3>
            <p className="mt-1 text-sm text-gray-500">Order {state.order.number} · {state.order.customer}</p>
          </div>
          <button type="button" onClick={onClose} disabled={state.sending} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Close">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
          {state.loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading messages...</div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Recipient</span>
                  <select value={state.selectedUserId} onChange={(event) => setState((prev) => prev ? { ...prev, selectedUserId: event.target.value } : prev)} disabled={state.sending || recipients.length === 0} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400">
                    {recipients.length === 0 ? <option value="">No active users</option> : recipients.map((recipient) => <option key={recipient.id} value={recipient.id}>{recipient.name} - {recipient.email}</option>)}
                  </select>
                </label>
                <label className="block text-sm text-gray-700">
                  <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Message</span>
                  <textarea value={state.message} onChange={(event) => setState((prev) => prev ? { ...prev, message: event.target.value, error: '' } : prev)} rows={7} maxLength={5000} disabled={state.sending} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100" placeholder="Write a message" />
                </label>
                {state.error && <p className="text-sm text-red-600">{state.error}</p>}
                <button type="button" onClick={onSubmit} disabled={state.sending || recipients.length === 0} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{state.sending ? 'Sending...' : 'Send Message'}</button>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Message history</h4>
                {state.messages.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">No messages sent yet.</div>
                ) : (
                  <div className="space-y-3">
                    {state.messages.map((message) => (
                      <div key={message.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800">{message.adminName}</p>
                            <p className="truncate text-xs text-gray-500">{message.adminEmail}</p>
                          </div>
                          <p className="text-xs text-gray-400 sm:text-right">{formatDateTime(message.createdAt)}</p>
                        </div>
                        {(message.senderName || message.senderEmail) && <p className="mt-1 text-xs text-gray-500">Sent by {[message.senderName, message.senderEmail].filter(Boolean).join(' - ')}</p>}
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{message.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function updatePrintItem(setOrders: Dispatch<SetStateAction<PrintOrder[] | null>>, orderId: string, itemId: string, patch: Partial<PrintItem>) {
  setOrders((prev) => prev ? prev.map((order) => order.id === orderId ? { ...order, printItems: order.printItems.map((item) => item.id === itemId ? { ...item, ...patch } : item) } : order) : prev);
}

function getRemainingForPrint(item: Pick<PickingItem, 'qty' | 'packedQuantity'>) {
  return Math.max(0, item.qty - item.packedQuantity);
}

function buildPickingSlipDocument(orders: PrintOrder[]) {
  return `<!doctype html>
<html>
<head>
  <title>Picking slips</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; }
    .page { min-height: 100vh; padding: 24px; page-break-after: always; }
    .slip { border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
    .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #d1d5db; background: #f9fafb; padding: 12px 16px; }
    .store { font-size: 14px; font-weight: 700; color: #111827; }
    .order { margin-top: 4px; font-size: 12px; color: #6b7280; }
    .meta { font-size: 12px; color: #6b7280; line-height: 1.5; text-align: right; }
    .content { padding: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px 6px; color: #6b7280; font-weight: 600; }
    td { border-bottom: 1px solid #f3f4f6; padding: 10px 6px; vertical-align: top; }
    tr.item-main td { border-bottom: 0; padding-bottom: 4px; }
    tr.item-note td { padding-top: 0; }
    .title { font-size: 14px; font-weight: 700; color: #111827; }
    .sku { margin-top: 4px; color: #6b7280; }
    .sku code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .label { font-weight: 700; text-transform: uppercase; color: #4b5563; }
    .qty { text-align: center; font-size: 16px; font-weight: 800; }
    .note { white-space: pre-wrap; }
    @media print { .page { min-height: auto; page-break-after: always; } .page:last-child { page-break-after: auto; } }
  </style>
</head>
<body>
  ${orders.map((order) => `
    <section class="page">
      <div class="slip">
        <div class="header">
          <div>
            <div class="store">${escapeHtml(order.storeName)}</div>
            <div class="order">Order ${escapeHtml(order.number)}</div>
          </div>
          <div class="meta">
            <div>Print date: ${escapeHtml(new Date().toLocaleString())}</div>
            <div>${escapeHtml(order.customer)}</div>
          </div>
        </div>
        <div class="content">
          <table>
            <thead>
              <tr><th style="width:34%">Item</th><th>Others</th></tr>
            </thead>
            <tbody>
              ${order.printItems.map((item) => `
                <tr class="item-main">
                  <td>
                    <div class="title">${escapeHtml(item.title || item.name)}</div>
                    <div class="sku"><span class="label">SKU:</span> <code>${escapeHtml(item.sku || '-')}</code></div>
                  </td>
                  <td>
                    <div><span class="label">Variant:</span> ${escapeHtml(getVariantText(item) || '-')} <span class="label">Qty:</span> <span class="qty">${escapeHtml(item.printQuantity)}</span></div>
                    <div><span class="label">Location:</span> ${escapeHtml(item.printLocation || '-')} <span class="label">Remark:</span> ${escapeHtml(item.printRemark || '-')}</div>
                  </td>
                </tr>
                <tr class="item-note">
                  <td colspan="2" class="note"><span class="label">Note:</span> ${escapeHtml(item.printNote || '-')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `).join('')}
</body>
</html>`;
}

function getVariantText(item: Pick<PickingItem, 'variantTitle' | 'variantOptions'>) {
  if (item.variantOptions.length > 0) return item.variantOptions.map((option) => `${option.name}: ${option.value}`).join(', ');
  return item.variantTitle || '';
}

function formatDateTime(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatSyncDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getMonthDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let index = 0; index < firstDay; index += 1) days.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return days;
}

function fmtCalDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const yearText = new Date().getFullYear() !== year ? ` ${year}` : '';
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} ${day}${yearText}`;
}

function clampNumber(value: string, max: number, min = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function getApiErrorMessage(json: { message?: string; errors?: string[] }, fallback: string) {
  if (json.errors && json.errors.length > 0) return json.errors.join(', ');
  return json.message || fallback;
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
