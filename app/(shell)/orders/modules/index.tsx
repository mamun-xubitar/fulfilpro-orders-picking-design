'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { isStaffLikeRole, isTestUserRole } from '@/lib/roles';
import type {
  AdminOption,
  ApiResponse,
  BackInStockItem,
  BackInStockRequest,
  FulfillmentConfirmation,
  FulfillmentEditRequestRow,
  FulfillmentLine,
  PendingFulfillmentModalState,
  MessageModalState,
  NoteModalState,
  StockModalState,
  StockAdjustmentModalState,
  EditFulfillmentModalState,
  CancelFulfillmentModalState,
  RequestPermissionModalState,
  OrderAdminMessage,
  OrderItem,
  OrderNote,
  OrderRow,
  OrderSyncJob,
  PackingSlipLabel,
  Pagination,
  StoreOption,
} from './types';
import { DEFAULT_PAGINATION, PERIODS, SHOPIFY_TRACKING_CARRIERS, STATUS_MAP } from './constants';
import { buildPackingSlipDocument, buildPackingSlipLoadingDocument, waitForPrintAssets, writePrintDocument } from './packingSlipPrint';
import PendingRequestsPanel from './PendingRequestsPanel';
import OrdersPagination from './OrdersPagination';
import OrdersToolbar from './OrdersToolbar';
import OrderModals from './OrderModals';
import {
  formatShippingMoney,
  formatStockStatus,
  formatSyncDate,
  getApiErrorMessage,
  getOrderAddressLines,
  getShippingDiscountCodes,
  getShippingLineFinalPrice,
  getStockStatusChip,
  isOrderFulfillmentLocked,
  type PaginationItem,
} from './utils';

export default function OrdersPage() {
  const getInitialSearch = () => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('search')?.trim() ?? '';
  };
  const initialSearch = getInitialSearch();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fulfillmentStatuses, setFulfillmentStatuses] = useState<string[]>([]);
  const [packingStatuses, setPackingStatuses] = useState<string[]>([]);
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
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncJob, setSyncJob] = useState<OrderSyncJob | null>(null);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState('');
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [syncRefreshNeeded, setSyncRefreshNeeded] = useState(false);
  const [refreshingOrderIds, setRefreshingOrderIds] = useState<Record<string, boolean>>({});
  const [fullChecks, setFullChecks] = useState<Record<string, boolean>>({});
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});
  const [fulMessages, setFulMessages] = useState<Record<string, string>>({});
  const [fulSaving, setFulSaving] = useState<Record<string, boolean>>({});
  const [carrierDropdownOpen, setCarrierDropdownOpen] = useState(false);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [pendingFulfillment, setPendingFulfillment] = useState<PendingFulfillmentModalState | null>(null);
  const [messageModal, setMessageModal] = useState<MessageModalState | null>(null);
  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);
  const [stockModal, setStockModal] = useState<StockModalState | null>(null);
  const [stockAdjustmentModal, setStockAdjustmentModal] = useState<StockAdjustmentModalState | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [fulfillmentViewOrderId, setFulfillmentViewOrderId] = useState<string | null>(null);
  const { data: session } = useSession();
  const userRole = (session?.user?.role as string) ?? '';
  const userIsAdmin = userRole === 'admin';
  const userIsStaff = isStaffLikeRole(userRole);
  const userIsTest = isTestUserRole(userRole);
  const [orderFulfillmentRequests, setOrderFulfillmentRequests] = useState<Record<string, FulfillmentEditRequestRow[]>>({});
  const [pendingRequests, setPendingRequests] = useState<FulfillmentEditRequestRow[]>([]);
  const [pendingRequestsPanelOpen, setPendingRequestsPanelOpen] = useState(false);
  const [editFulModal, setEditFulModal] = useState<EditFulfillmentModalState | null>(null);
  const [cancelFulModal, setCancelFulModal] = useState<CancelFulfillmentModalState | null>(null);
  const [requestPermModal, setRequestPermModal] = useState<RequestPermissionModalState | null>(null);
  const [syncStoreIds, setSyncStoreIds] = useState<string[]>([]);
  const [syncStoreDropdownOpen, setSyncStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const packingStatusDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const syncStoreDropdownRef = useRef<HTMLDivElement>(null);
  const messageTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const activeSyncJobIdRef = useRef<string | null>(null);
  const completedSyncJobIdRef = useRef<string | null>(null);
  const fullSelectBtnRef = useRef<HTMLButtonElement>(null);
  const trackingNumInputRef = useRef<HTMLInputElement>(null);

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
    fulfillmentStatuses.forEach((s) => params.append('status', s));
    packingStatuses.forEach((s) => params.append('packingStatus', s));
    return params.toString();
  }, [pagination.page, pagination.pageSize, period, search, storeIds, dateFrom, dateTo, fulfillmentStatuses, packingStatuses]);

  const filteredTrackingCarriers = useMemo(() => {
    const query = carrierSearch.trim();
    if (!query) return SHOPIFY_TRACKING_CARRIERS;

    const matchingCarriers = SHOPIFY_TRACKING_CARRIERS.filter((carrier) => (
      carrier.toLowerCase().includes(query.toLowerCase())
    ));
    const hasExactMatch = matchingCarriers.some((carrier) => carrier.toLowerCase() === query.toLowerCase());

    return hasExactMatch ? matchingCarriers : [query, ...matchingCarriers];
  }, [carrierSearch]);

  const loadSyncStatus = useCallback(async (refreshAfterCompletion = false) => {
    const res = await fetch('/api/orders/sync');
    const json = (await res.json()) as ApiResponse<{
      activeJob: OrderSyncJob | null;
      lastSuccessfulJob: OrderSyncJob | null;
      latestJob: OrderSyncJob | null;
    }>;

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Failed to load Shopify order sync status');
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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Shopify order sync status');
        }
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

    const fetchOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/orders?${queryString}`);
        const json = (await res.json()) as ApiResponse<{
          orders: OrderRow[];
          stores: StoreOption[];
          pagination: Pagination;
        }>;

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load orders');
        }
        if (cancelled) return;

        setOrders(json.data.orders);
        setStores(json.data.stores);
        setPagination(json.data.pagination);
        setExpandedId(search ? json.data.orders[0]?.id ?? null : null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setOrders([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [queryString, refreshToken, search]);

  const handleRefresh = () => {
    setRefreshRotation((prev) => prev + 360);
    setSyncRefreshNeeded(false);
    setRefreshToken((prev) => prev + 1);
  };

  const blockTestModeAction = () => {
    if (!userIsTest) return false;
    toast.error('This action is not allowed in test mode.');
    return true;
  };

  const refreshSingleOrder = async (order: OrderRow) => {
    if (blockTestModeAction()) return;
    if (refreshingOrderIds[order.id]) return;

    setRefreshingOrderIds((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/refresh`, {
        method: 'POST',
      });
      const json = (await res.json()) as ApiResponse<OrderRow>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to refresh order'));
      }

      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? json.data : item
      )));
      toast.success(`Order ${order.number} refreshed.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh order.');
    } finally {
      setRefreshingOrderIds((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleSync = async () => {
    if (blockTestModeAction()) return;
    if (syncJob && (syncJob.status === 'queued' || syncJob.status === 'running')) return;

    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/orders/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeIds: syncStoreIds.length > 0 ? syncStoreIds : undefined }),
      });
      const json = (await res.json()) as ApiResponse<{
        job: OrderSyncJob;
        alreadyRunning: boolean;
      }>;

      if ((!res.ok && res.status !== 409) || !json.success) {
        throw new Error(json.message || 'Failed to queue Shopify order sync');
      }

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
  };

  const rowItemKey = (orderId: string, itemIndex: number) => `${orderId}-${itemIndex}`;

  const isLineFullyFulfilled = (order: OrderRow, item: OrderItem) => getFulfilledQty(order, item.id) >= item.qty;

  const isLineFullChecked = (order: OrderRow, item: OrderItem, itemIndex: number) => {
    return isLineFullyFulfilled(order, item) || (fullChecks[rowItemKey(order.id, itemIndex)] ?? false);
  };

  const getFulfillmentRowClass = (
    fulfilledQty: number,
    itemQty: number,
    remainingQty: number,
    isFull: boolean,
    partialValue: number,
  ) => {
    const baseClass = 'border-b border-blue-100 transition-colors duration-150';

    if (itemQty > 0 && fulfilledQty >= itemQty) {
      return `${baseClass} bg-emerald-100`;
    }

    if ((isFull || partialValue >= remainingQty) && remainingQty > 0) {
      return `${baseClass} bg-blue-100`;
    }

    if (partialValue > 0) {
      return `${baseClass} bg-pink-100`;
    }

    if (fulfilledQty > 0) {
      return `${baseClass} bg-purple-100`;
    }

    return baseClass;
  };

  const toggleFull = (orderId: string, itemIndex: number, remainingQty: number) => {
    const key = rowItemKey(orderId, itemIndex);
    const nextChecked = !(fullChecks[key] ?? false);
    setFullChecks((prev) => ({ ...prev, [key]: nextChecked }));
    setPartialValues((prev) => ({ ...prev, [key]: nextChecked ? remainingQty : 0 }));
  };

  const toggleAllFull = (order: OrderRow) => {
    const allChecked = order.items.every((item, itemIndex) => isLineFullChecked(order, item, itemIndex));
    const nextValue = !allChecked;

    setFullChecks((prev) => {
      const updated = { ...prev };
      order.items.forEach((item, itemIndex) => {
        if (!isLineFullyFulfilled(order, item)) {
          updated[rowItemKey(order.id, itemIndex)] = nextValue;
        }
      });
      return updated;
    });

    setPartialValues((prev) => {
      const updated = { ...prev };
      order.items.forEach((item, itemIndex) => {
        const fulfilledQty = getFulfilledQty(order, item.id);
        const remainingQty = Math.max(0, item.qty - fulfilledQty);
        updated[rowItemKey(order.id, itemIndex)] = nextValue ? remainingQty : 0;
      });
      return updated;
    });

    if (!allChecked) {
      setTimeout(() => {
        fullSelectBtnRef.current?.click()
      }, 100);
    }
  };

  const validPartial = (orderId: string, itemIndex: number, maxQty: number, value: string) => {
    const parsed = parseInt(value, 10);
    const clamped = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed > maxQty ? maxQty : parsed;
    setPartialValues((prev) => ({ ...prev, [rowItemKey(orderId, itemIndex)]: clamped }));
  };

  const getFulfilledQty = (order: OrderRow, lineItemId: string) => {
    return order.fulfillmentItems.confirmations.reduce((sum, confirmation) => {
      return sum + confirmation.lines.reduce((lineSum, line) => (
        line.lineItemId === lineItemId ? lineSum + line.quantity : lineSum
      ), 0);
    }, 0);
  };

  const isOrderFullyFulfilled = (order: OrderRow) => {
    const totalQuantity = order.items.reduce((sum, item) => sum + Math.max(0, item.qty), 0);
    const fulfilledQuantity = order.fulfillmentItems.confirmations.reduce((sum, confirmation) => {
      return sum + confirmation.lines.reduce((lineSum, line) => lineSum + line.quantity, 0);
    }, 0);
    return totalQuantity > 0 && fulfilledQuantity >= totalQuantity;
  };

  const getFulfillmentLines = (order: OrderRow) => {
    return order.items
      .map((item, itemIndex) => {
        const key = rowItemKey(order.id, itemIndex);
        const fulfilledQty = getFulfilledQty(order, item.id);
        const remainingQty = Math.max(0, item.qty - fulfilledQty);
        const isFull = isLineFullChecked(order, item, itemIndex);
        const requestedQty = Math.min(remainingQty, Math.max(0, partialValues[key] ?? 0));
        const quantity = isFull ? remainingQty : requestedQty;

        if (quantity < 1) return null;

        return {
          lineItemId: item.id,
          quantity,
          full: isFull,
        };
      })
      .filter((line): line is FulfillmentLine => Boolean(line));
  };

  const parseBarcodes = (value: string) => {
    return value.split(/\s+/).map((barcode) => barcode.trim()).filter(Boolean);
  };

  const getFulfillmentInfo = (order: OrderRow) => {
    return order.fulfillmentItems.confirmations
      .map((confirmation) => ({
        date: confirmation.fulfillmentDate?.trim() ?? '',
        carrier: confirmation.trackingInfo?.company?.trim() ?? '',
        trackingNumber: confirmation.trackingInfo?.number?.trim() ?? '',
        trackingUrl: confirmation.trackingInfo?.url?.trim() ?? '',
      }))
      .filter((info) => info.date || info.carrier || info.trackingNumber);
  };

  const formatFulfillmentDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;

    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getBackInStockEligibleItems = (order: OrderRow) => {
    return order.items
      .map((item) => {
        const fulfilledQty = getFulfilledQty(order, item.id);
        const remainingQty = Math.max(0, item.qty - fulfilledQty);
        return {
          lineItemId: item.id,
          name: item.name,
          sku: item.sku,
          vendor: item.vendor,
          remainingQty,
        };
      })
      .filter((item) => item.remainingQty > 0);
  };

  const createDefaultStockItem = (order: OrderRow): BackInStockItem => {
    const firstItem = getBackInStockEligibleItems(order)[0];
    return {
      lineItemId: firstItem?.lineItemId ?? '',
      dueDate: '',
      supplierName: firstItem?.vendor ?? '',
      quantity: firstItem?.remainingQty ?? 1,
      item: firstItem?.name ?? '',
    };
  };

  const getAvailableStockItemsForRow = (order: OrderRow, items: BackInStockItem[], rowIndex: number) => {
    const selectedIds = new Set(
      items
        .map((item, index) => (index === rowIndex ? '' : item.lineItemId))
        .filter(Boolean)
    );
    return getBackInStockEligibleItems(order).filter((item) => !selectedIds.has(item.lineItemId));
  };

  const hasStockItemAvailableToAdd = (order: OrderRow, items: BackInStockItem[]) => {
    return getBackInStockEligibleItems(order).some((item) => (
      !items.some((selected) => selected.lineItemId === item.lineItemId)
    ));
  };

  const setFulfillmentMessage = (orderId: string, message: string) => {
    setFulMessages((prev) => ({ ...prev, [orderId]: message }));
    if (messageTimerRef.current[orderId]) {
      clearTimeout(messageTimerRef.current[orderId]);
    }
    messageTimerRef.current[orderId] = setTimeout(() => {
      setFulMessages((prev) => ({ ...prev, [orderId]: '' }));
    }, 3000);
  };

  const openFulfillmentConfirmation = (order: OrderRow) => {
    if (blockTestModeAction()) return;

    if (isOrderFulfillmentLocked(order)) {
      toast.error(`${order.status === 'closed' ? 'Closed' : 'Canceled'} orders cannot be fulfilled.`);
      return;
    }

    const lines = getFulfillmentLines(order);

    if (lines.length === 0) {
      toast.error('Increase a quantity or check Full for an item with remaining stock.');
      return;
    }

    setPendingFulfillment({
      order,
      lines,
      notifyCustomer: true,
      barcodeInput: '',
      trackingNumber: '',
      trackingUrl: '',
      trackingCompany: 'Australia Post',
    });
    setCarrierDropdownOpen(false);
    setCarrierSearch('');
    setTimeout(() => {
      trackingNumInputRef.current?.focus();
    }, 100);
  };

  const closeFulfillmentConfirmation = () => {
    if (!pendingFulfillment || fulSaving[pendingFulfillment.order.id]) return;
    setPendingFulfillment(null);
    setCarrierDropdownOpen(false);
    setCarrierSearch('');
  };

  const confirmFul = async () => {
    if (!pendingFulfillment) return;
    if (blockTestModeAction()) return;

    const { order, lines, notifyCustomer, barcodeInput, trackingNumber, trackingUrl, trackingCompany } = pendingFulfillment;
    const barcodes = parseBarcodes(barcodeInput);
    const trimmedTrackingNumber = trackingNumber.trim();
    const trimmedTrackingCompany = trackingCompany.trim();

    if (trimmedTrackingCompany && !trimmedTrackingNumber) {
      toast.error('Tracking number is required when a shipping carrier is selected.');
      return;
    }

    const trackingInfo = {
      number: trimmedTrackingNumber,
      url: trackingUrl.trim(),
      company: trimmedTrackingCompany,
    };
    setFulSaving((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines,
          notifyCustomer,
          trackingInfo,
          barcodes,
        }),
      });
      const json = (await res.json()) as ApiResponse<{
        orderId: string;
        status: string;
        fulfillmentItems: OrderRow['fulfillmentItems'];
        stockAdjustment: OrderRow['stockAdjustment'];
      }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to confirm fulfillment'));
      }

      setOrders((prev) => prev.map((item) => (
        item.id === order.id
          ? { ...item, status: json.data.status, fulfillmentItems: json.data.fulfillmentItems, stockAdjustment: json.data.stockAdjustment }
          : item
      )));
      setFulfillmentMessage(order.id, 'Fulfilment confirmed!');
      setPendingFulfillment(null);
      setCarrierDropdownOpen(false);
      setCarrierSearch('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm fulfillment.');
    } finally {
      setFulSaving((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const loadFulfillmentRequests = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/fulfillment-requests?orderId=${encodeURIComponent(orderId)}`);
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow[]>;
      if (res.ok && json.success) {
        setOrderFulfillmentRequests((prev) => ({ ...prev, [orderId]: json.data }));
      }
    } catch { /* silent */ }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/fulfillment-requests?pending=true');
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow[]>;
      if (res.ok && json.success) {
        setPendingRequests(json.data);
      }
    } catch { /* silent */ }
  }, []);

  const getActiveFulfillmentRequest = (orderId: string, fulfillmentId: string | undefined, requestType: 'edit' | 'cancel') => {
    if (!fulfillmentId) return null;
    const requests = orderFulfillmentRequests[orderId] ?? [];
    return requests.find((r) =>
      r.fulfillmentId === fulfillmentId &&
      r.requestType === requestType &&
      (r.status === 'pending' || r.status === 'approved') &&
      new Date(r.expiresAt) > new Date()
    ) ?? null;
  };

  const openEditFulModal = (order: OrderRow, conf: FulfillmentConfirmation, confId: string) => {
    if (blockTestModeAction()) return;

    setEditFulModal({
      order, conf, confId,
      barcodes: conf.barcodes?.join(' ') ?? '',
      fulfillmentDate: conf.fulfillmentDate ?? '',
      carrier: conf.trackingInfo?.company ?? '',
      trackingNumber: conf.trackingInfo?.number ?? '',
      trackingUrl: conf.trackingInfo?.url ?? '',
      saving: false, error: '',
    });
  };

  const submitEditFulfillment = async () => {
    if (!editFulModal) return;
    if (blockTestModeAction()) return;
    const { order, confId, barcodes, fulfillmentDate, carrier, trackingNumber, trackingUrl } = editFulModal;
    setEditFulModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfillments/${encodeURIComponent(confId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodes: barcodes.split(/\s+/).filter(Boolean),
          fulfillmentDate: fulfillmentDate || null,
          trackingInfo: { number: trackingNumber.trim(), url: trackingUrl.trim(), company: carrier.trim() },
        }),
      });
      const json = (await res.json()) as ApiResponse<{ orderId: string; fulfillmentItems: OrderRow['fulfillmentItems'] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to update fulfillment'));
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, fulfillmentItems: json.data.fulfillmentItems } : o));
      setOrderFulfillmentRequests((prev) => {
        const updated = (prev[order.id] ?? []).map((r) =>
          r.fulfillmentId === confId && r.requestType === 'edit' && r.status === 'approved'
            ? { ...r, status: 'completed' as const } : r
        );
        return { ...prev, [order.id]: updated };
      });
      toast.success('Fulfillment updated.');
      setEditFulModal(null);
    } catch (err) {
      setEditFulModal((prev) => prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to update' } : null);
    }
  };

  const openCancelFulModal = (order: OrderRow, conf: FulfillmentConfirmation, confId: string) => {
    if (blockTestModeAction()) return;

    setCancelFulModal({ order, conf, confId, saving: false, error: '' });
  };

  const submitCancelFulfillment = async () => {
    if (!cancelFulModal) return;
    if (blockTestModeAction()) return;
    const { order, confId } = cancelFulModal;
    setCancelFulModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfillments/${encodeURIComponent(confId)}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<{ orderId: string; status: string; fulfillmentItems: OrderRow['fulfillmentItems']; stockAdjustment: OrderRow['stockAdjustment'] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to cancel fulfillment'));
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: json.data.status, fulfillmentItems: json.data.fulfillmentItems, stockAdjustment: json.data.stockAdjustment } : o));
      setOrderFulfillmentRequests((prev) => {
        const updated = (prev[order.id] ?? []).map((r) =>
          r.fulfillmentId === confId && r.requestType === 'cancel' && r.status === 'approved'
            ? { ...r, status: 'completed' as const } : r
        );
        return { ...prev, [order.id]: updated };
      });
      toast.success('Fulfillment cancelled.');
      setCancelFulModal(null);
    } catch (err) {
      setCancelFulModal((prev) => prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to cancel' } : null);
    }
  };

  const openRequestPermModal = async (order: OrderRow, conf: FulfillmentConfirmation, confId: string, requestType: 'edit' | 'cancel') => {
    if (blockTestModeAction()) return;

    setRequestPermModal({ order, conf, confId, requestType, availableAdmins: [], selectedAdminIds: [], reason: '', loadingAdmins: true, saving: false, error: '' });
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/messages`);
      const json = (await res.json()) as ApiResponse<{ admins: AdminOption[]; messages: unknown[] }>;
      if (res.ok && json.success) {
        setRequestPermModal((prev) => prev ? { ...prev, availableAdmins: json.data.admins, loadingAdmins: false } : null);
      } else {
        setRequestPermModal((prev) => prev ? { ...prev, loadingAdmins: false, error: 'Failed to load admin list' } : null);
      }
    } catch {
      setRequestPermModal((prev) => prev ? { ...prev, loadingAdmins: false, error: 'Failed to load admin list' } : null);
    }
  };

  const submitPermissionRequest = async () => {
    if (!requestPermModal) return;
    if (blockTestModeAction()) return;
    const { order, confId, requestType, selectedAdminIds, reason } = requestPermModal;
    if (!reason.trim()) { setRequestPermModal((prev) => prev ? { ...prev, error: 'Reason is required' } : null); return; }
    if (selectedAdminIds.length === 0) { setRequestPermModal((prev) => prev ? { ...prev, error: 'Select at least one admin' } : null); return; }
    setRequestPermModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch('/api/fulfillment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, orderNumber: order.number, fulfillmentId: confId, requestType, adminIds: selectedAdminIds, reason: reason.trim() }),
      });
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to submit request'));
      setOrderFulfillmentRequests((prev) => ({ ...prev, [order.id]: [...(prev[order.id] ?? []), json.data] }));
      toast.success('Permission request submitted. Admin has been notified.');
      setRequestPermModal(null);
    } catch (err) {
      setRequestPermModal((prev) => prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to submit' } : null);
    }
  };

  const handleAdminApproveRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/fulfillment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to approve'));
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success('Request approved. Staff can now perform the action.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const handleAdminRejectRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/fulfillment-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const json = (await res.json()) as ApiResponse<FulfillmentEditRequestRow>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to reject'));
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.info('Request rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  const printPackingSlipLabel = async (order: OrderRow) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Unable to open print window. Please allow popups for this site.');
      return;
    }

    setPrintingOrderId(order.id);
    writePrintDocument(printWindow, buildPackingSlipLoadingDocument(order.number));

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/packing-slip`);
      const json = (await res.json()) as ApiResponse<PackingSlipLabel>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load packing slip label'));
      }

      writePrintDocument(printWindow, buildPackingSlipDocument(json.data, window.location.origin));
      await waitForPrintAssets(printWindow);
      printWindow.focus();
      window.setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (err) {
      printWindow.close();
      toast.error(err instanceof Error ? err.message : 'Failed to load packing slip label.');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const openMessageModal = async (order: OrderRow) => {
    setMessageModal({
      order,
      admins: [],
      messages: [],
      selectedAdminId: '',
      message: '',
      loading: true,
      sending: false,
      error: '',
    });

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/messages`);
      const json = (await res.json()) as ApiResponse<{
        admins: AdminOption[];
        messages: OrderAdminMessage[];
      }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load order messages'));
      }

      setMessageModal((prev) => {
        if (!prev || prev.order.id !== order.id) return prev;
        return {
          ...prev,
          admins: json.data.admins,
          messages: json.data.messages,
          selectedAdminId: json.data.admins[0]?.id ?? '',
          loading: false,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? { ...item, messageCount: json.data.messages.length } : item
      )));
    } catch (err) {
      setMessageModal((prev) => (
        prev && prev.order.id === order.id
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load order messages.' }
          : prev
      ));
    }
  };

  const closeMessageModal = () => {
    if (messageModal?.sending) return;
    setMessageModal(null);
  };

  const submitAdminMessage = async () => {
    if (!messageModal || messageModal.sending) return;
    if (blockTestModeAction()) return;

    const message = messageModal.message.trim();
    if (!messageModal.selectedAdminId || !message) {
      setMessageModal((prev) => prev ? { ...prev, error: 'Select an admin and enter a message.' } : prev);
      return;
    }

    setMessageModal((prev) => prev ? { ...prev, sending: true, error: '' } : prev);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(messageModal.order.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: messageModal.selectedAdminId,
          message,
        }),
      });
      const json = (await res.json()) as ApiResponse<OrderAdminMessage>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to send message'));
      }

      setMessageModal((prev) => {
        if (!prev || prev.order.id !== messageModal.order.id) return prev;
        return {
          ...prev,
          messages: [json.data, ...prev.messages],
          message: '',
          sending: false,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === messageModal.order.id ? { ...item, messageCount: item.messageCount + 1 } : item
      )));
      toast.success('Message sent to admin.');
    } catch (err) {
      setMessageModal((prev) => (
        prev ? { ...prev, sending: false, error: err instanceof Error ? err.message : 'Failed to send message.' } : prev
      ));
    }
  };

  const openNoteModal = async (order: OrderRow) => {
    setNoteModal({
      order,
      notes: [],
      note: '',
      editingNoteId: null,
      loading: true,
      saving: false,
      deletingId: null,
      error: '',
    });

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/notes`);
      const json = (await res.json()) as ApiResponse<OrderNote[]>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load order notes'));
      }

      setNoteModal((prev) => {
        if (!prev || prev.order.id !== order.id) return prev;
        return {
          ...prev,
          notes: json.data,
          loading: false,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? { ...item, noteCount: json.data.length } : item
      )));
    } catch (err) {
      setNoteModal((prev) => (
        prev && prev.order.id === order.id
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load order notes.' }
          : prev
      ));
    }
  };

  const closeNoteModal = () => {
    if (noteModal?.saving || noteModal?.deletingId) return;
    setNoteModal(null);
  };

  const startEditNote = (note: OrderNote) => {
    setNoteModal((prev) => prev ? { ...prev, note: note.note, editingNoteId: note.id, error: '' } : prev);
  };

  const cancelEditNote = () => {
    setNoteModal((prev) => prev ? { ...prev, note: '', editingNoteId: null, error: '' } : prev);
  };

  const submitOrderNote = async () => {
    if (!noteModal || noteModal.saving) return;
    if (blockTestModeAction()) return;

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
      const json = (await res.json()) as ApiResponse<OrderNote>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, editingNoteId ? 'Failed to update note' : 'Failed to add note'));
      }

      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        const notes = editingNoteId
          ? prev.notes.map((item) => item.id === editingNoteId ? json.data : item)
          : [json.data, ...prev.notes];
        return {
          ...prev,
          notes,
          note: '',
          editingNoteId: null,
          saving: false,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === orderId
          ? { ...item, noteCount: editingNoteId ? item.noteCount : item.noteCount + 1 }
          : item
      )));
      toast.success(editingNoteId ? 'Note updated.' : 'Note added.');
    } catch (err) {
      setNoteModal((prev) => (
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to save note.' } : prev
      ));
    }
  };

  const deleteOrderNote = async (noteId: string) => {
    if (!noteModal || noteModal.deletingId) return;
    if (blockTestModeAction()) return;
    if (!window.confirm('Delete this note?')) return;

    const orderId = noteModal.order.id;
    setNoteModal((prev) => prev ? { ...prev, deletingId: noteId, error: '' } : prev);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/notes/${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as ApiResponse<{ id: string }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to delete note'));
      }

      setNoteModal((prev) => {
        if (!prev || prev.order.id !== orderId) return prev;
        const notes = prev.notes.filter((item) => item.id !== noteId);
        return {
          ...prev,
          notes,
          note: prev.editingNoteId === noteId ? '' : prev.note,
          editingNoteId: prev.editingNoteId === noteId ? null : prev.editingNoteId,
          deletingId: null,
        };
      });
      setOrders((prev) => prev.map((item) => (
        item.id === orderId ? { ...item, noteCount: Math.max(0, item.noteCount - 1) } : item
      )));
      toast.info('Note deleted.');
    } catch (err) {
      setNoteModal((prev) => (
        prev ? { ...prev, deletingId: null, error: err instanceof Error ? err.message : 'Failed to delete note.' } : prev
      ));
    }
  };

  const openStockModal = async (order: OrderRow) => {
    setStockModal({
      order,
      requests: [],
      items: [createDefaultStockItem(order)],
      message: '',
      loading: true,
      saving: false,
      error: '',
    });

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/back-in-stock`);
      const json = (await res.json()) as ApiResponse<BackInStockRequest[]>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load back in stock requests'));
      }

      setStockModal((prev) => (
        prev && prev.order.id === order.id ? { ...prev, requests: json.data, loading: false } : prev
      ));
    } catch (err) {
      setStockModal((prev) => (
        prev && prev.order.id === order.id
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load back in stock requests.' }
          : prev
      ));
    }
  };

  const closeStockModal = () => {
    if (stockModal?.saving) return;
    setStockModal(null);
  };

  const updateStockItem = (index: number, field: keyof BackInStockItem, value: string) => {
    setStockModal((prev) => {
      if (!prev) return prev;
      const eligibleItems = getBackInStockEligibleItems(prev.order);
      const items = prev.items.map((item, itemIndex) => (
        itemIndex === index
          ? (() => {
            if (field === 'lineItemId') {
              const selected = eligibleItems.find((eligible) => eligible.lineItemId === value);
              return {
                ...item,
                lineItemId: value,
                item: selected?.name ?? '',
                supplierName: selected?.vendor ?? '',
                quantity: selected?.remainingQty ?? 1,
              };
            }
            if (field === 'quantity') {
              const selected = eligibleItems.find((eligible) => eligible.lineItemId === item.lineItemId);
              const maxQty = selected?.remainingQty ?? 1;
              return { ...item, quantity: Math.min(Math.max(1, Number(value) || 1), maxQty) };
            }
            return { ...item, [field]: value };
          })()
          : item
      ));
      return { ...prev, items, error: '' };
    });
  };

  const addStockItem = () => {
    setStockModal((prev) => {
      if (!prev) return prev;
      const nextItem = getBackInStockEligibleItems(prev.order).find((item) => (
        !prev.items.some((selected) => selected.lineItemId === item.lineItemId)
      ));
      if (!nextItem) return { ...prev, error: 'No more products available to add.' };
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            lineItemId: nextItem.lineItemId,
            dueDate: '',
            supplierName: nextItem.vendor,
            quantity: nextItem.remainingQty,
            item: nextItem.name,
          },
        ],
        error: '',
      };
    });
  };

  const removeStockItem = (index: number) => {
    setStockModal((prev) => {
      if (!prev || prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index), error: '' };
    });
  };

  const submitStockRequest = async () => {
    if (!stockModal || stockModal.saving) return;
    if (blockTestModeAction()) return;

    const items = stockModal.items.map((item) => ({
      lineItemId: item.lineItemId.trim(),
      dueDate: item.dueDate.trim(),
      supplierName: item.supplierName.trim(),
      quantity: Number(item.quantity),
      item: item.item.trim(),
    }));
    const eligibleItems = getBackInStockEligibleItems(stockModal.order);
    const eligibleIds = new Set(eligibleItems.map((item) => item.lineItemId));

    if (eligibleItems.length === 0) {
      setStockModal((prev) => prev ? { ...prev, error: 'No product to request back in stock.' } : prev);
      return;
    }

    if (items.some((item) => !eligibleIds.has(item.lineItemId) || !item.dueDate || !item.supplierName || !item.item || !Number.isFinite(item.quantity) || item.quantity <= 0)) {
      setStockModal((prev) => prev ? { ...prev, error: 'Complete every product detail before submitting.' } : prev);
      return;
    }

    setStockModal((prev) => prev ? { ...prev, saving: true, error: '' } : prev);
    try {
      const res = await fetch('/api/back-in-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: stockModal.order.id,
          items,
          message: stockModal.message.trim(),
        }),
      });
      const json = (await res.json()) as ApiResponse<BackInStockRequest>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to submit back in stock request'));
      }

      setStockModal((prev) => (
        prev && prev.order.id === stockModal.order.id
          ? { ...prev, requests: [json.data], saving: false, message: '', error: '' }
          : prev
      ));
      setOrders((prev) => prev.map((item) => (
        item.id === stockModal.order.id
          ? { ...item, stockRequestCount: Math.max(1, item.stockRequestCount), backInStockStatus: json.data.status }
          : item
      )));
      toast.success('Back in stock request submitted.');
    } catch (err) {
      setStockModal((prev) => (
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to submit back in stock request.' } : prev
      ));
    }
  };

  const openStockAdjustmentModal = async (order: OrderRow) => {
    if (!userIsAdmin) return;

    setStockAdjustmentModal({
      order,
      adjustment: order.stockAdjustment,
      managedLineItemIds: order.stockAdjustment?.items.filter((item) => item.managed).map((item) => item.lineItemId) ?? [],
      note: order.stockAdjustment?.note ?? '',
      loading: true,
      saving: false,
      error: '',
    });

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/stock-adjustment`);
      const json = (await res.json()) as ApiResponse<OrderRow['stockAdjustment']>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load stock adjustment'));
      }

      setStockAdjustmentModal((prev) => (
        prev && prev.order.id === order.id
          ? {
            ...prev,
            adjustment: json.data,
            managedLineItemIds: json.data?.items.filter((item) => item.managed).map((item) => item.lineItemId) ?? [],
            note: json.data?.note ?? '',
            loading: false,
          }
          : prev
      ));
      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? { ...item, stockAdjustment: json.data } : item
      )));
    } catch (err) {
      setStockAdjustmentModal((prev) => (
        prev && prev.order.id === order.id
          ? { ...prev, loading: false, error: err instanceof Error ? err.message : 'Failed to load stock adjustment.' }
          : prev
      ));
    }
  };

  const closeStockAdjustmentModal = () => {
    if (stockAdjustmentModal?.saving) return;
    setStockAdjustmentModal(null);
  };

  const toggleManagedStockAdjustmentItem = (lineItemId: string) => {
    setStockAdjustmentModal((prev) => {
      if (!prev) return prev;
      const exists = prev.managedLineItemIds.includes(lineItemId);
      return {
        ...prev,
        managedLineItemIds: exists
          ? prev.managedLineItemIds.filter((id) => id !== lineItemId)
          : [...prev.managedLineItemIds, lineItemId],
        error: '',
      };
    });
  };

  const submitStockAdjustment = async () => {
    if (!stockAdjustmentModal || stockAdjustmentModal.saving || !stockAdjustmentModal.adjustment) return;
    if (blockTestModeAction()) return;

    const orderId = stockAdjustmentModal.order.id;
    setStockAdjustmentModal((prev) => prev ? { ...prev, saving: true, error: '' } : prev);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/stock-adjustment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managedLineItemIds: stockAdjustmentModal.managedLineItemIds,
          note: stockAdjustmentModal.note.trim(),
        }),
      });
      const json = (await res.json()) as ApiResponse<NonNullable<OrderRow['stockAdjustment']>>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to update stock adjustment'));
      }

      setStockAdjustmentModal((prev) => prev ? {
        ...prev,
        adjustment: json.data,
        managedLineItemIds: json.data.items.filter((item) => item.managed).map((item) => item.lineItemId),
        note: json.data.note ?? '',
        saving: false,
      } : prev);
      setOrders((prev) => prev.map((item) => (
        item.id === orderId ? { ...item, stockAdjustment: json.data } : item
      )));
      toast.success('Stock adjustment updated.');
    } catch (err) {
      setStockAdjustmentModal((prev) => (
        prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to update stock adjustment.' } : prev
      ));
    }
  };

  const handleStoreToggle = (id: string) => {
    setStoreIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSyncStoreToggle = (id: string) => {
    setSyncStoreIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
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
    setPeriod('all');
    setDateFrom('');
    setDateTo('');
    setHoverDate(null);
    setFulfillmentStatuses([]);
    setPackingStatuses([]);
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
    const timers = messageTimerRef.current;
    return () => {
      Object.values(timers).forEach((timerId) => clearTimeout(timerId));
    };
  }, []);

  useEffect(() => {
    if (userIsAdmin) void loadPendingRequests();
  }, [userIsAdmin, loadPendingRequests]);

  useEffect(() => {
    if (!fulfillmentViewOrderId) return;
    void loadFulfillmentRequests(fulfillmentViewOrderId);
  }, [fulfillmentViewOrderId, loadFulfillmentRequests]);

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
      if (packingStatusDropdownRef.current && !packingStatusDropdownRef.current.contains(e.target as Node)) {
        setPackingStatusDropdownOpen(false);
      }
      if (syncStoreDropdownRef.current && !syncStoreDropdownRef.current.contains(e.target as Node)) {
        setSyncStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = searchInput !== '' || storeIds.length > 0 || period !== 'all' || !!dateFrom || !!dateTo || fulfillmentStatuses.length > 0 || packingStatuses.length > 0;
  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
  const syncMessage = syncActive
    ? syncJob.status === 'queued'
      ? 'Sync queued'
      : `Syncing: ${syncJob.totalFetched} fetched`
    : lastSynced || 'Not synced yet';

  return (
    <main className="flex-1 p-4 md:p-6">
      {userIsAdmin && (
        <PendingRequestsPanel
          pendingRequests={pendingRequests}
          open={pendingRequestsPanelOpen}
          onToggle={() => setPendingRequestsPanelOpen((prev) => !prev)}
          onApprove={(requestId) => void handleAdminApproveRequest(requestId)}
          onReject={(requestId) => void handleAdminRejectRequest(requestId)}
        />
      )}
      <OrdersToolbar
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        stores={stores}
        storeIds={storeIds}
        setStoreIds={setStoreIds}
        storeDropdownOpen={storeDropdownOpen}
        setStoreDropdownOpen={setStoreDropdownOpen}
        storeDropdownRef={storeDropdownRef}
        period={period}
        dateFrom={dateFrom}
        dateTo={dateTo}
        periodDropdownOpen={periodDropdownOpen}
        setPeriodDropdownOpen={setPeriodDropdownOpen}
        periodDropdownRef={periodDropdownRef}
        calendarNav={calendarNav}
        setCalendarNav={setCalendarNav}
        setHoverDate={setHoverDate}
        handlePeriodChange={handlePeriodChange}
        handleCalendarDateClick={handleCalendarDateClick}
        fulfillmentStatuses={fulfillmentStatuses}
        setFulfillmentStatuses={setFulfillmentStatuses}
        statusDropdownOpen={statusDropdownOpen}
        setStatusDropdownOpen={setStatusDropdownOpen}
        statusDropdownRef={statusDropdownRef}
        packingStatuses={packingStatuses}
        packingStatusDropdownOpen={packingStatusDropdownOpen}
        setPackingStatusDropdownOpen={setPackingStatusDropdownOpen}
        packingStatusDropdownRef={packingStatusDropdownRef}
        handlePackingStatusToggle={handlePackingStatusToggle}
        hasActiveFilters={hasActiveFilters}
        handleClearFilters={handleClearFilters}
        handleStoreToggle={handleStoreToggle}
        handleStatusToggle={handleStatusToggle}
        syncStoreDropdownRef={syncStoreDropdownRef}
        syncStoreDropdownOpen={syncStoreDropdownOpen}
        setSyncStoreDropdownOpen={setSyncStoreDropdownOpen}
        handleSync={handleSync}
        syncing={syncing}
        loading={loading}
        syncActive={syncActive}
        syncStoreIds={syncStoreIds}
        setSyncStoreIds={setSyncStoreIds}
        handleSyncStoreToggle={handleSyncStoreToggle}
        handleRefresh={handleRefresh}
        syncRefreshNeeded={syncRefreshNeeded}
        refreshRotation={refreshRotation}
        syncMessage={syncMessage}
        setPagination={setPagination}
        hoverDate={hoverDate}
        setDateFrom={setDateFrom}
        setDateTo={setDateTo}
        setPeriod={setPeriod}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order No.</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordered At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                {userIsAdmin && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Adjustment</th>
                )}
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fulfillment</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Note</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={userIsAdmin ? 11 : 10} className="text-center text-gray-400 py-12 text-sm">Loading orders...</td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={userIsAdmin ? 11 : 10} className="text-center text-red-500 py-12 text-sm">{error}</td>
                </tr>
              )}

              {!loading && !error && orders.length === 0 && (
                <tr>
                  <td colSpan={userIsAdmin ? 11 : 10} className="text-center text-gray-400 py-16 text-sm">No orders found.</td>
                </tr>
              )}

              {!loading && !error && orders.map((order, index) => {
                const statusKey = order.status.toLowerCase();
                const status = STATUS_MAP[statusKey] ?? STATUS_MAP.pending;
                const isExpanded = expandedId === order.id;
                const orderAddressLines = getOrderAddressLines(order);
                const fulfillmentInfo = getFulfillmentInfo(order);
                const isFullyFulfilled = isOrderFullyFulfilled(order);
                const hasBackInStockSignal = Boolean(order.backInStockStatus && !isFullyFulfilled);
                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`border-b border-gray-100 ${hasBackInStockSignal ? 'bg-amber-50 hover:bg-amber-100' : status.row ?? 'hover:bg-gray-50'} transition-colors duration-100`}
                    >
                      <td className="hidden sm:table-cell px-4 py-3 text-gray-400 text-xs">
                        {(pagination.page - 1) * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{order.number}</td>
                      <td className="hidden md:table-cell px-4 py-3 text-sm text-gray-600">{order.storeName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{order.customer}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(order.orderedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.chip}`}>
                            {status.label}
                          </span>
                          {order.packingStatus === 'packed' && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                              Packed
                            </span>
                          )}
                          {order.packingStatus === 'partially_packed' && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700">
                              Partial Packed
                            </span>
                          )}
                          {hasBackInStockSignal && order.backInStockStatus && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStockStatusChip(order.backInStockStatus)}`}>
                              {formatStockStatus(order.backInStockStatus)}
                            </span>
                          )}
                        </div>
                      </td>
                      {userIsAdmin && (
                        <td className="px-4 py-3 text-center">
                          {order.stockAdjustment ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openStockAdjustmentModal(order);
                              }}
                              className={`inline-flex min-w-14 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                                order.stockAdjustment.status === 'managed'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : order.stockAdjustment.status === 'partial'
                                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                              aria-label={`Manage stock adjustment for order ${order.number}`}
                            >
                              {order.stockAdjustment.managedCount}/{order.stockAdjustment.totalCount}
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </td>
                      )}
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                        {order.itemsCount} item{order.itemsCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {fulfillmentInfo.length > 0 ? (
                          <div className="space-y-2">
                            {fulfillmentInfo.map((info, infoIndex) => (
                              <div key={infoIndex}>
                                {infoIndex > 0 && <div className="border-t border-gray-200 my-2" />}
                                <div className="space-y-0.5">
                                  {info.date && (
                                    <div className="text-gray-700 font-medium">{formatFulfillmentDate(info.date)}</div>
                                  )}
                                  {info.carrier && (
                                    <div className="text-gray-500">{info.carrier}</div>
                                  )}
                                  {info.trackingNumber && (
                                    <div>
                                      {info.trackingUrl ? (
                                        <a
                                          href={info.trackingUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          {info.trackingNumber}
                                        </a>
                                      ) : (
                                        <span className="text-gray-600">{info.trackingNumber}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="tooltip inline-flex">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void openNoteModal(order);
                            }}
                            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 cursor-pointer"
                            aria-label={`Order ${order.number} notes`}
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <div className="tooltip">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedId((prev) => (prev === order.id ? null : order.id));
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-150 cursor-pointer text-xs font-medium"
                            >
                              {isExpanded ? '▲' : '▼'}
                            </button>
                            <span className="tt">View Details</span>
                          </div>
                          <div className="tooltip">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void refreshSingleOrder(order);
                              }}
                              disabled={refreshingOrderIds[order.id]}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <svg
                                className={`w-4 h-4 ${refreshingOrderIds[order.id] ? 'animate-spin' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            <span className="tt">Refresh Order</span>
                          </div>
                          <div className="tooltip">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void printPackingSlipLabel(order);
                              }}
                              disabled={printingOrderId === order.id || isFullyFulfilled}
                              className={`p-1.5 rounded-lg transition-colors duration-150 ${printingOrderId === order.id || isFullyFulfilled
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700 cursor-pointer'
                                }`}
                            >
                              {printingOrderId === order.id ? (
                                <span className="block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" aria-label="Loading label" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              )}
                            </button>
                            <span className="tt">Print Label</span>
                          </div>
                          <div className="tooltip">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void openMessageModal(order);
                              }}
                              disabled={isFullyFulfilled}
                              className={`relative p-1.5 rounded-lg transition-colors duration-150 ${isFullyFulfilled
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600 cursor-pointer'
                                }`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.4-3.5A7.5 7.5 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {order.messageCount > 0 && (
                                <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                                  {order.messageCount > 99 ? '99+' : order.messageCount}
                                </span>
                              )}
                            </button>
                            <span className="tt">Admin Messages</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={userIsAdmin ? 11 : 10} className="p-0">
                          <div className="relative bg-gray-100 border-b border-gray-200 p-5">
                            <div className="absolute top-3 right-4">
                              {fulfillmentViewOrderId === order.id ? (
                                <button
                                  onClick={() => setFulfillmentViewOrderId(null)}
                                  className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                  Back
                                </button>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => void openStockModal(order)}
                                    className="relative flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-50 cursor-pointer"
                                  >
                                    Request Stock
                                    {order.stockRequestCount > 0 && (
                                      <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-4 text-white">
                                        {order.stockRequestCount > 99 ? '99+' : order.stockRequestCount}
                                      </span>
                                    )}
                                  </button>
                                  {order.fulfillmentItems.confirmations.length > 0 && (
                                    <button
                                      onClick={() => setFulfillmentViewOrderId(order.id)}
                                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-50 cursor-pointer"
                                    >
                                      Fulfillments
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,400px)]">
                              <div className="w-full lg:max-w-[300px]">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer &amp; Order</h4>
                                <p className="text-sm font-semibold text-gray-800">{order.customer}</p>
                                {orderAddressLines.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {orderAddressLines.map((line) => (
                                      <p key={line}>{line}</p>
                                    ))}
                                  </div>
                                )}
                                {order.shippingLines?.length > 0 && (
                                  <div className="mt-3 space-y-1.5">
                                    <h5 className="text-[11px] font-semibold uppercase text-gray-400">Shipping</h5>
                                    {order.shippingLines.map((line, lineIndex) => {
                                      const finalPrice = getShippingLineFinalPrice(line);
                                      const isFree = finalPrice <= 0;
                                      const discountCodes = getShippingDiscountCodes(line);
                                      return (
                                        <div key={line.id || `${order.id}-shipping-${lineIndex}`} className="rounded-md border border-blue-100 bg-white/70 px-2.5 py-2 text-xs text-gray-600">
                                          <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="font-medium text-gray-800">{line.title || line.code || 'Shipping'}</span>
                                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                              {isFree ? 'Free' : 'Paid'}
                                            </span>
                                            {discountCodes.map((code) => (
                                              <span key={code} className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
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
                                <p className="text-xs text-gray-400 mt-2">{order.storeName} · {order.number}</p>
                              </div>

                              {fulfillmentViewOrderId === order.id ? (
                                <div className="min-w-0 lg:col-span-2">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Fulfillment Details</h4>
                                  <div className="space-y-3">
                                    {order.fulfillmentItems.confirmations.map((conf, confIndex) => (
                                      <div key={conf.id ?? confIndex} className="bg-white rounded-lg border border-blue-200 p-3">
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-gray-600">
                                          {conf.confirmedAt && (
                                            <span><span className="font-medium text-gray-500">Confirmed:</span> {new Date(conf.confirmedAt).toLocaleString()}</span>
                                          )}
                                          {conf.fulfillmentDate && (
                                            <span><span className="font-medium text-gray-500">Fulfilled:</span> {formatFulfillmentDate(conf.fulfillmentDate)}</span>
                                          )}
                                          {conf.shopifyFulfillmentStatus && (
                                            <span><span className="font-medium text-gray-500">Status:</span> {conf.shopifyFulfillmentStatus}</span>
                                          )}
                                          {conf.trackingInfo?.company && (
                                            <span><span className="font-medium text-gray-500">Carrier:</span> {conf.trackingInfo.company}</span>
                                          )}
                                          {conf.trackingInfo?.number && (
                                            <span>
                                              <span className="font-medium text-gray-500">Tracking:</span>{' '}
                                              {conf.trackingInfo.url ? (
                                                <a href={conf.trackingInfo.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{conf.trackingInfo.number}</a>
                                              ) : conf.trackingInfo.number}
                                            </span>
                                          )}
                                        </div>
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-blue-100">
                                              <th className="text-left py-1 text-gray-400 font-medium">Product</th>
                                              <th className="text-left py-1 text-gray-400 font-medium">SKU</th>
                                              <th className="text-center py-1 text-gray-400 font-medium">Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {conf.lines.map((line) => {
                                              const lineItem = order.items.find((i) => i.id === line.lineItemId);
                                              return (
                                                <tr key={line.lineItemId} className="border-b border-blue-50">
                                                  <td className="py-1.5 pr-2 text-gray-700">{lineItem?.name ?? line.lineItemId}</td>
                                                  <td className="py-1.5 pr-2 font-mono text-gray-500">{lineItem?.sku || '-'}</td>
                                                  <td className="py-1.5 text-center text-gray-700">{line.quantity}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                        {conf.barcodes && conf.barcodes.length > 0 && (
                                          <div className="mt-2 text-xs text-gray-500">
                                            <span className="font-medium">Barcodes:</span> {conf.barcodes.join(', ')}
                                          </div>
                                        )}
                                        {(userIsAdmin || userIsStaff) && (() => {
                                          const confId = conf.id ?? String(confIndex);
                                          if (userIsAdmin) {
                                            return (
                                              <div className="mt-3 flex items-center gap-2 pt-2 border-t border-blue-50">
                                                <button
                                                  onClick={() => openEditFulModal(order, conf, confId)}
                                                  className="flex-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg py-1.5 hover:bg-blue-50 cursor-pointer"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() => openCancelFulModal(order, conf, confId)}
                                                  className="flex-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-lg py-1.5 hover:bg-red-50 cursor-pointer"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            );
                                          }
                                          const editReq = getActiveFulfillmentRequest(order.id, confId, 'edit');
                                          const cancelReq = getActiveFulfillmentRequest(order.id, confId, 'cancel');
                                          return (
                                            <div className="mt-3 flex items-center gap-2 pt-2 border-t border-blue-50">
                                              {editReq?.status === 'approved' ? (
                                                <button onClick={() => openEditFulModal(order, conf, confId)} className="flex-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-300 rounded-lg py-1.5 hover:bg-green-100 cursor-pointer">
                                                  ✓ Edit Now
                                                </button>
                                              ) : editReq?.status === 'pending' ? (
                                                <div className="flex-1 text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-1.5">Edit Pending…</div>
                                              ) : (
                                                <button onClick={() => void openRequestPermModal(order, conf, confId, 'edit')} className="flex-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 cursor-pointer">
                                                  Request Edit
                                                </button>
                                              )}
                                              {cancelReq?.status === 'approved' ? (
                                                <button onClick={() => openCancelFulModal(order, conf, confId)} className="flex-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg py-1.5 hover:bg-red-100 cursor-pointer">
                                                  ✓ Cancel Now
                                                </button>
                                              ) : cancelReq?.status === 'pending' ? (
                                                <div className="flex-1 text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-1.5">Cancel Pending…</div>
                                              ) : (
                                                <button onClick={() => void openRequestPermModal(order, conf, confId, 'cancel')} className="flex-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-lg py-1.5 hover:bg-red-50 cursor-pointer">
                                                  Request Cancel
                                                </button>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Product Fulfilment</h4>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-blue-200">
                                          <th className="text-left py-1 text-gray-400 font-medium">Product</th>
                                          <th className="text-left py-1 text-gray-400 font-medium">SKU</th>
                                          <th className="text-center py-1 text-gray-400 font-medium">QTY</th>
                                          <th className="text-center py-1 text-gray-400 font-medium">Packed</th>
                                          <th className="text-start py-1 text-gray-400 font-medium">
                                            <label className="inline-flex items-center gap-1 cursor-pointer justify-start">
                                              <input
                                                type="checkbox"
                                                checked={order.items.length > 0 && order.items.every((item, itemIndex) => isLineFullChecked(order, item, itemIndex))}
                                                onChange={() => toggleAllFull(order)}
                                                className="rounded border-gray-300 text-blue-600 cursor-pointer"
                                              />
                                              Full
                                            </label>
                                          </th>
                                          <th className="text-center py-1 text-gray-400 font-medium">Partial</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {order.items.map((item, itemIndex) => {
                                          const key = rowItemKey(order.id, itemIndex);
                                          const fulfilledQty = getFulfilledQty(order, item.id);
                                          const remainingQty = Math.max(0, item.qty - fulfilledQty);
                                          const isFull = isLineFullChecked(order, item, itemIndex);
                                          const partialValue = Math.min(remainingQty, Math.max(0, partialValues[key] ?? 0));
                                          const packedQty = item.packedQuantity ?? 0;
                                          const itemPackingStatus = packedQty >= item.qty && item.qty > 0 ? 'packed' : packedQty > 0 ? 'partial' : 'none';
                                          return (
                                            <tr
                                              key={`${order.id}-${itemIndex}`}
                                              className={getFulfillmentRowClass(fulfilledQty, item.qty, remainingQty, isFull, partialValue)}
                                            >
                                              <td className="py-1.5 pr-2 text-gray-700">{item.name}</td>
                                              <td className="py-1.5 pr-2 font-mono text-gray-500">{item.sku || '-'}</td>
                                              <td className="py-1.5 text-center text-gray-700">
                                                {fulfilledQty}/{item.qty}
                                              </td>
                                              <td className="py-1.5 text-center">
                                                {itemPackingStatus === 'packed' ? (
                                                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                                                    {packedQty}/{item.qty}
                                                  </span>
                                                ) : itemPackingStatus === 'partial' ? (
                                                  <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
                                                    {packedQty}/{item.qty}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-300">-</span>
                                                )}
                                              </td>
                                              <td className="py-1.5 flex-inline justify-start items-center">
                                                <input
                                                  type="checkbox"
                                                  checked={isFull}
                                                  disabled={remainingQty === 0}
                                                  onChange={() => toggleFull(order.id, itemIndex, remainingQty)}
                                                  className="rounded border-gray-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                              </td>
                                              <td className="py-1.5 text-center">
                                                <input
                                                  type="number"
                                                  min={0}
                                                  max={remainingQty}
                                                  value={partialValue}
                                                  disabled={isFull || remainingQty === 0}
                                                  onChange={(e) => validPartial(order.id, itemIndex, remainingQty, e.target.value)}
                                                  className="w-14 border border-blue-200 rounded px-1 py-0.5 text-center text-xs bg-white cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                                />
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="w-full lg:max-w-[400px]">
                                    {(() => {
                                      const lockedFulfillment = isOrderFulfillmentLocked(order);
                                      const canConfirmFulfillment = !lockedFulfillment && getFulfillmentLines(order).length > 0;
                                      const isConfirmDisabled = fulSaving[order.id] || !canConfirmFulfillment;
                                      return (
                                        <>
                                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Actions</h4>
                                          <div className="flex items-center gap-2">
                                            <button
                                              ref={fullSelectBtnRef}
                                              onClick={() => openFulfillmentConfirmation(order)}
                                              disabled={isConfirmDisabled}
                                              className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors duration-150 mb-2 ${isConfirmDisabled
                                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                  : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                                }`}
                                            >
                                              {lockedFulfillment ? 'Fulfilment Locked' : fulSaving[order.id] ? 'Confirming...' : 'Confirm Fulfilment'}
                                            </button>
                                            <button
                                              onClick={() => {openFulfillmentConfirmation(order);printPackingSlipLabel(order)}}
                                              disabled={isConfirmDisabled}
                                              className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors duration-150 mb-2 ${isConfirmDisabled
                                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                  : 'bg-sky-600 text-white hover:bg-sky-700 cursor-pointer'
                                                }`}
                                            >
                                              {lockedFulfillment ? 'Fulfilment Locked' : fulSaving[order.id] ? 'Confirming...' : 'Confirm & Print'}
                                            </button>
                                          </div>
                                        </>
                                      );
                                    })()}
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => void printPackingSlipLabel(order)}
                                        disabled={printingOrderId === order.id || isFullyFulfilled}
                                        className={`flex-1 border py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${printingOrderId === order.id || isFullyFulfilled
                                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer'
                                          }`}
                                      >
                                        {printingOrderId === order.id ? 'Loading label...' : 'Print Label'}
                                      </button>
                                      <button
                                        onClick={() => void openMessageModal(order)}
                                        disabled={isFullyFulfilled}
                                        className={`relative flex-1 border py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${isFullyFulfilled
                                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer'
                                          }`}
                                      >
                                        Message
                                        {order.messageCount > 0 && (
                                          <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                                            {order.messageCount > 99 ? '99+' : order.messageCount}
                                          </span>
                                        )}
                                      </button>
                                    </div>
                                    {fulMessages[order.id] && (
                                      <div className="mt-2 text-xs text-center text-green-600 font-medium">{fulMessages[order.id]}</div>
                                    )}
                                    {order.note && (
                                      <div className="mt-3 rounded-md border border-blue-100 bg-white/70 px-3 py-2">
                                        <h4 className="text-[11px] font-semibold uppercase text-gray-400">Note</h4>
                                        <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600">{order.note}</p>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
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

      <OrderModals
        stockModal={stockModal}
        setStockModal={setStockModal}
        closeStockModal={closeStockModal}
        updateStockItem={updateStockItem}
        getAvailableStockItemsForRow={getAvailableStockItemsForRow}
        getBackInStockEligibleItems={getBackInStockEligibleItems}
        hasStockItemAvailableToAdd={hasStockItemAvailableToAdd}
        addStockItem={addStockItem}
        removeStockItem={removeStockItem}
        submitStockRequest={submitStockRequest}
        formatStockStatus={formatStockStatus}
        messageModal={messageModal}
        setMessageModal={setMessageModal}
        closeMessageModal={closeMessageModal}
        submitAdminMessage={submitAdminMessage}
        noteModal={noteModal}
        setNoteModal={setNoteModal}
        closeNoteModal={closeNoteModal}
        cancelEditNote={cancelEditNote}
        submitOrderNote={submitOrderNote}
        startEditNote={startEditNote}
        deleteOrderNote={deleteOrderNote}
        pendingFulfillment={pendingFulfillment}
        setPendingFulfillment={setPendingFulfillment}
        closeFulfillmentConfirmation={closeFulfillmentConfirmation}
        fulSaving={fulSaving}
        carrierDropdownOpen={carrierDropdownOpen}
        setCarrierDropdownOpen={setCarrierDropdownOpen}
        carrierSearch={carrierSearch}
        setCarrierSearch={setCarrierSearch}
        filteredTrackingCarriers={filteredTrackingCarriers}
        trackingNumInputRef={trackingNumInputRef}
        confirmFul={confirmFul}
        editFulModal={editFulModal}
        setEditFulModal={setEditFulModal}
        submitEditFulfillment={submitEditFulfillment}
        cancelFulModal={cancelFulModal}
        setCancelFulModal={setCancelFulModal}
        submitCancelFulfillment={submitCancelFulfillment}
        requestPermModal={requestPermModal}
        setRequestPermModal={setRequestPermModal}
        submitPermissionRequest={submitPermissionRequest}
        stockAdjustmentModal={stockAdjustmentModal}
        setStockAdjustmentModal={setStockAdjustmentModal}
        closeStockAdjustmentModal={closeStockAdjustmentModal}
        toggleManagedStockAdjustmentItem={toggleManagedStockAdjustmentItem}
        submitStockAdjustment={submitStockAdjustment}
      />
    </main>
  );
}
