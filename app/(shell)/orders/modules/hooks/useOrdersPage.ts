import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { getDecoratorCategory, isDecoratorRole, isStaffLikeRole, isTestUserRole } from '@/lib/roles';
import type {
  AdminOption,
  ApiResponse,
  AssignModalState,
  BackInStockItem,
  BackInStockRequest,
  DecorationFileRef,
  DecoratorUser,
  WorkModalState,
  WorkDetailsModalState,
  FulfillmentConfirmation,
  FulfillmentEditRequestRow,
  FulfillmentLine,
  LineItemAssignment,
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
} from '../types';
import { DEFAULT_PAGINATION, PERIODS, SHOPIFY_TRACKING_CARRIERS } from '../constants';
import { buildPackingSlipDocument, printDocumentInHiddenFrame } from '../packingSlipPrint';
import { buildNameAttributesCsv, buildNameAttributesDocument, downloadCsv, type NameAttributeRow } from '../nameAttributesExport';
import {
  createDefaultStockItem,
  emptyCommentDraft,
  formatSyncDate,
  getActiveFulfillmentRequest as getActiveFulfillmentRequestPure,
  getApiErrorMessage,
  getBackInStockEligibleItems,
  getFulfilledQty,
  isLineFullyFulfilled,
  isOrderFulfillmentLocked,
  orderNameEntries,
  parseBarcodes,
  rowItemKey,
  type PaginationItem,
} from '../utils';

export function useOrdersPage() {
  const getInitialSearch = () => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('search')?.trim() ?? '';
  };
  const initialSearch = getInitialSearch();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [searchField, setSearchField] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
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
  const [selectedNames, setSelectedNames] = useState<Map<string, NameAttributeRow>>(new Map());
  const [selectAllFilters, setSelectAllFilters] = useState(false);
  const [excludedNames, setExcludedNames] = useState<Set<string>>(new Set());
  const [filterNameCount, setFilterNameCount] = useState<number | null>(null);
  const [nameCountLoading, setNameCountLoading] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const userRole = (session?.user?.role as string) ?? '';
  const userIsAdmin = userRole === 'admin';
  const userIsDecorator = isDecoratorRole(userRole);
  const decoratorCategory = getDecoratorCategory(userRole);
  const ordersColSpan = userIsAdmin ? 11 : 10;
  const userIsStaff = isStaffLikeRole(userRole);
  const userIsTest = isTestUserRole(userRole);
  const [orderFulfillmentRequests, setOrderFulfillmentRequests] = useState<Record<string, FulfillmentEditRequestRow[]>>({});
  const [pendingRequests, setPendingRequests] = useState<FulfillmentEditRequestRow[]>([]);
  const [pendingRequestsPanelOpen, setPendingRequestsPanelOpen] = useState(false);
  const [editFulModal, setEditFulModal] = useState<EditFulfillmentModalState | null>(null);
  const [cancelFulModal, setCancelFulModal] = useState<CancelFulfillmentModalState | null>(null);
  const [requestPermModal, setRequestPermModal] = useState<RequestPermissionModalState | null>(null);
  const [assignModal, setAssignModal] = useState<AssignModalState | null>(null);
  const [decoratorUsers, setDecoratorUsers] = useState<DecoratorUser[]>([]);
  const [decoratorUsersLoaded, setDecoratorUsersLoaded] = useState(false);
  const [workModal, setWorkModal] = useState<WorkModalState | null>(null);
  const [workDetails, setWorkDetails] = useState<WorkDetailsModalState | null>(null);
  const [requestingAccessKey, setRequestingAccessKey] = useState<string | null>(null);
  const [syncStoreIds, setSyncStoreIds] = useState<string[]>([]);
  const [syncStoreDropdownOpen, setSyncStoreDropdownOpen] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
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
    if (searchField) params.set('searchField', searchField);
    storeIds.forEach((id) => params.append('storeId', id));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    fulfillmentStatuses.forEach((s) => params.append('status', s));
    packingStatuses.forEach((s) => params.append('packingStatus', s));
    return params.toString();
  }, [pagination.page, pagination.pageSize, period, search, searchField, storeIds, dateFrom, dateTo, fulfillmentStatuses, packingStatuses]);

  useEffect(() => {
    setSelectAllFilters(false);
    setExcludedNames(new Set());
    setSelectedNames(new Map());
    setFilterNameCount(null);
  }, [period, search, storeIds, dateFrom, dateTo, fulfillmentStatuses, packingStatuses]);

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
        const firstId = json.data.orders[0]?.id;
        if (expandAll) {
          setExpandedIds(new Set(json.data.orders.map((o) => o.id)));
        } else {
          setExpandedIds(search && firstId ? new Set([firstId]) : new Set());
        }
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

  const isLineFullChecked = (order: OrderRow, item: OrderItem, itemIndex: number) => {
    return isLineFullyFulfilled(order, item) || (fullChecks[rowItemKey(order.id, itemIndex)] ?? false);
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

  const applyItemDecoration = (orderId: string, lineItemId: string, flags: { isEmbroidery: boolean; isPrint: boolean }) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId
        ? { ...o, items: o.items.map((it) => (it.id === lineItemId ? { ...it, ...flags } : it)) }
        : o
    )));
  };

  const toggleLineItemDecoration = async (order: OrderRow, item: OrderItem, field: 'isEmbroidery' | 'isPrint') => {
    if (blockTestModeAction()) return;
    const prevFlags = { isEmbroidery: item.isEmbroidery ?? false, isPrint: item.isPrint ?? false };
    const nextFlags = { ...prevFlags, [field]: !prevFlags[field] };
    applyItemDecoration(order.id, item.id, nextFlags);
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}/decoration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextFlags),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to update decoration'));
    } catch (err) {
      applyItemDecoration(order.id, item.id, prevFlags);
      toast.error(err instanceof Error ? err.message : 'Failed to update decoration');
    }
  };

  const applyItemAssignments = (orderId: string, lineItemId: string, assignments: LineItemAssignment[]) => {
    setOrders((prev) => prev.map((o) => (
      o.id === orderId
        ? { ...o, items: o.items.map((it) => (it.id === lineItemId ? { ...it, assignments } : it)) }
        : o
    )));
  };

  const ensureDecoratorUsers = async () => {
    if (decoratorUsersLoaded) return;
    try {
      const res = await fetch('/api/users/decorators');
      const json = (await res.json()) as ApiResponse<DecoratorUser[]>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to load decorators'));
      setDecoratorUsers(json.data);
      setDecoratorUsersLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load decorators');
    }
  };

  const openAssignModal = (order: OrderRow, item: OrderItem) => {
    if (blockTestModeAction()) return;
    setAssignModal({
      orderId: order.id,
      orderNumber: order.number,
      lineItemId: item.id,
      productName: item.name || item.title || item.sku || 'Item',
      assignments: item.assignments ?? [],
      selectedUserId: '',
      dueDate: '',
      saving: false,
      removingId: null,
      error: '',
    });
    void ensureDecoratorUsers();
  };

  const closeAssignModal = () => setAssignModal(null);

  const submitAssignment = async () => {
    if (!assignModal) return;
    if (!assignModal.selectedUserId) {
      setAssignModal((prev) => (prev ? { ...prev, error: 'Select a decorator to assign.' } : prev));
      return;
    }
    const { orderId, lineItemId, selectedUserId, dueDate } = assignModal;
    setAssignModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));
    try {
      const res = await fetch(`/api/orders/${orderId}/line-items/${encodeURIComponent(lineItemId)}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: selectedUserId, dueDate: dueDate || null }),
      });
      const json = (await res.json()) as ApiResponse<{ assignments: LineItemAssignment[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to add assignment'));
      applyItemAssignments(orderId, lineItemId, json.data.assignments);
      setAssignModal((prev) => (prev ? { ...prev, assignments: json.data.assignments, selectedUserId: '', dueDate: '', saving: false } : prev));
      toast.success('Assignment added.');
    } catch (err) {
      setAssignModal((prev) => (prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to add assignment' } : prev));
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!assignModal) return;
    const { orderId, lineItemId } = assignModal;
    setAssignModal((prev) => (prev ? { ...prev, removingId: assignmentId, error: '' } : prev));
    try {
      const res = await fetch(`/api/orders/${orderId}/line-items/${encodeURIComponent(lineItemId)}/assignments/${assignmentId}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<{ assignments: LineItemAssignment[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to remove assignment'));
      applyItemAssignments(orderId, lineItemId, json.data.assignments);
      setAssignModal((prev) => (prev ? { ...prev, assignments: json.data.assignments, removingId: null } : prev));
    } catch (err) {
      setAssignModal((prev) => (prev ? { ...prev, removingId: null, error: err instanceof Error ? err.message : 'Failed to remove assignment' } : prev));
    }
  };

  // ----- Decorator "done" workflow -----
  const openWorkModal = (order: OrderRow, item: OrderItem) => {
    if (blockTestModeAction()) return;
    const remaining = item.decoration?.remaining ?? item.qty;
    setWorkModal({ order, item, quantityDone: Math.max(1, Math.min(remaining, 1)), comments: [emptyCommentDraft()], saving: false, error: '' });
  };
  const closeWorkModal = () => setWorkModal(null);

  const updateWorkQuantity = (value: string) => {
    setWorkModal((prev) => {
      if (!prev) return prev;
      const remaining = prev.item.decoration?.remaining ?? prev.item.qty;
      const parsed = parseInt(value, 10);
      const clamped = Number.isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, Math.max(1, remaining));
      return { ...prev, quantityDone: clamped };
    });
  };
  const addCommentRow = () => setWorkModal((prev) => (prev ? { ...prev, comments: [...prev.comments, emptyCommentDraft()] } : prev));
  const removeCommentRow = (index: number) => setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.filter((_, i) => i !== index) } : prev));
  const updateCommentField = (index: number, field: 'sizes' | 'colors' | 'remarks' | 'location', value: string) =>
    setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, [field]: value } : c)) } : prev));

  const uploadCommentFiles = async (index: number, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, uploading: true } : c)) } : prev));
    try {
      const fd = new FormData();
      Array.from(fileList).forEach((f) => fd.append('files', f));
      const res = await fetch('/api/decoration/uploads', { method: 'POST', body: fd });
      const json = (await res.json()) as ApiResponse<{ files: DecorationFileRef[] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Upload failed'));
      setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, files: [...c.files, ...json.data.files], uploading: false } : c)) } : prev));
    } catch (err) {
      setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, uploading: false } : c)) } : prev));
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };
  const removeCommentFile = (index: number, fileIndex: number) =>
    setWorkModal((prev) => (prev ? { ...prev, comments: prev.comments.map((c, i) => (i === index ? { ...c, files: c.files.filter((_, fi) => fi !== fileIndex) } : c)) } : prev));

  const submitWork = async () => {
    if (!workModal) return;
    const { order, item, quantityDone, comments } = workModal;
    setWorkModal((prev) => (prev ? { ...prev, saving: true, error: '' } : prev));
    const cleanedComments = comments
      .map(({ sizes, colors, remarks, location, files }) => ({
        sizes: sizes.trim() || undefined,
        colors: colors.trim() || undefined,
        remarks: remarks.trim() || undefined,
        location: location.trim() || undefined,
        files: files.length ? files : undefined,
      }))
      .filter((c) => c.sizes || c.colors || c.remarks || c.location || c.files);
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantityDone, comments: cleanedComments }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to mark as done'));
      toast.success('Marked as done.');
      setWorkModal(null);
      setRefreshToken((prev) => prev + 1);
    } catch (err) {
      setWorkModal((prev) => (prev ? { ...prev, saving: false, error: err instanceof Error ? err.message : 'Failed to mark as done' } : prev));
    }
  };

  const deleteWorkRecord = async (order: OrderRow, item: OrderItem, workId: string) => {
    if (blockTestModeAction()) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/line-items/${encodeURIComponent(item.id)}/work/${workId}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to remove work'));
      toast.success('Work removed.');
      setWorkDetails(null);
      setRefreshToken((prev) => prev + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove work');
    }
  };

  const requestEditAccess = async (order: OrderRow, item: OrderItem) => {
    if (blockTestModeAction()) return;
    const key = `${order.id}:${item.id}`;
    setRequestingAccessKey(key);
    try {
      const res = await fetch('/api/decoration/edit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, lineItemId: item.id, reason: 'Requesting edit access' }),
      });
      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to request access'));
      toast.success('Edit access requested. An admin will review it.');
      setRefreshToken((prev) => prev + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to request access');
    } finally {
      setRequestingAccessKey(null);
    }
  };

  const openWorkDetails = (order: OrderRow, item: OrderItem) => setWorkDetails({ order, item });
  const closeWorkDetails = () => setWorkDetails(null);

  const isNameChecked = (key: string) => (selectAllFilters ? !excludedNames.has(key) : selectedNames.has(key));

  const selectedNameCount = selectAllFilters
    ? Math.max(0, (filterNameCount ?? 0) - excludedNames.size)
    : selectedNames.size;

  const setNamesChecked = (entries: Array<{ key: string; row: NameAttributeRow }>, checked: boolean) => {
    if (selectAllFilters) {
      setExcludedNames((prev) => {
        const next = new Set(prev);
        entries.forEach(({ key }) => (checked ? next.delete(key) : next.add(key)));
        return next;
      });
    } else {
      setSelectedNames((prev) => {
        const next = new Map(prev);
        entries.forEach(({ key, row }) => (checked ? next.set(key, row) : next.delete(key)));
        return next;
      });
    }
  };

  const isOrderAllNamesChecked = (order: OrderRow) => {
    const entries = orderNameEntries(order);
    return entries.length > 0 && entries.every(({ key }) => isNameChecked(key));
  };

  const toggleOrderNames = (order: OrderRow) => {
    setNamesChecked(orderNameEntries(order), !isOrderAllNamesChecked(order));
  };

  const fetchNameAttributeCount = useCallback(async () => {
    setNameCountLoading(true);
    try {
      const res = await fetch(`/api/orders/name-attributes?${queryString}`);
      const json = (await res.json()) as ApiResponse<{ count: number }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load attributes');
      setFilterNameCount(json.data.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load attribute count');
      setFilterNameCount(0);
    } finally {
      setNameCountLoading(false);
    }
  }, [queryString]);

  const handleToggleSelectAllFilters = () => {
    if (selectAllFilters) {
      setSelectAllFilters(false);
      setExcludedNames(new Set());
      setFilterNameCount(null);
      return;
    }
    setSelectedNames(new Map());
    setExcludedNames(new Set());
    setSelectAllFilters(true);
    void fetchNameAttributeCount();
  };

  const handleToggleCurrentPage = () => {
    const entries = orders.flatMap(orderNameEntries);
    const allChecked = entries.length > 0 && entries.every(({ key }) => isNameChecked(key));
    if (selectAllFilters) {
      setSelectAllFilters(false);
      setExcludedNames(new Set());
      setFilterNameCount(null);
      setSelectedNames(allChecked ? new Map() : new Map(entries.map(({ key, row }) => [key, row])));
      return;
    }
    setSelectedNames((prev) => {
      const next = new Map(prev);
      entries.forEach(({ key, row }) => (allChecked ? next.delete(key) : next.set(key, row)));
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    setExpandAll((prev) => {
      const next = !prev;
      setExpandedIds(next ? new Set(orders.map((o) => o.id)) : new Set());
      return next;
    });
  };

  const currentPageNameEntries = orders.flatMap(orderNameEntries);
  const isCurrentPageAllChecked = currentPageNameEntries.length > 0 && currentPageNameEntries.every(({ key }) => isNameChecked(key));

  const gatherExportRows = useCallback(async (): Promise<NameAttributeRow[]> => {
    if (selectAllFilters) {
      const res = await fetch(`/api/orders/name-attributes?${queryString}`);
      const json = (await res.json()) as ApiResponse<{
        attributes: Array<{ orderId: string; orderNumber: string; lineItemId: string; productTitle: string; value: string }>;
      }>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load attributes');
      return json.data.attributes
        .filter((a) => !excludedNames.has(`${a.orderId}:${a.lineItemId}`))
        .map((a) => ({ orderNumber: a.orderNumber, productTitle: a.productTitle, value: a.value }));
    }
    return Array.from(selectedNames.values());
  }, [selectAllFilters, queryString, excludedNames, selectedNames]);

  const runExport = async (mode: 'csv' | 'print') => {
    setExportDropdownOpen(false);
    setExportLoading(true);
    try {
      const rows = await gatherExportRows();
      if (rows.length === 0) {
        toast.info('No attributes selected to export.');
        return;
      }
      if (mode === 'csv') {
        downloadCsv(`name-attributes-${new Date().toISOString().slice(0, 10)}.csv`, buildNameAttributesCsv(rows));
      } else {
        await printDocumentInHiddenFrame(buildNameAttributesDocument(rows));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export attributes');
    } finally {
      setExportLoading(false);
    }
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

  const getActiveFulfillmentRequest = (orderId: string, fulfillmentId: string | undefined, requestType: 'edit' | 'cancel') =>
    getActiveFulfillmentRequestPure(orderFulfillmentRequests[orderId] ?? [], orderId, fulfillmentId, requestType);

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
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/messages?type=orders`);
      const json = (await res.json()) as ApiResponse<{
        admins: AdminOption[];
        defaultAdminIds: string[];
        fulfillmentRequestAdmins: AdminOption[];
        fulfillmentRequestDefaultAdminIds: string[];
        messages: unknown[];
      }>;
      if (res.ok && json.success) {
        const allowedIds = new Set(json.data.fulfillmentRequestAdmins.map((admin) => admin.id));
        const defaultSelection = json.data.fulfillmentRequestDefaultAdminIds.filter((id) => allowedIds.has(id));
        setRequestPermModal((prev) => prev ? {
          ...prev,
          availableAdmins: json.data.fulfillmentRequestAdmins,
          selectedAdminIds: defaultSelection,
          loadingAdmins: false,
        } : null);
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
    setPrintingOrderId(order.id);

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/packing-slip`);
      const json = (await res.json()) as ApiResponse<PackingSlipLabel>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load packing slip label'));
      }

      const printHtml = buildPackingSlipDocument(json.data, window.location.origin);
      await printDocumentInHiddenFrame(printHtml);
    } catch (err) {
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
        defaultAdminIds: string[];
        fulfillmentRequestAdmins: AdminOption[];
        fulfillmentRequestDefaultAdminIds: string[];
        messages: OrderAdminMessage[];
      }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to load order messages'));
      }

      setMessageModal((prev) => {
        if (!prev || prev.order.id !== order.id) return prev;
        const allowedIds = new Set(json.data.admins.map((admin) => admin.id));
        const defaultId = json.data.defaultAdminIds.find((id) => allowedIds.has(id)) ?? json.data.admins[0]?.id ?? '';
        return {
          ...prev,
          admins: json.data.admins,
          messages: json.data.messages,
          selectedAdminId: defaultId,
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
      setMessageModal((prev) => prev ? { ...prev, error: 'Select a recipient and enter a message.' } : prev);
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
          type: 'orders',
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
    setSearchField('');
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
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = searchInput !== '' || searchField !== '' || storeIds.length > 0 || period !== 'all' || !!dateFrom || !!dateTo || fulfillmentStatuses.length > 0 || packingStatuses.length > 0;
  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
  const syncMessage = syncActive
    ? syncJob.status === 'queued'
      ? 'Sync queued'
      : `Syncing: ${syncJob.totalFetched} fetched`
    : lastSynced || 'Not synced yet';

  return {
    // role flags
    userRole, userIsAdmin, userIsDecorator, decoratorCategory, ordersColSpan, userIsStaff, userIsTest,
    session,
    // data
    orders, setOrders, stores, loading, error,
    expandedIds, setExpandedIds, expandAll,
    refreshRotation, refreshingOrderIds,
    handleRefresh, refreshSingleOrder, handleToggleExpandAll,
    blockTestModeAction,
    // sync
    syncing, syncActive, syncStoreIds, setSyncStoreIds, syncRefreshNeeded, syncMessage,
    handleSync, handleSyncStoreToggle,
    syncStoreDropdownOpen, setSyncStoreDropdownOpen, syncStoreDropdownRef,
    // filters
    searchInput, setSearchInput, searchField, setSearchField,
    searchDropdownOpen, setSearchDropdownOpen, searchDropdownRef,
    storeIds, setStoreIds, storeDropdownOpen, setStoreDropdownOpen, storeDropdownRef,
    dateFrom, setDateFrom, dateTo, setDateTo, hoverDate, setHoverDate,
    fulfillmentStatuses, setFulfillmentStatuses, statusDropdownOpen, setStatusDropdownOpen, statusDropdownRef,
    packingStatuses, packingStatusDropdownOpen, setPackingStatusDropdownOpen, packingStatusDropdownRef,
    handlePackingStatusToggle, handleStoreToggle, handleStatusToggle,
    period, setPeriod, periodDropdownOpen, setPeriodDropdownOpen, periodDropdownRef,
    calendarNav, setCalendarNav, handlePeriodChange, handleCalendarDateClick,
    hasActiveFilters, handleClearFilters,
    pagination, setPagination, pageNumbers, goToPage,
    // name attributes / export
    selectedNameCount, isCurrentPageAllChecked, nameCountLoading,
    selectAllFilters, handleToggleSelectAllFilters, handleToggleCurrentPage,
    isNameChecked, setNamesChecked, isOrderAllNamesChecked, toggleOrderNames,
    exportLoading, exportDropdownOpen, setExportDropdownOpen, exportDropdownRef, runExport,
    // fulfillment line helpers
    isLineFullChecked, toggleFull, toggleAllFull, validPartial, getFulfillmentLines,
    partialValues, fulSaving, fulMessages, fullSelectBtnRef,
    // pending fulfillment confirmation
    pendingFulfillment, setPendingFulfillment, openFulfillmentConfirmation, closeFulfillmentConfirmation, confirmFul,
    carrierDropdownOpen, setCarrierDropdownOpen, carrierSearch, setCarrierSearch, filteredTrackingCarriers, trackingNumInputRef,
    // decoration
    toggleLineItemDecoration, openWorkModal, openWorkDetails,
    // assignments
    assignModal, setAssignModal, openAssignModal, closeAssignModal, submitAssignment, removeAssignment,
    decoratorUsers, decoratorUsersLoaded,
    // work
    workModal, closeWorkModal, updateWorkQuantity, addCommentRow, removeCommentRow, updateCommentField,
    uploadCommentFiles, removeCommentFile, submitWork,
    workDetails, closeWorkDetails, deleteWorkRecord,
    requestEditAccess, requestingAccessKey,
    // fulfillment view / requests
    fulfillmentViewOrderId, setFulfillmentViewOrderId,
    getActiveFulfillmentRequest,
    openEditFulModal, openCancelFulModal, openRequestPermModal,
    editFulModal, setEditFulModal, submitEditFulfillment,
    cancelFulModal, setCancelFulModal, submitCancelFulfillment,
    requestPermModal, setRequestPermModal, submitPermissionRequest,
    pendingRequests, pendingRequestsPanelOpen, setPendingRequestsPanelOpen,
    handleAdminApproveRequest, handleAdminRejectRequest,
    // packing slip / printing
    printPackingSlipLabel, printingOrderId,
    // messages
    messageModal, setMessageModal, openMessageModal, closeMessageModal, submitAdminMessage,
    // notes
    noteModal, setNoteModal, openNoteModal, closeNoteModal, startEditNote, cancelEditNote, submitOrderNote, deleteOrderNote,
    // stock
    stockModal, setStockModal, openStockModal, closeStockModal, updateStockItem, addStockItem, removeStockItem, submitStockRequest,
    // stock adjustment
    stockAdjustmentModal, setStockAdjustmentModal, openStockAdjustmentModal, closeStockAdjustmentModal, toggleManagedStockAdjustmentItem, submitStockAdjustment,
  };
}
