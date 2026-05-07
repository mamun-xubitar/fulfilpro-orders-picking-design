'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';

type OrderItem = { id: string; name: string; sku: string; qty: number };
type OrderRow = {
  id: string;
  number: string;
  customer: string;
  note: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  closed: boolean;
  closedAt: string | null;
  canceled: boolean;
  canceledAt: string | null;
  status: string;
  orderedAt: string;
  storeId: string;
  storeName: string;
  storeDomain: string;
  barcodes: string[];
  items: OrderItem[];
  fulfillmentItems: {
    shopifyOrderId: string | null;
    confirmations: FulfillmentConfirmation[];
  };
  itemsCount: number;
  messageCount: number;
};

type StoreOption = { id: string; name: string; storeDomain: string };
type AdminOption = { id: string; name: string; email: string };
type OrderAdminMessage = {
  id: string;
  adminName: string;
  adminEmail: string;
  senderName: string | null;
  senderEmail: string | null;
  message: string;
  createdAt: string;
};
type PackingSlipLabel = {
  id: string;
  number: string;
  customer: string;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
  note: string | null;
  storeName: string;
  storeDomain: string;
  storeUrl: string | null;
  storeLogoPath: string | null;
};
type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  message: string;
  errors?: string[];
  data: T;
};

type OrderSyncJob = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | string;
  storeIds: string[] | null;
  totalStores: number;
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  failedStores: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type FulfillmentEditRequestRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  fulfillmentId: string;
  requestType: 'edit' | 'cancel';
  requestedById: string;
  requestedByName: string;
  requestedByEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminTargets: Array<{ id: string; name: string; email: string }>;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectedByName: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
};

type FulfillmentLine = { lineItemId: string; quantity: number; full: boolean };
type FulfillmentConfirmation = {
  id?: string;
  confirmedAt?: string | null;
  shopifyFulfillmentId?: string | null;
  shopifyFulfillmentStatus?: string | null;
  barcodes?: string[];
  shippingDate?: string | null;
  trackingInfo?: {
    number?: string;
    company?: string;
    url?: string;
  } | null;
  lines: Array<{ lineItemId: string; quantity: number; full?: boolean }>;
};

const PERIODS = [
  { label: 'All Time', value: 'all' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
] as const;

const FULFILLMENT_STATUSES = [
  { label: 'Unfulfilled', value: 'unfulfilled' },
  { label: 'Partial', value: 'partial' },
  { label: 'Fulfilled', value: 'fulfilled' },
  { label: 'Closed', value: 'closed' },
  { label: 'Canceled', value: 'canceled' },
] as const;

const SHOPIFY_TRACKING_CARRIERS = [
  '4PX',
  'AGS',
  'Amazon',
  'Amazon Logistics UK',
  'Amazon Logistics US',
  'An Post',
  'Anjun Logistics',
  'APC',
  'Asendia USA',
  'Australia Post',
  'Bonshaw',
  'BPost',
  'BPost International',
  'Canada Post',
  'Canpar',
  'CDL Last Mile',
  'China Post',
  'Chronopost',
  'Chukou1',
  'Colissimo',
  'Comingle',
  'Coordinadora',
  'Correios',
  'Correos',
  'CTT',
  'CTT Express',
  'Cyprus Post',
  'Delnext',
  'Deutsche Post',
  'DHL eCommerce',
  'DHL eCommerce Asia',
  'DHL Express',
  'DPD',
  'DPD Local',
  'DPD UK',
  'DTD Express',
  'DX',
  'Eagle',
  'Estes',
  'Evri',
  'FedEx',
  'First Global Logistics',
  'First Line',
  'FSC',
  'Fulfilla',
  'GLS',
  'Guangdong Weisuyi Information Technology (WSE)',
  'Heppner Internationale Spedition GmbH & Co.',
  'Iceland Post',
  'IDEX',
  'Israel Post',
  'Japan Post (EN)',
  'Japan Post (JA)',
  'La Poste Colissimo',
  'La Poste Burkina Faso',
  'La Poste',
  'Lasership',
  'Latvia Post',
  'Lietuvos Paštas',
  'Logisters',
  'Lone Star Overnight',
  'M3 Logistics',
  'Meteor Space',
  'Mondial Relay',
  'New Zealand Post',
  'NinjaVan',
  'North Russia Supply Chain (Shenzhen) Co.',
  'OnTrac',
  'Packeta',
  'Pago Logistics',
  'Ping An Da Tengfei Express',
  'Pitney Bowes',
  'Portal PostNord',
  'Poste Italiane',
  'PostNL',
  'PostNord DK',
  'PostNord NO',
  'PostNord SE',
  'Purolator',
  'Qxpress',
  'Qyun Express',
  'Royal Mail',
  'Royal Shipments',
  'Sagawa (EN)',
  'Sagawa (JA)',
  'Sendle',
  'SF Express',
  'SFC Fulfillment',
  'SHREE NANDAN COURIER',
  'Singapore Post',
  'Southwest Air Cargo',
  'StarTrack',
  'Step Forward Freight',
  'Swiss Post',
  'TForce Final Mile',
  'Tinghao',
  'TNT',
  'Toll IPEC',
  'United Delivery Service',
  'UPS',
  'USPS',
  'Venipak',
  'We Post',
  'Whistl',
  'Wizmo',
  'WMYC',
  'Xpedigo',
  'XPO Logistics',
  'Yamato (EN)',
  'Yamato (JA)',
  'YiFan Express',
  'YunExpress',
  'Aramex Australia',
  'TNT Australia',
  'Hunter Express',
  'Couriers Please',
  'Bonds',
  'Allied Express',
  'Direct Couriers',
  'Northline',
  'GO Logistics',
  'Österreichische Post',
  'Speedy',
  'Intelcom',
  'BoxKnight',
  'Loomis',
  'WanbExpress',
  'Zásilkovna',
  'Deutsche Post (DE)',
  'Deutsche Post (EN)',
  'DHL',
  'Swiship',
  'Hermes',
  'SEUR',
  'Colis Privé',
  'Parcelforce',
  'Yodel',
  'DHL Parcel',
  'Tuffnells',
  'ACS Courier',
  'Fastway',
  'DPD Ireland',
  'DTDC',
  'India Post',
  'Delhivery',
  'Gati KWE',
  'Professional Couriers',
  'XpressBees',
  'Ecom Express',
  'Ekart',
  'Shadowfax',
  'Bluedart',
  'BRT',
  'GLS Italy',
  'エコ配',
  '西濃運輸',
  '西濃スーパーエキスプレス',
  '福山通運',
  '日本通運',
  '名鉄運輸',
  '第一貨物',
  'Bring',
  'Inpost',
  'PTT',
  'Yurtiçi Kargo',
  'Aras Kargo',
  'Sürat Kargo',
  'Alliance Air Freight',
  'Pilot Freight',
  'LSO',
  'Old Dominion',
  'Pandion',
  'R+L Carriers',
  'Skynet',
] as const;

const STATUS_MAP: Record<string, { chip: string; label: string; row?: string }> = {
  pending: { chip: 'bg-white border border-gray-300 text-gray-600', label: 'Pending' },
  partial: { chip: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Partially Fulfilled', row: 'bg-amber-100 hover:bg-amber-200' },
  partially_fulfilled: { chip: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Partially Fulfilled', row: 'bg-amber-100 hover:bg-amber-200' },
  fulfilled: { chip: 'bg-blue-600 text-white', label: 'Fulfilled', row: 'bg-blue-100 hover:bg-blue-200' },
  shipped: { chip: 'bg-blue-600 text-white', label: 'Shipped', row: 'bg-blue-100 hover:bg-blue-200' },
  unfulfilled: { chip: 'bg-white border border-gray-300 text-gray-600', label: 'Pending' },
  closed: { chip: 'bg-gray-200 text-gray-700 border border-gray-300', label: 'Closed', row: 'bg-gray-100 hover:bg-gray-200' },
  canceled: { chip: 'bg-red-100 text-red-700 border border-red-200', label: 'Canceled', row: 'bg-red-100 hover:bg-red-200' },
  cancelled: { chip: 'bg-red-100 text-red-700 border border-red-200', label: 'Canceled', row: 'bg-red-100 hover:bg-red-200' },
};

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

function compactAddressParts(parts: Array<string | null>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

function getOrderAddressLines(order: Pick<OrderRow, 'address' | 'address2' | 'city' | 'state' | 'country'>) {
  return [
    compactAddressParts([order.address]),
    compactAddressParts([order.address2]),
    compactAddressParts([order.city, order.state, order.country]),
  ].filter(Boolean);
}

function getPackingSlipAddressLines(label: Pick<PackingSlipLabel, 'address' | 'address2' | 'city' | 'state' | 'zip' | 'country'>) {
  return [
    compactAddressParts([label.address]),
    compactAddressParts([label.address2]),
    compactAddressParts([label.city, label.state, label.zip]),
    compactAddressParts([label.country]),
  ].filter(Boolean);
}

function getApiErrorMessage(response: ApiResponse<unknown>, fallback: string) {
  if (response.errors?.length) return response.errors.join(', ');
  return response.message || fallback;
}

function isOrderFulfillmentLocked(order: Pick<OrderRow, 'closed' | 'canceled' | 'status'>) {
  const status = order.status.toLowerCase();
  return order.canceled || order.closed || status === 'canceled' || status === 'cancelled' || status === 'closed';
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatSyncDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getMonthDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

function fmtCalDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const yr = new Date().getFullYear() !== y ? ` ${y}` : '';
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${d}${yr}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fulfillmentStatuses, setFulfillmentStatuses] = useState<string[]>([]);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
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
  const [fullChecks, setFullChecks] = useState<Record<string, boolean>>({});
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});
  const [fulMessages, setFulMessages] = useState<Record<string, string>>({});
  const [fulSaving, setFulSaving] = useState<Record<string, boolean>>({});
  const [carrierDropdownOpen, setCarrierDropdownOpen] = useState(false);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [pendingFulfillment, setPendingFulfillment] = useState<{
    order: OrderRow;
    lines: FulfillmentLine[];
    notifyCustomer: boolean;
    barcodeInput: string;
    shippingDate: string;
    trackingNumber: string;
    trackingUrl: string;
    trackingCompany: string;
  } | null>(null);
  const [messageModal, setMessageModal] = useState<{
    order: OrderRow;
    admins: AdminOption[];
    messages: OrderAdminMessage[];
    selectedAdminId: string;
    message: string;
    loading: boolean;
    sending: boolean;
    error: string;
  } | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
  const [fulfillmentViewOrderId, setFulfillmentViewOrderId] = useState<string | null>(null);
  const { data: session } = useSession();
  const userRole = (session?.user?.role as string) ?? '';
  const userIsAdmin = userRole === 'admin';
  const userIsStaff = userRole === 'staff';
  const [orderFulfillmentRequests, setOrderFulfillmentRequests] = useState<Record<string, FulfillmentEditRequestRow[]>>({});
  const [pendingRequests, setPendingRequests] = useState<FulfillmentEditRequestRow[]>([]);
  const [pendingRequestsPanelOpen, setPendingRequestsPanelOpen] = useState(false);
  const [editFulModal, setEditFulModal] = useState<{
    order: OrderRow;
    conf: FulfillmentConfirmation;
    confId: string;
    barcodes: string;
    shippingDate: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    saving: boolean;
    error: string;
  } | null>(null);
  const [cancelFulModal, setCancelFulModal] = useState<{
    order: OrderRow;
    conf: FulfillmentConfirmation;
    confId: string;
    saving: boolean;
    error: string;
  } | null>(null);
  const [requestPermModal, setRequestPermModal] = useState<{
    order: OrderRow;
    conf: FulfillmentConfirmation;
    confId: string;
    requestType: 'edit' | 'cancel';
    availableAdmins: AdminOption[];
    selectedAdminIds: string[];
    reason: string;
    loadingAdmins: boolean;
    saving: boolean;
    error: string;
  } | null>(null);
  const [syncStoreIds, setSyncStoreIds] = useState<string[]>([]);
  const [syncStoreDropdownOpen, setSyncStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const periodDropdownRef = useRef<HTMLDivElement>(null);
  const syncStoreDropdownRef = useRef<HTMLDivElement>(null);
  const messageTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
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
    fulfillmentStatuses.forEach((s) => params.append('status', s));
    return params.toString();
  }, [pagination.page, pagination.pageSize, period, search, storeIds, dateFrom, dateTo, fulfillmentStatuses]);

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
        setRefreshToken((prev) => prev + 1);
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
    setRefreshToken((prev) => prev + 1);
  };

  const handleSync = async () => {
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

  const getFulfillmentShippingDates = (order: OrderRow) => {
    return order.fulfillmentItems.confirmations
      .map((confirmation) => confirmation.shippingDate?.trim() ?? '')
      .filter(Boolean);
  };

  const formatShippingDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;

    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      shippingDate: '',
      trackingNumber: '',
      trackingUrl: '',
      trackingCompany: '',
    });
    setCarrierDropdownOpen(false);
    setCarrierSearch('');
  };

  const closeFulfillmentConfirmation = () => {
    if (!pendingFulfillment || fulSaving[pendingFulfillment.order.id]) return;
    setPendingFulfillment(null);
    setCarrierDropdownOpen(false);
    setCarrierSearch('');
  };

  const confirmFul = async () => {
    if (!pendingFulfillment) return;

    const { order, lines, notifyCustomer, barcodeInput, shippingDate, trackingNumber, trackingUrl, trackingCompany } = pendingFulfillment;
    const barcodes = parseBarcodes(barcodeInput);
    const trackingInfo = {
      number: trackingNumber.trim(),
      url: trackingUrl.trim(),
      company: trackingCompany.trim(),
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
          shippingDate: shippingDate || undefined,
          barcodes,
        }),
      });
      const json = (await res.json()) as ApiResponse<{
        orderId: string;
        status: string;
        fulfillmentItems: OrderRow['fulfillmentItems'];
      }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to confirm fulfillment'));
      }

      setOrders((prev) => prev.map((item) => (
        item.id === order.id
          ? { ...item, status: json.data.status, fulfillmentItems: json.data.fulfillmentItems }
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
    setEditFulModal({
      order, conf, confId,
      barcodes: conf.barcodes?.join(' ') ?? '',
      shippingDate: conf.shippingDate ?? '',
      carrier: conf.trackingInfo?.company ?? '',
      trackingNumber: conf.trackingInfo?.number ?? '',
      trackingUrl: conf.trackingInfo?.url ?? '',
      saving: false, error: '',
    });
  };

  const submitEditFulfillment = async () => {
    if (!editFulModal) return;
    const { order, confId, barcodes, shippingDate, carrier, trackingNumber, trackingUrl } = editFulModal;
    setEditFulModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfillments/${encodeURIComponent(confId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcodes: barcodes.split(/\s+/).filter(Boolean),
          shippingDate: shippingDate || null,
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
    setCancelFulModal({ order, conf, confId, saving: false, error: '' });
  };

  const submitCancelFulfillment = async () => {
    if (!cancelFulModal) return;
    const { order, confId } = cancelFulModal;
    setCancelFulModal((prev) => prev ? { ...prev, saving: true, error: '' } : null);
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfillments/${encodeURIComponent(confId)}`, { method: 'DELETE' });
      const json = (await res.json()) as ApiResponse<{ orderId: string; status: string; fulfillmentItems: OrderRow['fulfillmentItems'] }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to cancel fulfillment'));
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: json.data.status, fulfillmentItems: json.data.fulfillmentItems } : o));
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

  const writePrintDocument = (printWindow: Window, documentHtml: string) => {
    printWindow.document.open();
    printWindow.document.write(documentHtml);
    printWindow.document.close();
  };

  const waitForPrintAssets = async (printWindow: Window) => {
    const images = Array.from(printWindow.document.images);
    if (images.length === 0) return;

    await Promise.race([
      Promise.all(images.map((image) => (
        image.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              image.addEventListener('load', () => resolve(), { once: true });
              image.addEventListener('error', () => resolve(), { once: true });
            })
      ))),
      new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
    ]);
  };

  const buildPackingSlipLoadingDocument = (orderNumber: string) => {
    return `
      <!doctype html>
      <html>
        <head>
          <title>Loading label ${escapeHtml(orderNumber)}</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; }
            .loading { text-align: center; font-size: 14px; line-height: 1.5; }
            .muted { color: #555; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="loading">
            <div>Loading packing label...</div>
            <div class="muted">Order #${escapeHtml(orderNumber)}</div>
          </div>
        </body>
      </html>
    `;
  };

  const buildPackingSlipDocument = (label: PackingSlipLabel, origin: string) => {
    const addressLines = getPackingSlipAddressLines(label);
    const logoSrc = getPackingSlipLogoSrc(label.storeLogoPath, origin);
    const storeUrl = formatStoreUrl(label.storeUrl, label.storeDomain);

    return `
      <!doctype html>
      <html>
        <head>
          <title>Label ${escapeHtml(label.number)}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; }
            .page { width: 4in; min-height: 6in; padding: .22in; display: flex; flex-direction: column; }
            .slip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 16px; gap: 12px; }
            .brand { min-width: 0; }
            .logo { max-width: 1.15in; max-height: .55in; object-fit: contain; display: block; margin-bottom: 6px; }
            .store { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; overflow-wrap: anywhere; }
            .url { margin-top: 2px; color: #333; font-size: 10px; overflow-wrap: anywhere; }
            .order-number { font-size: 18px; font-weight: 800; white-space: nowrap; }
            .label { color: #555; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
            .recipient { font-size: 18px; font-weight: 800; line-height: 1.2; margin-bottom: 10px; overflow-wrap: anywhere; }
            .address { font-size: 20px; font-weight: 700; line-height: 1.32; overflow-wrap: anywhere; }
            .phone { margin-top: 14px; font-size: 16px; font-weight: 700; }
            .note { margin-top: 14px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 13px; font-weight: 700; line-height: 1.35; overflow-wrap: anywhere; white-space: pre-wrap; }
            .note-label { color: #555; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
            .content { flex: 1; }
            @media print {
              @page { size: 4in 6in; margin: 0; }
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .page { width: 4in; min-height: 6in; padding: .22in; }
            }
          </style>
        </head>
        <body>
        <section class="page">
          <header class="slip-header">
            <div class="brand">
              ${logoSrc ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(label.storeName)} logo" />` : ''}
              <div class="store">${escapeHtml(label.storeName)}</div>
              ${storeUrl ? `<div class="url">${escapeHtml(storeUrl)}</div>` : ''}
            </div>
            <div class="order-number">#${escapeHtml(label.number)}</div>
          </header>

          <div class="content">
            <div class="label">Ship to</div>
            <div class="recipient">${escapeHtml(label.customer)}</div>
            <div class="address">
              ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
            </div>
            ${label.phone ? `<div class="phone">Phone: ${escapeHtml(label.phone)}</div>` : ''}
            ${label.note ? `<div class="note"><div class="note-label">Note</div>${escapeHtml(label.note)}</div>` : ''}
          </div>
        </section>
        </body>
      </html>
    `;
  };

  const getPackingSlipLogoSrc = (logoPath: string | null, origin: string) => {
    const filename = logoPath?.split('/').pop();
    return filename ? `${origin}/api/uploads/logos/${encodeURIComponent(filename)}` : '';
  };

  const formatStoreUrl = (storeUrl: string | null, storeDomain: string) => {
    const value = storeUrl?.trim() || storeDomain.trim();
    return "https://" + value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
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

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setPeriod('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setPeriod('all');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusToggle = (status: string) => {
    setFulfillmentStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
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
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const goToPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const pageNumbers = useMemo(() => {
    const current = pagination.page;
    const total = pagination.totalPages;
    const from = Math.max(1, current - 2);
    const to = Math.min(total, current + 2);
    const pages: number[] = [];
    for (let i = from; i <= to; i += 1) pages.push(i);
    return pages;
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
      if (syncStoreDropdownRef.current && !syncStoreDropdownRef.current.contains(e.target as Node)) {
        setSyncStoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = searchInput !== '' || storeIds.length > 0 || period !== 'all' || !!dateFrom || !!dateTo || fulfillmentStatuses.length > 0;
  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
  const syncMessage = syncActive
    ? syncJob.status === 'queued'
      ? 'Sync queued'
      : `Syncing: ${syncJob.totalFetched} fetched`
    : lastSynced || 'Not synced yet';

  return (
    <main className="flex-1 p-4 md:p-6">
      {userIsAdmin && pendingRequests.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setPendingRequestsPanelOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100 transition-colors duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">{pendingRequests.length}</span>
              <span className="text-sm font-semibold text-amber-800">Fulfillment permission request{pendingRequests.length > 1 ? 's' : ''} pending</span>
            </div>
            <svg className={`w-4 h-4 text-amber-600 transition-transform ${pendingRequestsPanelOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {pendingRequestsPanelOpen && (
            <div className="border-t border-amber-200 divide-y divide-amber-100">
              {pendingRequests.map((req) => (
                <div key={req.id} className="px-4 py-3 bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="text-sm min-w-0">
                      <p className="font-semibold text-gray-800">{req.requestedByName} &mdash; <span className="font-normal text-gray-600">{req.requestType === 'edit' ? 'Edit' : 'Cancel'} fulfillment</span></p>
                      <p className="text-xs text-gray-500 mt-0.5">Order #{req.orderNumber} &bull; {new Date(req.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-gray-700 mt-1 italic truncate max-w-sm">&ldquo;{req.reason}&rdquo;</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void handleAdminApproveRequest(req.id)}
                        className="text-xs font-semibold text-white bg-green-600 rounded-lg px-3 py-1.5 hover:bg-green-700 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => void handleAdminRejectRequest(req.id)}
                        className="text-xs font-semibold text-white bg-red-500 rounded-lg px-3 py-1.5 hover:bg-red-600 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-start gap-2 mb-5">
        {/* Search */}
        <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm flex-1 min-w-48 sm:flex-none sm:w-64">
          <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="name order# SKU address… (space = AND)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-2 py-2 text-sm focus:outline-none min-w-0"
          />
        </div>

        {/* Store multi-select */}
        <div className="relative" ref={storeDropdownRef}>
          <button
            onClick={() => setStoreDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
          >
            {storeIds.length === 0 ? 'All Stores' : `${storeIds.length} Store${storeIds.length > 1 ? 's' : ''}`}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {storeDropdownOpen && (
            <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-44 py-1">
              <button
                onClick={() => { setStoreIds([]); setPagination((prev) => ({ ...prev, page: 1 })); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${storeIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
              >
                All Stores
              </button>
              {stores.length > 0 && <div className="border-t border-gray-100 my-1" />}
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => handleStoreToggle(store.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${storeIds.includes(store.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {storeIds.includes(store.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="text-gray-700">{store.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Period + calendar dropdown */}
        <div className="relative" ref={periodDropdownRef}>
          <button
            onClick={() => setPeriodDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
          >
            {period === 'custom'
              ? dateFrom && dateTo
                ? `${fmtCalDate(dateFrom)} – ${fmtCalDate(dateTo)}`
                : dateFrom
                ? `From ${fmtCalDate(dateFrom)}`
                : 'Custom Range'
              : PERIODS.find((p) => p.value === period)?.label ?? 'All Time'}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {periodDropdownOpen && (
            <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-max min-w-40">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handlePeriodChange(item.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${period === item.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                >
                  {item.label}
                  {period === item.value && (
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}

              {/* Calendar — shown when Custom is active */}
              {period === 'custom' && (
                <div className="border-t border-gray-100 p-3" onMouseLeave={() => setHoverDate(null)}>
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCalendarNav((prev) => { const d = new Date(prev.year, prev.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }}
                      className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex gap-10 text-xs font-semibold text-gray-700 select-none">
                      {[0, 1].map((offset) => {
                        const d = new Date(calendarNav.year, calendarNav.month + offset, 1);
                        return <span key={offset}>{MONTH_LABELS[d.getMonth()]} {d.getFullYear()}</span>;
                      })}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setCalendarNav((prev) => { const d = new Date(prev.year, prev.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }}
                      className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Two-month grid */}
                  <div className="flex gap-5">
                    {[0, 1].map((offset) => {
                      const d = new Date(calendarNav.year, calendarNav.month + offset, 1);
                      const yr = d.getFullYear();
                      const mo = d.getMonth();
                      const days = getMonthDays(yr, mo);
                      const today = new Date().toISOString().split('T')[0];
                      const effTo = !dateTo && hoverDate ? hoverDate : dateTo;
                      const rStart = dateFrom && effTo ? (dateFrom <= effTo ? dateFrom : effTo) : dateFrom;
                      const rEnd = dateFrom && effTo ? (dateFrom <= effTo ? effTo : dateFrom) : effTo;

                      return (
                        <div key={offset}>
                          <div className="grid grid-cols-7 mb-1">
                            {DAY_LABELS.map((dl) => (
                              <div key={dl} className="w-8 h-6 flex items-center justify-center text-xs text-gray-400 font-medium select-none">{dl}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7">
                            {days.map((date, i) => {
                              if (!date) return <div key={i} className="w-8 h-8" />;
                              const isStart = date === dateFrom;
                              const isEnd = !!dateTo && date === dateTo;
                              const inRange = !!(rStart && rEnd && date > rStart && date < rEnd);
                              const isToday = date === today;
                              let cls = 'w-8 h-8 flex items-center justify-center text-xs select-none transition-colors cursor-pointer ';
                              if (isStart || isEnd) cls += 'bg-blue-600 text-white rounded-full font-semibold';
                              else if (inRange) cls += 'bg-blue-100 text-blue-800 hover:bg-blue-200';
                              else if (isToday) cls += 'font-bold text-blue-500 hover:bg-gray-100 rounded-full';
                              else cls += 'text-gray-700 hover:bg-gray-100 rounded-full';
                              return (
                                <div
                                  key={date}
                                  className={cls}
                                  onClick={(e) => { e.stopPropagation(); handleCalendarDateClick(date); }}
                                  onMouseEnter={() => !dateTo && setHoverDate(date)}
                                >
                                  {new Date(date + 'T00:00:00').getDate()}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Clear date range link */}
                  {(dateFrom || dateTo) && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {dateFrom && dateTo ? `${fmtCalDate(dateFrom)} – ${fmtCalDate(dateTo)}` : dateFrom ? `From ${fmtCalDate(dateFrom)}` : ''}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDateFrom(''); setDateTo(''); setPeriod('all'); }}
                        className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
                      >
                        Clear dates
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fulfillment status multi-select */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            onClick={() => setStatusDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
          >
            {fulfillmentStatuses.length === 0 ? 'All Statuses' : `${fulfillmentStatuses.length} Status${fulfillmentStatuses.length > 1 ? 'es' : ''}`}
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {statusDropdownOpen && (
            <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-44 py-1">
              <button
                onClick={() => { setFulfillmentStatuses([]); setPagination((prev) => ({ ...prev, page: 1 })); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${fulfillmentStatuses.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
              >
                All Statuses
              </button>
              <div className="border-t border-gray-100 my-1" />
              {FULFILLMENT_STATUSES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleStatusToggle(item.value)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${fulfillmentStatuses.includes(item.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                    {fulfillmentStatuses.includes(item.value) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync / Refresh */}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 px-2.5 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
          <div ref={syncStoreDropdownRef} className="relative">
            <div className="flex items-stretch gap-0">
              <button
                onClick={handleSync}
                disabled={syncing || loading || syncActive}
                className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-l-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border-r-0"
              >
                <svg
                  className={`w-4 h-4 ${syncing || syncActive ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5m0 0h-5m5 0v5M19 5A9 9 0 005 19m0 0h5m-5 0v-5" />
                </svg>
                {syncActive ? 'Syncing...' : syncing ? 'Queueing...' : 'Sync'}
              </button>
              <button
                onClick={() => setSyncStoreDropdownOpen((prev) => !prev)}
                disabled={syncing || loading || syncActive}
                className="flex items-center bg-white border border-gray-300 text-gray-600 text-sm px-2 py-2 rounded-r-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {syncStoreDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Select Stores to Sync
                </div>
                <button
                  onClick={() => { setSyncStoreIds([]); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${syncStoreIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
                >
                  All Stores
                </button>
                {stores.length > 0 && <div className="border-t border-gray-100 my-1" />}
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSyncStoreToggle(store.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${syncStoreIds.includes(store.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {syncStoreIds.includes(store.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-gray-700 truncate">{store.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={syncing}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ transition: 'transform .6s ease', transform: `rotate(${refreshRotation}deg)` }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <span className="min-w-0 flex-1 text-xs text-gray-400 sm:flex-none sm:whitespace-nowrap">{syncMessage}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[820px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order No.</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordered At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Shipping Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-12 text-sm">Loading orders...</td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={9} className="text-center text-red-500 py-12 text-sm">{error}</td>
                </tr>
              )}

              {!loading && !error && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-gray-400 py-16 text-sm">No orders found.</td>
                </tr>
              )}

              {!loading && !error && orders.map((order, index) => {
                const statusKey = order.status.toLowerCase();
                const status = STATUS_MAP[statusKey] ?? STATUS_MAP.pending;
                const isExpanded = expandedId === order.id;
                const orderAddressLines = getOrderAddressLines(order);
                const shippingDates = getFulfillmentShippingDates(order);
                return (
                  <Fragment key={order.id}>
                    <tr
                      className={`border-b border-gray-100 ${status.row ?? 'hover:bg-gray-50'} transition-colors duration-100`}
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.chip}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
                        {order.itemsCount} item{order.itemsCount !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {shippingDates.length > 0 ? (
                          <div className="space-y-1">
                            {shippingDates.map((shippingDate, shippingDateIndex) => (
                              <div key={`${shippingDate}-${shippingDateIndex}`}>{formatShippingDate(shippingDate)}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
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
                                void printPackingSlipLabel(order);
                              }}
                              disabled={printingOrderId === order.id}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-150 cursor-pointer"
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
                              className="relative p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-150 cursor-pointer"
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
                        <td colSpan={9} className="p-0">
                          <div className="relative bg-blue-50 border-b border-blue-100 p-5">
                            {order.fulfillmentItems.confirmations.length > 0 && (
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
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer &amp; Order</h4>
                                <p className="text-sm font-semibold text-gray-800">{order.customer}</p>
                                {orderAddressLines.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {orderAddressLines.map((line) => (
                                      <p key={line}>{line}</p>
                                    ))}
                                  </div>
                                )}
                                <p className="text-xs text-gray-400 mt-2">{order.storeName} · {order.number}</p>
                                {order.note && (
                                  <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{order.note}</p>
                                )}
                              </div>

                              {fulfillmentViewOrderId === order.id ? (
                                <div className="lg:col-span-2">
                                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Fulfillment Details</h4>
                                  <div className="space-y-3">
                                    {order.fulfillmentItems.confirmations.map((conf, confIndex) => (
                                      <div key={conf.id ?? confIndex} className="bg-white rounded-lg border border-blue-200 p-3">
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2 text-xs text-gray-600">
                                          {conf.confirmedAt && (
                                            <span><span className="font-medium text-gray-500">Confirmed:</span> {new Date(conf.confirmedAt).toLocaleString()}</span>
                                          )}
                                          {conf.shippingDate && (
                                            <span><span className="font-medium text-gray-500">Ship:</span> {formatShippingDate(conf.shippingDate)}</span>
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
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Product Fulfilment</h4>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b border-blue-200">
                                          <th className="text-left py-1 text-gray-400 font-medium">Product</th>
                                          <th className="text-left py-1 text-gray-400 font-medium">SKU</th>
                                          <th className="text-center py-1 text-gray-400 font-medium">QTY</th>
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
                                          return (
                                            <tr key={`${order.id}-${itemIndex}`} className="border-b border-blue-100">
                                              <td className="py-1.5 pr-2 text-gray-700">{item.name}</td>
                                              <td className="py-1.5 pr-2 font-mono text-gray-500">{item.sku || '-'}</td>
                                              <td className="py-1.5 text-center text-gray-700">
                                                {fulfilledQty}/{item.qty}
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

                                  <div>
                                    {(() => {
                                      const lockedFulfillment = isOrderFulfillmentLocked(order);
                                      const canConfirmFulfillment = !lockedFulfillment && getFulfillmentLines(order).length > 0;
                                      const isConfirmDisabled = fulSaving[order.id] || !canConfirmFulfillment;
                                      return (
                                        <>
                                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Actions</h4>
                                          <button
                                            onClick={() => openFulfillmentConfirmation(order)}
                                            disabled={isConfirmDisabled}
                                            className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors duration-150 mb-2 ${
                                              isConfirmDisabled
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                            }`}
                                          >
                                            {lockedFulfillment ? 'Fulfilment Locked' : fulSaving[order.id] ? 'Confirming...' : 'Confirm Fulfilment'}
                                          </button>
                                        </>
                                      );
                                    })()}
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => void printPackingSlipLabel(order)}
                                        disabled={printingOrderId === order.id}
                                        className="flex-1 border border-gray-300 bg-white text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                      >
                                        {printingOrderId === order.id ? 'Loading label...' : 'Print Label'}
                                      </button>
                                      <button
                                        onClick={() => void openMessageModal(order)}
                                        className="relative flex-1 border border-gray-300 bg-white text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
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

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Showing {(pagination.total === 0) ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
            {' '}to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} orders
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
              className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => goToPage(pageNumber)}
                disabled={loading}
                className={`px-2.5 py-1.5 text-xs border rounded-lg ${pagination.page === pageNumber ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
              className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {messageModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-message-title"
          onClick={closeMessageModal}
        >
          <div
            className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg bg-white shadow-xl border border-gray-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200">
              <div>
                <h3 id="admin-message-title" className="text-base font-semibold text-gray-900">
                  Admin message
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Order {messageModal.order.number} · {messageModal.order.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMessageModal}
                disabled={messageModal.sending}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[calc(100dvh-10rem)] overflow-y-auto px-5 py-4">
              {messageModal.loading ? (
                <div className="py-12 text-center text-sm text-gray-400">Loading messages...</div>
              ) : (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                  <div className="space-y-3">
                    <label className="block text-sm text-gray-700">
                      <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Admin</span>
                      <select
                        value={messageModal.selectedAdminId}
                        onChange={(event) => {
                          setMessageModal((prev) => prev ? { ...prev, selectedAdminId: event.target.value } : prev);
                        }}
                        disabled={messageModal.sending || messageModal.admins.length === 0}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {messageModal.admins.length === 0 ? (
                          <option value="">No active admins</option>
                        ) : (
                          messageModal.admins.map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.name} - {admin.email}
                            </option>
                          ))
                        )}
                      </select>
                    </label>

                    <label className="block text-sm text-gray-700">
                      <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Message</span>
                      <textarea
                        value={messageModal.message}
                        onChange={(event) => {
                          setMessageModal((prev) => prev ? { ...prev, message: event.target.value, error: '' } : prev);
                        }}
                        rows={7}
                        maxLength={5000}
                        disabled={messageModal.sending}
                        placeholder="Write a message for the admin"
                        className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
                      />
                    </label>

                    {messageModal.error && (
                      <p className="text-sm text-red-600">{messageModal.error}</p>
                    )}

                    <button
                      type="button"
                      onClick={submitAdminMessage}
                      disabled={messageModal.sending || messageModal.admins.length === 0}
                      className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {messageModal.sending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Message history</h4>
                    {messageModal.messages.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-400">
                        No messages sent yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {messageModal.messages.map((item) => (
                          <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{item.adminName}</p>
                                <p className="text-xs text-gray-500 truncate">{item.adminEmail}</p>
                              </div>
                              <p className="text-xs text-gray-400 sm:text-right">
                                {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {(item.senderName || item.senderEmail) && (
                              <p className="mt-1 text-xs text-gray-500">
                                Sent by {[item.senderName, item.senderEmail].filter(Boolean).join(' - ')}
                              </p>
                            )}
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-700">{item.message}</p>
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
      )}

      {pendingFulfillment && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 px-4 pb-4 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fulfillment-confirmation-title"
          onClick={closeFulfillmentConfirmation}
        >
          <div
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg bg-white shadow-xl border border-gray-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 id="fulfillment-confirmation-title" className="text-base font-semibold text-gray-900">
                Confirm fulfilment
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Order {pendingFulfillment.order.number} will be fulfilled in Shopify.
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-700">
                After confirming fulfilment, these items cannot be changed without admin permission.
              </p>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-gray-500">Items to fulfill</p>
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {pendingFulfillment.lines.map((line) => {
                    const item = pendingFulfillment.order.items.find((orderItem) => orderItem.id === line.lineItemId);
                    return (
                      <li key={line.lineItemId} className="flex justify-between gap-3">
                        <span className="truncate">{item?.name ?? line.lineItemId}</span>
                        <span className="font-medium">x{line.quantity}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <label className="block text-sm text-gray-700">
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Barcodes</span>
                <input
                  type="text"
                  value={pendingFulfillment.barcodeInput}
                  onChange={(event) => {
                    setPendingFulfillment((prev) => (
                      prev ? { ...prev, barcodeInput: event.target.value } : prev
                    ));
                  }}
                  placeholder="Scan or type barcodes"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Use a space between barcodes when adding multiple barcodes.
                </span>
              </label>

              <div className="grid grid-cols-1 gap-3">
                <label className="text-sm text-gray-700">
                  <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Shipping date</span>
                  <input
                    type="date"
                    value={pendingFulfillment.shippingDate}
                    onChange={(event) => {
                      setPendingFulfillment((prev) => (
                        prev ? { ...prev, shippingDate: event.target.value } : prev
                      ));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>

                <div className="text-sm text-gray-700">
                  <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Shipping carrier</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCarrierDropdownOpen((prev) => !prev);
                        setCarrierSearch('');
                      }}
                      className="w-full min-h-10 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                    >
                      <span className={pendingFulfillment.trackingCompany ? 'text-gray-800 truncate' : 'text-gray-400'}>
                        {pendingFulfillment.trackingCompany || 'Select carrier'}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${carrierDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {carrierDropdownOpen && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
                        <div className="p-2 border-b border-gray-100">
                          <input
                            type="text"
                            value={carrierSearch}
                            onChange={(event) => setCarrierSearch(event.target.value)}
                            placeholder="Search carrier"
                            autoFocus
                            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto py-1">
                          {filteredTrackingCarriers.length > 0 ? (
                            filteredTrackingCarriers.map((carrier, index) => (
                              <button
                                key={`${carrier}-${index}`}
                                type="button"
                                onClick={() => {
                                  setPendingFulfillment((prev) => (
                                    prev ? { ...prev, trackingCompany: carrier } : prev
                                  ));
                                  setCarrierDropdownOpen(false);
                                  setCarrierSearch('');
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 cursor-pointer ${
                                  pendingFulfillment.trackingCompany === carrier ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                }`}
                              >
                                {carrier}
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-3 text-sm text-gray-400">No carriers found.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <label className="text-sm text-gray-700">
                  <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tracking number</span>
                  <input
                    type="text"
                    value={pendingFulfillment.trackingNumber}
                    onChange={(event) => {
                      setPendingFulfillment((prev) => (
                        prev ? { ...prev, trackingNumber: event.target.value } : prev
                      ));
                    }}
                    placeholder="Enter tracking number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>

                <label className="text-sm text-gray-700">
                  <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tracking URL</span>
                  <input
                    type="url"
                    value={pendingFulfillment.trackingUrl}
                    onChange={(event) => {
                      setPendingFulfillment((prev) => (
                        prev ? { ...prev, trackingUrl: event.target.value } : prev
                      ));
                    }}
                    placeholder="https://carrier.example/track/..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pendingFulfillment.notifyCustomer}
                  onChange={(event) => {
                    setPendingFulfillment((prev) => (
                      prev ? { ...prev, notifyCustomer: event.target.checked } : prev
                    ));
                  }}
                  className="rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                Send notification to customer
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg sm:flex-row sm:items-center sm:justify-end">
              <button
                onClick={closeFulfillmentConfirmation}
                disabled={fulSaving[pendingFulfillment.order.id]}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmFul}
                disabled={fulSaving[pendingFulfillment.order.id]}
                className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {fulSaving[pendingFulfillment.order.id] ? 'Confirming...' : 'Confirm fulfilment'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Fulfillment Modal */}
      {editFulModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Edit Fulfillment</h2>
              <p className="text-xs text-gray-500 mt-0.5">Order #{editFulModal.order.number}</p>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {editFulModal.error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editFulModal.error}</div>}
              <label className="block text-sm text-gray-700">
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Barcodes (space-separated)</span>
                <input type="text" value={editFulModal.barcodes} onChange={(e) => setEditFulModal((p) => p ? { ...p, barcodes: e.target.value } : null)} placeholder="barcode1 barcode2" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
              <label className="block text-sm text-gray-700">
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Shipping Date</span>
                <input type="date" value={editFulModal.shippingDate} onChange={(e) => setEditFulModal((p) => p ? { ...p, shippingDate: e.target.value } : null)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
              <label className="block text-sm text-gray-700">
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Carrier</span>
                <input type="text" value={editFulModal.carrier} onChange={(e) => setEditFulModal((p) => p ? { ...p, carrier: e.target.value } : null)} list="edit-ful-carriers" placeholder="e.g. Australia Post" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <datalist id="edit-ful-carriers">{SHOPIFY_TRACKING_CARRIERS.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="block text-sm text-gray-700">
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tracking Number</span>
                <input type="text" value={editFulModal.trackingNumber} onChange={(e) => setEditFulModal((p) => p ? { ...p, trackingNumber: e.target.value } : null)} placeholder="Enter tracking number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
              <label className="block text-sm text-gray-700">
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Tracking URL</span>
                <input type="url" value={editFulModal.trackingUrl} onChange={(e) => setEditFulModal((p) => p ? { ...p, trackingUrl: e.target.value } : null)} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
              <button onClick={() => setEditFulModal(null)} disabled={editFulModal.saving} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50">Cancel</button>
              <button onClick={() => void submitEditFulfillment()} disabled={editFulModal.saving} className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60">{editFulModal.saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Fulfillment Modal */}
      {cancelFulModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Cancel Fulfillment</h2>
              <p className="text-xs text-gray-500 mt-0.5">Order #{cancelFulModal.order.number}</p>
            </div>
            <div className="p-5">
              {cancelFulModal.error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{cancelFulModal.error}</div>}
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-1">Are you sure?</p>
                  <p className="text-gray-600 text-xs">This will cancel the fulfillment in Shopify and remove it from this order. This cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
              <button onClick={() => setCancelFulModal(null)} disabled={cancelFulModal.saving} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50">Go Back</button>
              <button onClick={() => void submitCancelFulfillment()} disabled={cancelFulModal.saving} className="px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer disabled:opacity-60">{cancelFulModal.saving ? 'Cancelling…' : 'Yes, Cancel Fulfillment'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Permission Request Modal */}
      {requestPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Request {requestPermModal.requestType === 'edit' ? 'Edit' : 'Cancel'} Permission</h2>
              <p className="text-xs text-gray-500 mt-0.5">Order #{requestPermModal.order.number}</p>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {requestPermModal.error && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{requestPermModal.error}</div>}
              <div>
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-2">Notify admin(s) *</span>
                {requestPermModal.loadingAdmins ? (
                  <div className="text-xs text-gray-400">Loading admins…</div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {requestPermModal.availableAdmins.map((admin) => (
                      <label key={admin.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestPermModal.selectedAdminIds.includes(admin.id)}
                          onChange={() => setRequestPermModal((prev) => {
                            if (!prev) return null;
                            const next = prev.selectedAdminIds.includes(admin.id)
                              ? prev.selectedAdminIds.filter((id) => id !== admin.id)
                              : [...prev.selectedAdminIds, admin.id];
                            return { ...prev, selectedAdminIds: next };
                          })}
                          className="rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">{admin.name} <span className="text-xs text-gray-400">({admin.email})</span></span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <label className="block text-sm text-gray-700">
                <span className="block text-xs font-semibold uppercase text-gray-500 mb-1">Reason *</span>
                <textarea
                  value={requestPermModal.reason}
                  onChange={(e) => setRequestPermModal((p) => p ? { ...p, reason: e.target.value } : null)}
                  rows={4}
                  maxLength={2000}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Explain why you need this permission…"
                />
                <span className="text-xs text-gray-400">{requestPermModal.reason.length}/2000</span>
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
              <button onClick={() => setRequestPermModal(null)} disabled={requestPermModal.saving} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50">Cancel</button>
              <button onClick={() => void submitPermissionRequest()} disabled={requestPermModal.saving || requestPermModal.loadingAdmins} className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60">{requestPermModal.saving ? 'Submitting…' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
