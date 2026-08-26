'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { printDocumentInHiddenFrame } from '@/lib/print';
import { getApiErrorMessage } from '@/lib/utils/api';
import type { ShippingLine } from '../../orders/modules/types';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useOrderNotes } from '@/hooks/useOrderNotes';
import { useOrderMessages } from '@/hooks/useOrderMessages';

export type { ShippingLine };
export type ApiRes<T> = { success: boolean; message: string; data: T; errors?: string[] };
export type PaginationState = { page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean };
export type PaginationItem = number | 'ellipsis';
export type StoreOption = { id: string; name: string; storeDomain: string };
export type Recipient = { id: string; name: string; email: string; role: string };
export type PickingLine = { lineItemId: string; quantity: number; full: boolean };
export type PickingItem = {
  id: string; productId: string | null; variantId: string | null;
  name: string; title: string; variantTitle: string;
  variantOptions: Array<{ name: string; value: string }>;
  imageUrl: string | null; sku: string; vendor: string;
  qty: number; packedQuantity: number; packedDate: string | null;
  lastPackedUpdate: string | null; fulfilledQuantity: number;
};
export type PackingConfirmation = { id: string; confirmedAt: string; canceledAt: string | null; lines: PickingLine[] };
export type PickingOrder = {
  id: string; number: number; customer: string; customerEmail: string | null;
  phone: string | null; address: string | null; address2: string | null;
  city: string | null; state: string | null; zip: string | null; country: string | null;
  note: string | null; canceled: boolean; closed: boolean; orderedAt: string;
  storeId: string; storeName: string; storeDomain: string;
  shippingLines: ShippingLine[]; items: PickingItem[]; vendors: string[];
  printed: boolean; lastPrintedAt: string | null;
  packingStatus: 'packed' | 'partially_packed' | 'not_packed';
  packedQuantity: number; totalQuantity: number;
  lastPackedAt: string | null; lastPackingUpdateAt: string | null;
  noteCount: number; messageCount: number; fulfillmentStatus: string | null;
  packingConfirmations: PackingConfirmation[];
};
export type LocationRemark = { id: string; location: string; remark: string };
export type PrintItem = PickingItem & { printQuantity: number; removed: boolean; locationRemarks: LocationRemark[]; printNote: string };
export type PrintOrder = PickingOrder & { printItems: PrintItem[] };
export type NotifyModalState = {
  type: 'confirm' | 'cancel'; order: PickingOrder;
  lines?: PickingLine[]; confirmationId?: string;
  selectedUserIds: string[]; message: string; saving: boolean;
};

export function rowItemKey(orderId: string, itemIndex: number) { return `${orderId}:${itemIndex}`; }
export function getShopifyThumbnailUrl(imageUrl: string, size = 40) {
  try {
    const url = new URL(imageUrl);
    url.searchParams.set('width', String(size));
    url.searchParams.set('height', String(size));
    url.searchParams.set('crop', 'center');
    return url.toString();
  } catch {
    return imageUrl;
  }
}
export function getRemaining(item: PickingItem) { return Math.max(0, item.qty - item.packedQuantity); }
export function getRemainingForPrint(item: Pick<PickingItem, 'qty' | 'packedQuantity'>) { return Math.max(0, item.qty - item.packedQuantity); }
export function clampNumber(value: string, max: number, min = 0) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}
export function formatDateTime(value: string) { if (!value) return '-'; return new Date(value).toLocaleString(); }
export function createLocationRemark(): LocationRemark {
  return { id: crypto.randomUUID(), location: '', remark: '' };
}
export function getVariantText(item: Pick<PickingItem, 'variantTitle' | 'variantOptions'>) {
  if (item.variantOptions.length > 0) return item.variantOptions.map((o) => `${o.name}: ${o.value}`).join(', ');
  return item.variantTitle || '';
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function buildPickingSlipDocument(orders: PrintOrder[]) {
  return `<!doctype html><html><head><title>Picking slips</title><style>
    * { box-sizing: border-box; } body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @page { size: A4; margin: 12mm; }
    .page { page-break-after: always; } .page:last-child { page-break-after: auto; }
    table.slip { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px; }
    thead { display: table-header-group; } tfoot { display: table-footer-group; }
    tbody.item { break-inside: avoid; page-break-inside: avoid; }
    .head-cell { padding: 0; border-bottom: 1px solid #d1d5db; }
    .header { display: flex; justify-content: space-between; gap: 16px; background: #f9fafb; padding: 12px 16px; }
    .store { font-size: 14px; font-weight: 700; color: #111827; } .order { margin-top: 4px; font-size: 12px; color: #6b7280; }
    .meta { font-size: 12px; color: #6b7280; line-height: 1.5; text-align: right; }
    th { text-align: left; border-bottom: 1px solid #e5e7eb; padding: 8px 10px; color: #6b7280; font-weight: 600; }
    td { border-bottom: 1px solid #f3f4f6; padding: 10px; vertical-align: top; }
    tr.item-main td { border-bottom: 0; padding-bottom: 4px; } tr.item-note td { padding-top: 0; border-bottom: 0; }
    tr.item-space td { padding-top: 0; padding-bottom: 12px; }
    .title { font-size: 14px; font-weight: 700; color: #111827; } .sku { margin-top: 4px; color: #6b7280; }
    .sku code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .label { font-weight: 700; text-transform: uppercase; color: #4b5563; } .qty { text-align: center; font-size: 16px; font-weight: 800; }
    .note { white-space: pre-wrap; }
    table.space { width: 100%; border-collapse: collapse; }
    table.space td.space-col { width: 50%; height: 18mm; vertical-align: top; padding: 6px 6px 0; border: 0; }
    .space-label { display: inline-block; border-bottom: 1px solid #111827; padding-bottom: 2px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #4b5563; }
  </style></head><body>
  ${orders.map((o) => `<section class="page"><table class="slip">
    <thead>
      <tr><th colspan="2" class="head-cell"><div class="header">
        <div><div class="store">${escapeHtml(o.storeName)}</div><div class="order">Order ${escapeHtml(o.number)}</div></div>
        <div class="meta"><div>Print date: ${escapeHtml(new Date().toLocaleString())}</div><div>${escapeHtml(o.customer)}</div></div>
      </div></th></tr>
      <tr><th style="width:34%">Item</th><th>Others</th></tr>
    </thead>
    ${o.printItems.map((item) => `<tbody class="item">
      <tr class="item-main"><td><div class="title">${escapeHtml(item.title || item.name)}</div>
      <div class="sku"><span class="label">SKU:</span> <code>${escapeHtml(item.sku || '-')}</code></div></td>
      <td><div><span class="label">Variant:</span> ${escapeHtml(getVariantText(item) || '-')} <span class="label">Qty:</span> <span class="qty">${escapeHtml(item.printQuantity)}</span></div>
      ${item.locationRemarks.map((entry) => `<div><span class="label">Location:</span> ${escapeHtml(entry.location || '-')} <span class="label">Remark:</span> ${escapeHtml(entry.remark || '-')}</div>`).join('')}</td></tr>
      <tr class="item-note"><td colspan="2" class="note"><span class="label">Note:</span> ${escapeHtml(item.printNote || '-')}</td></tr>
      <tr class="item-space"><td colspan="2"><table class="space"><tbody><tr>
        <td class="space-col"><span class="space-label">Quantity Note</span></td>
        <td class="space-col"><span class="space-label">Location Note</span></td>
      </tr></tbody></table></td></tr>
    </tbody>`).join('')}
  </table></section>`).join('')}
  </body></html>`;
}

const DEFAULT_PAGINATION: PaginationState = { page: 1, pageSize: 20, total: 0, totalPages: 1, hasPrev: false, hasNext: false };

export function usePickingListPage() {
  const initialSearch = typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('search')?.trim() ?? '';
  const [orders, setOrders] = useState<PickingOrder[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [packingRecipients, setPackingRecipients] = useState<Recipient[]>([]);
  const [packingDefaultRecipientUserIds, setPackingDefaultRecipientUserIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [searchField, setSearchField] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [period, setPeriod] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('all');
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
  const [calendarNav, setCalendarNav] = useState(() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }; });
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [fullChecks, setFullChecks] = useState<Record<string, boolean>>({});
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshingIds, setRefreshingIds] = useState<Record<string, boolean>>({});
  const [printModal, setPrintModal] = useState<PrintOrder[] | null>(null);
  const [notifyModal, setNotifyModal] = useState<NotifyModalState | null>(null);

  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const packedStatusDropdownRef = useRef<HTMLDivElement>(null);
  const printStatusDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const syncStoreDropdownRef = useRef<HTMLDivElement>(null);

  const { syncJob, lastSynced, syncActive, syncRefreshNeeded, setSyncRefreshNeeded, syncing, triggerSync } = useSyncStatus({ syncStoreIds, onError: setError });
  const { noteModal, setNoteModal, openNoteModal, closeNoteModal, startEditNote, cancelEditNote, submitNote, deleteNote } = useOrderNotes<PickingOrder>({
    onCountChange: (orderId, count, delta) => {
      setOrders((prev) => prev.map((item) => item.id !== orderId ? item : { ...item, noteCount: delta !== 0 ? Math.max(0, item.noteCount + delta) : count }));
    },
  });
  const { messageModal, setMessageModal, openMessageModal, closeMessageModal, submitMessage } = useOrderMessages<PickingOrder>({
    messageType: 'picker',
    onCountChange: (orderId, delta) => {
      if (delta > 0) setOrders((prev) => prev.map((item) => item.id === orderId ? { ...item, messageCount: item.messageCount + delta } : item));
    },
  });

  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput.trim()); setPagination((p) => ({ ...p, page: 1 })); }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(pagination.page)); p.set('pageSize', String(pagination.pageSize));
    p.set('period', period === 'custom' ? 'all' : period);
    if (search) p.set('search', search);
    if (searchField) p.set('searchField', searchField);
    storeIds.forEach((id) => p.append('storeId', id));
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    packedStatuses.forEach((s) => p.append('packedStatus', s));
    printStatuses.forEach((s) => p.append('printStatus', s));
    return p.toString();
  }, [dateFrom, dateTo, packedStatuses, pagination.page, pagination.pageSize, period, printStatuses, search, searchField, storeIds]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await fetch(`/api/picking-list?${queryString}`);
        const json = (await res.json()) as ApiRes<{ orders: PickingOrder[]; stores: StoreOption[]; packingRecipients: Recipient[]; packingDefaultRecipientUserIds: string[]; messageRecipients: Recipient[]; messageDefaultRecipientUserIds: string[]; pagination: PaginationState }>;
        if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load picking list'));
        if (cancelled) return;
        setOrders(json.data.orders); setStores(json.data.stores);
        setPackingRecipients(json.data.packingRecipients);
        setPackingDefaultRecipientUserIds(json.data.packingDefaultRecipientUserIds);
        setPagination(json.data.pagination);
        setSelectedIds((prev) => prev.filter((id) => json.data.orders.some((o) => o.id === id)));
        setExpandedIds((prev) => prev.filter((id) => json.data.orders.some((o) => o.id === id)));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load picking list');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [queryString, refreshToken]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(t)) setSearchDropdownOpen(false);
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(t)) setStoreDropdownOpen(false);
      if (packedStatusDropdownRef.current && !packedStatusDropdownRef.current.contains(t)) setPackedStatusDropdownOpen(false);
      if (printStatusDropdownRef.current && !printStatusDropdownRef.current.contains(t)) setPrintStatusDropdownOpen(false);
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(t)) setPeriodDropdownOpen(false);
      if (syncStoreDropdownRef.current && !syncStoreDropdownRef.current.contains(t)) setSyncStoreDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageNumbers = useMemo<PaginationItem[]>(() => {
    const total = pagination.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    if (pagination.page <= 2) return [1, 2, 3, 'ellipsis', total];
    if (pagination.page >= total - 1) return [1, 'ellipsis', total - 2, total - 1, total];
    return [1, 'ellipsis', pagination.page - 1, pagination.page, pagination.page + 1, 'ellipsis', total];
  }, [pagination.page, pagination.totalPages]);

  const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
  const allPageSelected = orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));
  const allSelectedExpanded = selectedIds.length > 0 && selectedIds.every((id) => expandedIds.includes(id));
  const defaultPackedStatuses = ['not_packed', 'partially_packed'];
  const isPackedStatusDefault = packedStatuses.length === defaultPackedStatuses.length && defaultPackedStatuses.every((s) => packedStatuses.includes(s));
  const hasActiveFilters = searchInput !== '' || searchField !== '' || storeIds.length > 0 || period !== 'all' || !!dateFrom || !!dateTo || !isPackedStatusDefault || printStatuses.length > 0;
  const syncMessage = syncActive
    ? syncJob?.status === 'queued' ? 'Sync queued' : `Syncing: ${syncJob?.totalFetched ?? 0} fetched`
    : lastSynced || 'Not synced yet';

  function getPickingLines(order: PickingOrder) {
    return order.items.map((item, index) => {
      const key = rowItemKey(order.id, index);
      const remaining = getRemaining(item);
      const full = Boolean(fullChecks[key]);
      const quantity = full ? remaining : Math.min(remaining, Math.max(0, partialValues[key] ?? 0));
      return quantity > 0 ? { lineItemId: item.id, quantity, full } : null;
    }).filter((line): line is PickingLine => Boolean(line));
  }

  function setOrderFullChecks(order: PickingOrder, checked: boolean) {
    setFullChecks((prev) => {
      const next = { ...prev };
      order.items.forEach((item, i) => { if (getRemaining(item) > 0) next[rowItemKey(order.id, i)] = checked; });
      return next;
    });
    setPartialValues((prev) => {
      const next = { ...prev };
      order.items.forEach((item, i) => { if (getRemaining(item) > 0) next[rowItemKey(order.id, i)] = checked ? getRemaining(item) : 0; });
      return next;
    });
  }

  function toggleAllPage() {
    if (allPageSelected) setSelectedIds((prev) => prev.filter((id) => !orders.some((o) => o.id === id)));
    else setSelectedIds((prev) => Array.from(new Set([...prev, ...orders.map((o) => o.id)])));
  }

  function toggleBulkView(targetIds: string[]) {
    if (targetIds.length === 0) return;
    setExpandedIds((prev) => {
      const allExpanded = targetIds.every((id) => prev.includes(id));
      if (allExpanded) return prev.filter((id) => !targetIds.includes(id));
      const next = [...prev];
      for (const id of targetIds) if (!next.includes(id)) next.push(id);
      return next;
    });
  }

  function toggleStore(id: string) { setStoreIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]); setPagination((p) => ({ ...p, page: 1 })); }
  function toggleFilter(value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) { setter((prev) => prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]); setPagination((p) => ({ ...p, page: 1 })); }
  function toggleSyncStore(id: string) { setSyncStoreIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]); }

  function handlePeriodChange(value: 'all' | 'week' | 'month' | 'year' | 'custom') {
    setPeriod(value);
    if (value !== 'custom') { setDateFrom(''); setDateTo(''); setHoverDate(null); setPeriodDropdownOpen(false); }
    setPagination((p) => ({ ...p, page: 1 }));
  }

  function handleCalendarDateClick(date: string) {
    if (!dateFrom || (dateFrom && dateTo)) { setDateFrom(date); setDateTo(''); setHoverDate(null); setPeriod('custom'); setPagination((p) => ({ ...p, page: 1 })); return; }
    const [start, end] = date >= dateFrom ? [dateFrom, date] : [date, dateFrom];
    setDateFrom(start); setDateTo(end); setHoverDate(null); setPeriodDropdownOpen(false); setPeriod('custom'); setPagination((p) => ({ ...p, page: 1 }));
  }

  function clearFilters() { setSearchInput(''); setSearch(''); setSearchField(''); setStoreIds([]); setPeriod('all'); setDateFrom(''); setDateTo(''); setHoverDate(null); setPackedStatuses(['not_packed', 'partially_packed']); setPrintStatuses([]); setPagination((p) => ({ ...p, page: 1 })); }
  function refreshList() { setRefreshRotation((prev) => prev + 360); setSyncRefreshNeeded(false); setRefreshToken((v) => v + 1); }
  function goToPage(page: number) { setPagination((p) => ({ ...p, page })); }
  const handleSync = () => void triggerSync();

  async function refreshOrder(order: PickingOrder) {
    setRefreshingIds((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/picking-list/orders/${encodeURIComponent(order.id)}/refresh`, { method: 'POST' });
      const json = (await res.json()) as ApiRes<PickingOrder>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to refresh order'));
      setOrders((prev) => prev.map((item) => item.id === order.id ? json.data : item));
      toast.success(`Order ${order.number} refreshed from Shopify`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to refresh order'); }
    finally { setRefreshingIds((prev) => ({ ...prev, [order.id]: false })); }
  }

  function openConfirmPacked(order: PickingOrder) {
    const lines = getPickingLines(order);
    if (lines.length === 0) { toast.error('Select Full or enter a partial quantity before confirming packed.'); return; }
    setNotifyModal({ type: 'confirm', order, lines, selectedUserIds: packingDefaultRecipientUserIds, message: '', saving: false });
  }

  function openCancelPacked(order: PickingOrder, confirmationId?: string) {
    const active = confirmationId
      ? order.packingConfirmations.find((c) => c.id === confirmationId && !c.canceledAt)
      : order.packingConfirmations.find((c) => !c.canceledAt);
    if (!active) { toast.error('This order has no active packed confirmation to cancel.'); return; }
    setNotifyModal({ type: 'cancel', order, confirmationId: active.id, selectedUserIds: packingDefaultRecipientUserIds, message: '', saving: false });
  }

  async function submitNotifyAction() {
    if (!notifyModal || notifyModal.saving) return;
    setNotifyModal((prev) => prev ? { ...prev, saving: true } : prev);
    try {
      const isConfirm = notifyModal.type === 'confirm';
      const res = await fetch(
        isConfirm ? `/api/orders/${notifyModal.order.id}/packing-confirmations` : `/api/orders/${notifyModal.order.id}/packing-confirmations/${notifyModal.confirmationId}`,
        { method: isConfirm ? 'POST' : 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines: notifyModal.lines ?? [], notifyUserIds: notifyModal.selectedUserIds, notifyMessage: notifyModal.message }) }
      );
      const json = (await res.json()) as ApiRes<{ order: PickingOrder }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Packing update failed'));
      setOrders((prev) => prev.map((o) => o.id === json.data.order.id ? json.data.order : o));
      setNotifyModal(null);
      toast.success(isConfirm ? 'Packed quantities confirmed' : 'Packed confirmation canceled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Packing update failed');
      setNotifyModal((prev) => prev ? { ...prev, saving: false } : prev);
    }
  }

  function openPrintModal(targetOrders: PickingOrder[]) {
    if (targetOrders.length === 0) { toast.error('Select at least one order to print.'); return; }
    setPrintModal(targetOrders.map((o) => ({
      ...o,
      printItems: o.items.filter((item) => getRemaining(item) > 0).map((item) => ({ ...item, printQuantity: getRemaining(item), removed: false, locationRemarks: [createLocationRemark()], printNote: '' })),
    })));
  }

  async function printPickingSlips() {
    if (!printModal) return;
    const printableOrders = printModal.map((o) => ({ ...o, printItems: o.printItems.filter((item) => !item.removed && item.printQuantity > 0) })).filter((o) => o.printItems.length > 0);
    if (printableOrders.length === 0) { toast.error('At least one item must remain on the picking slip.'); return; }
    try { await printDocumentInHiddenFrame(buildPickingSlipDocument(printableOrders)); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Unable to start print. Please try again.'); return; }
    try {
      const res = await fetch('/api/picking-list/prints', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: printableOrders.map((o) => ({ orderId: o.id, items: o.printItems.map((item) => ({ lineItemId: item.id, name: item.name, sku: item.sku, variant: getVariantText(item), quantity: item.printQuantity, locationRemarks: item.locationRemarks.map(({ location, remark }) => ({ location, remark })), note: item.printNote })) })) }),
      });
      const json = (await res.json()) as ApiRes<{ printedOrderIds: string[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to record print'));
      const now = new Date().toISOString();
      setOrders((prev) => prev.map((o) => json.data.printedOrderIds.includes(o.id) ? { ...o, printed: true, lastPrintedAt: now } : o));
      setPrintModal(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to record print'); }
  }

  return {
    orders, stores, packingRecipients, pagination, searchInput, setSearchInput,
    searchField, setSearchField, searchDropdownOpen, setSearchDropdownOpen, searchDropdownRef,
    storeIds, period, setPeriod, dateFrom, setDateFrom, dateTo, setDateTo,
    packedStatuses, setPackedStatuses, printStatuses, setPrintStatuses,
    storeDropdownOpen, setStoreDropdownOpen, storeDropdownRef,
    packedStatusDropdownOpen, setPackedStatusDropdownOpen, packedStatusDropdownRef,
    printStatusDropdownOpen, setPrintStatusDropdownOpen, printStatusDropdownRef,
    periodDropdownOpen, setPeriodDropdownOpen, periodDropdownRef,
    syncStoreDropdownOpen, setSyncStoreDropdownOpen, syncStoreDropdownRef, syncStoreIds,
    calendarNav, setCalendarNav, hoverDate, setHoverDate,
    expandedIds, setExpandedIds, selectedIds, setSelectedIds,
    fullChecks, setFullChecks, partialValues, setPartialValues,
    loading, error, refreshRotation, refreshingIds,
    printModal, setPrintModal, notifyModal, setNotifyModal,
    setPagination, setSyncStoreIds,
    syncJob, syncActive, syncRefreshNeeded, setSyncRefreshNeeded, syncing, triggerSync,
    noteModal, setNoteModal, openNoteModal, closeNoteModal, startEditNote, cancelEditNote, submitNote, deleteNote,
    messageModal, setMessageModal, openMessageModal, closeMessageModal, submitMessage,
    pageNumbers, selectedOrders, allPageSelected, allSelectedExpanded, hasActiveFilters, syncMessage,
    getPickingLines, setOrderFullChecks, toggleAllPage, toggleBulkView,
    toggleStore, toggleFilter, toggleSyncStore,
    handlePeriodChange, handleCalendarDateClick, clearFilters, refreshList, goToPage,
    handleSync, refreshOrder, openConfirmPacked, openCancelPacked, submitNotifyAction,
    openPrintModal, printPickingSlips,
  };
}
