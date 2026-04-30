'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-toastify';

type OrderItem = { id: string; name: string; sku: string; qty: number };
type OrderRow = {
  id: string;
  number: string;
  customer: string;
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
};

type StoreOption = { id: string; name: string; storeDomain: string };
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
  windowStartedAt: string;
  windowEndedAt: string;
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

type FulfillmentLine = { lineItemId: string; quantity: number; full: boolean };
type FulfillmentConfirmation = {
  id?: string;
  confirmedAt?: string | null;
  shopifyFulfillmentId?: string | null;
  shopifyFulfillmentStatus?: string | null;
  trackingInfo?: {
    number?: string;
    company?: string;
    url?: string;
  } | null;
  lines: Array<{ lineItemId: string; quantity: number; full?: boolean }>;
};

const PERIODS = [
  { label: 'All', value: 'all' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
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
  'DHL Parcel',
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

const STATUS_MAP: Record<string, { chip: string; label: string }> = {
  pending: { chip: 'bg-white border border-gray-300 text-gray-600', label: 'Pending' },
  partial: { chip: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Partially Fulfilled' },
  partially_fulfilled: { chip: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Partially Fulfilled' },
  fulfilled: { chip: 'bg-blue-600 text-white', label: 'Fulfilled' },
  shipped: { chip: 'bg-blue-600 text-white', label: 'Shipped' },
  unfulfilled: { chip: 'bg-white border border-gray-300 text-gray-600', label: 'Pending' },
  closed: { chip: 'bg-gray-200 text-gray-700 border border-gray-300', label: 'Closed' },
  canceled: { chip: 'bg-red-100 text-red-700 border border-red-200', label: 'Canceled' },
  cancelled: { chip: 'bg-red-100 text-red-700 border border-red-200', label: 'Canceled' },
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [storeId, setStoreId] = useState('');
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
  const [barcodeLists, setBarcodeLists] = useState<Record<string, string[]>>({});
  const [bcInputs, setBcInputs] = useState<Record<string, string>>({});
  const [barcodeSaving, setBarcodeSaving] = useState<Record<string, boolean>>({});
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
    trackingNumber: string;
    trackingUrl: string;
    trackingCompany: string;
  } | null>(null);
  const [pendingPrint, setPendingPrint] = useState<{
    order: OrderRow;
    selectedKeys: string[];
  } | null>(null);
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
    params.set('period', period);
    if (search) params.set('search', search);
    if (storeId) params.set('storeId', storeId);
    return params.toString();
  }, [pagination.page, pagination.pageSize, period, search, storeId]);

  const filteredTrackingCarriers = useMemo(() => {
    const query = carrierSearch.trim().toLowerCase();
    if (!query) return SHOPIFY_TRACKING_CARRIERS;
    return SHOPIFY_TRACKING_CARRIERS.filter((carrier) => carrier.toLowerCase().includes(query));
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
        setBarcodeLists((prev) => {
          const next = { ...prev };
          json.data.orders.forEach((order) => {
            next[order.id] = prev[order.id] ?? order.barcodes;
          });
          return next;
        });
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
      const res = await fetch('/api/orders/sync', { method: 'POST' });
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

  const toggleFull = (orderId: string, itemIndex: number, maxQty: number, fulfilledQty: number) => {
    const key = rowItemKey(orderId, itemIndex);
    const nextChecked = !(fullChecks[key] ?? false);
    setFullChecks((prev) => ({ ...prev, [key]: nextChecked }));
    setPartialValues((prev) => ({ ...prev, [key]: nextChecked ? maxQty : fulfilledQty }));
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
        updated[rowItemKey(order.id, itemIndex)] = nextValue ? item.qty : getFulfilledQty(order, item.id);
      });
      return updated;
    });
  };

  const validPartial = (orderId: string, itemIndex: number, minQty: number, maxQty: number, value: string) => {
    const parsed = parseInt(value, 10);
    const clamped = Number.isNaN(parsed) || parsed < minQty ? minQty : parsed > maxQty ? maxQty : parsed;
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
        const requestedTotal = Math.min(item.qty, Math.max(fulfilledQty, partialValues[key] ?? fulfilledQty));
        const quantity = isFull ? remainingQty : Math.max(0, requestedTotal - fulfilledQty);

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

  const mergeBarcodes = (existing: string[], incoming: string[]) => {
    return Array.from(new Set([...existing, ...incoming]));
  };

  const saveBC = async (order: OrderRow) => {
    const inputBarcodes = parseBarcodes(bcInputs[order.id] ?? '');
    const nextBarcodes = mergeBarcodes(barcodeLists[order.id] ?? order.barcodes, inputBarcodes);

    if (nextBarcodes.length === 0) {
      toast.warning('Enter at least one barcode.');
      return;
    }

    setBarcodeSaving((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/orders/${order.id}/barcodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcodes: nextBarcodes }),
      });
      const json = (await res.json()) as ApiResponse<{ orderId: string; barcodes: string[] }>;

      if (!res.ok || !json.success) {
        throw new Error(getApiErrorMessage(json, 'Failed to save barcodes'));
      }

      setBarcodeLists((prev) => ({ ...prev, [order.id]: json.data.barcodes }));
      setOrders((prev) => prev.map((item) => (
        item.id === order.id ? { ...item, barcodes: json.data.barcodes } : item
      )));
      setBcInputs((prev) => ({ ...prev, [order.id]: '' }));
      toast.success('Barcodes saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save barcodes.');
    } finally {
      setBarcodeSaving((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const removeBC = (orderId: string, value: string) => {
    setBarcodeLists((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] ?? []).filter((barcode) => barcode !== value),
    }));
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

    const { order, lines, notifyCustomer, trackingNumber, trackingUrl, trackingCompany } = pendingFulfillment;
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
        body: JSON.stringify({ lines, notifyCustomer, trackingInfo }),
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

  const getPrintableFulfillments = (order: OrderRow) => {
    return order.fulfillmentItems.confirmations.filter((fulfillment) => fulfillment.lines.length > 0);
  };

  const getFulfillmentPrintKey = (fulfillment: FulfillmentConfirmation, index: number) => {
    return fulfillment.id ?? fulfillment.shopifyFulfillmentId ?? `fulfillment-${index}`;
  };

  const openPrintSelection = (order: OrderRow) => {
    const fulfillments = getPrintableFulfillments(order);
    if (fulfillments.length === 0) {
      toast.warning("This order doesn't have any fulfillment to print.");
      return;
    }

    setPendingPrint({
      order,
      selectedKeys: fulfillments.map((fulfillment, index) => getFulfillmentPrintKey(fulfillment, index)),
    });
  };

  const closePrintSelection = () => {
    setPendingPrint(null);
  };

  const togglePrintFulfillment = (key: string) => {
    setPendingPrint((prev) => {
      if (!prev) return prev;
      const selected = prev.selectedKeys.includes(key);
      return {
        ...prev,
        selectedKeys: selected
          ? prev.selectedKeys.filter((item) => item !== key)
          : [...prev.selectedKeys, key],
      };
    });
  };

  const printSelectedFulfillments = () => {
    if (!pendingPrint) return;

    const selectedFulfillments = getPrintableFulfillments(pendingPrint.order).filter((fulfillment, index) => {
      return pendingPrint.selectedKeys.includes(getFulfillmentPrintKey(fulfillment, index));
    });

    if (selectedFulfillments.length === 0) {
      toast.error('Select at least one fulfillment to print.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast.error('Unable to open print window. Please allow popups for this site.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPackingSlipDocument(pendingPrint.order, selectedFulfillments));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 250);
    setPendingPrint(null);
  };

  const buildPackingSlipDocument = (order: OrderRow, fulfillments: FulfillmentConfirmation[]) => {
    const addressLines = getOrderAddressLines(order);
    const pages = fulfillments.map((fulfillment, fulfillmentIndex) => {
      const itemRows = fulfillment.lines.map((line) => {
        const item = order.items.find((orderItem) => orderItem.id === line.lineItemId);
        return `
          <tr>
            <td>${escapeHtml(item?.name ?? line.lineItemId)}</td>
            <td>${escapeHtml(item?.sku || '-')}</td>
            <td class="qty">${escapeHtml(line.quantity)}</td>
          </tr>
        `;
      }).join('');

      return `
        <section class="page">
          <header class="slip-header">
            <div>
              <div class="store">${escapeHtml(order.storeName)}</div>
            </div>
            <div class="muted">Fulfillment ${escapeHtml(fulfillmentIndex + 1)} of ${escapeHtml(fulfillments.length)}</div>
          </header>

          <div class="meta-grid">
            <div>
              <div class="label">Ship to</div>
              <div class="strong">${escapeHtml(order.customer)}</div>
              ${addressLines.map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
            </div>
            <div>
              <div class="label">Order</div>
              <div><span class="strong">#${escapeHtml(order.number)}</span></div>
              <div>Ordered: ${escapeHtml(new Date(order.orderedAt).toLocaleDateString())}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th class="qty">Qty</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <footer>
            <div>Thank you.</div>
            <div>${escapeHtml(order.storeName)} · ${escapeHtml(order.number)}</div>
          </footer>
        </section>
      `;
    }).join('');

    return `
      <!doctype html>
      <html>
        <head>
          <title></title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; }
            .page { width: 4in; min-height: 6in; padding: .18in; break-after: page; page-break-after: always; }
            .page:last-child { break-after: auto; page-break-after: auto; }
            .slip-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; gap: 10px; }
            .store { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
            .muted { color: #555; font-size: 9px; text-align: right; white-space: nowrap; }
            .strong { font-weight: 700; }
            .label { color: #555; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 3px; }
            .meta-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 10px; margin-bottom: 10px; font-size: 10px; line-height: 1.35; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { text-align: left; border-bottom: 2px solid #111; padding: 5px 4px; text-transform: uppercase; font-size: 8px; letter-spacing: .08em; }
            td { border-bottom: 1px solid #bbb; padding: 5px 4px; vertical-align: top; }
            .qty { text-align: right; width: .45in; }
            footer { display: flex; justify-content: space-between; margin-top: 10px; padding-top: 6px; border-top: 1px solid #111; color: #555; font-size: 9px; }
            @media print {
              @page { size: 4in 6in; margin: 0; }
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
              .page { width: 4in; min-height: 6in; padding: .18in; break-after: page; page-break-after: always; }
              .page:last-child { break-after: auto; page-break-after: auto; }
            }
          </style>
        </head>
        <body>${pages}</body>
      </html>
    `;
  };

  const handleStoreChange = (value: string) => {
    setStoreId(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePeriodChange = (value: (typeof PERIODS)[number]['value']) => {
    setPeriod(value);
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

  const syncActive = syncJob?.status === 'queued' || syncJob?.status === 'running';
  const syncMessage = syncActive
    ? syncJob.status === 'queued'
      ? 'Sync queued for last 30 days'
      : `Syncing last 30 days: ${syncJob.totalFetched} fetched`
    : lastSynced || 'Not synced yet';

  return (
    <main className="flex-1 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm flex-1 max-w-xs min-w-48">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <select
          value={storeId}
          onChange={(e) => handleStoreChange(e.target.value)}
          className="bg-white w-full max-w-36 border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm focus:outline-none cursor-pointer"
        >
          <option value="">All Stores</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>

        <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm text-sm">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              onClick={() => handlePeriodChange(item.value)}
              className={`px-3 py-2 transition-colors duration-150 cursor-pointer ${period === item.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleSync}
            disabled={syncing || loading || syncActive}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
          <span className="text-xs text-gray-400 whitespace-nowrap">{syncMessage}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order No.</th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordered At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-12 text-sm">Loading orders...</td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8} className="text-center text-red-500 py-12 text-sm">{error}</td>
                </tr>
              )}

              {!loading && !error && orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-gray-400 py-16 text-sm">No orders found.</td>
                </tr>
              )}

              {!loading && !error && orders.map((order, index) => {
                const statusKey = order.status.toLowerCase();
                const status = STATUS_MAP[statusKey] ?? STATUS_MAP.pending;
                const isExpanded = expandedId === order.id;
                const orderAddressLines = getOrderAddressLines(order);
                return (
                  <Fragment key={order.id}>
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-100"
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
                                openPrintSelection(order);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors duration-150 cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <span className="tt">Print Label</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="p-0">
                          <div className="bg-blue-50 border-b border-blue-100 p-5">
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
                              </div>

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
                                      const partialValue = partialValues[key] ?? fulfilledQty;
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
                                              onChange={() => toggleFull(order.id, itemIndex, item.qty, fulfilledQty)}
                                              className="rounded border-gray-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                          </td>
                                          <td className="py-1.5 text-center">
                                            <input
                                              type="number"
                                              min={fulfilledQty}
                                              max={item.qty}
                                              value={partialValue}
                                              disabled={isFull || remainingQty === 0}
                                              onChange={(e) => validPartial(order.id, itemIndex, fulfilledQty, item.qty, e.target.value)}
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
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Barcode &amp; Actions</h4>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    type="text"
                                    placeholder="Scan or type barcodes separated by spaces"
                                    value={bcInputs[order.id] ?? ''}
                                    onChange={(e) => setBcInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void saveBC(order);
                                      }
                                    }}
                                    className="flex-1 border border-blue-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                  <button
                                    onClick={() => saveBC(order)}
                                    disabled={barcodeSaving[order.id]}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {barcodeSaving[order.id] ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                                <div className="chip-list mb-3 min-h-[20px]">
                                  {(barcodeLists[order.id] ?? order.barcodes).map((barcode) => (
                                    <span key={barcode} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-mono">
                                      {barcode}
                                      <button onClick={() => removeBC(order.id, barcode)} className="hover:text-red-500 transition-colors cursor-pointer text-blue-400">×</button>
                                    </span>
                                  ))}
                                </div>
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
                                    onClick={() => openPrintSelection(order)}
                                    className="flex-1 border border-gray-300 bg-white text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                  >
                                    Print Label
                                  </button>
                                </div>
                                {fulMessages[order.id] && (
                                  <div className="mt-2 text-xs text-center text-green-600 font-medium">{fulMessages[order.id]}</div>
                                )}
                              </div>
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

      {pendingPrint && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-selection-title"
          onClick={closePrintSelection}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white shadow-xl border border-gray-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 id="print-selection-title" className="text-base font-semibold text-gray-900">
                Print packing slips
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose fulfillments for order {pendingPrint.order.number}.
              </p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{pendingPrint.order.customer}</p>
                  <p className="text-xs text-gray-500">{pendingPrint.order.storeName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const fulfillments = getPrintableFulfillments(pendingPrint.order);
                    const allKeys = fulfillments.map((fulfillment, index) => getFulfillmentPrintKey(fulfillment, index));
                    const allSelected = allKeys.every((key) => pendingPrint.selectedKeys.includes(key));
                    setPendingPrint((prev) => (prev ? { ...prev, selectedKeys: allSelected ? [] : allKeys } : prev));
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  {getPrintableFulfillments(pendingPrint.order).every((fulfillment, index) => (
                    pendingPrint.selectedKeys.includes(getFulfillmentPrintKey(fulfillment, index))
                  )) ? 'Clear all' : 'Select all'}
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {getPrintableFulfillments(pendingPrint.order).map((fulfillment, index) => {
                  const key = getFulfillmentPrintKey(fulfillment, index);
                  const selected = pendingPrint.selectedKeys.includes(key);
                  const itemCount = fulfillment.lines.reduce((sum, line) => sum + line.quantity, 0);
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer ${
                        selected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglePrintFulfillment(key)}
                        className="mt-1 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-800">Fulfillment {index + 1}</p>
                          <p className="text-xs text-gray-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {fulfillment.confirmedAt ? new Date(fulfillment.confirmedAt).toLocaleString() : 'Date unavailable'}
                        </p>
                        {fulfillment.trackingInfo?.number && (
                          <p className="text-xs text-gray-500 truncate">
                            {fulfillment.trackingInfo.company || 'Tracking'} · {fulfillment.trackingInfo.number}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={closePrintSelection}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={printSelectedFulfillments}
                disabled={pendingPrint.selectedKeys.length === 0}
                className="px-3 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Print selected
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingFulfillment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fulfillment-confirmation-title"
          onClick={closeFulfillmentConfirmation}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200"
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

              <div className="grid grid-cols-1 gap-3">
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

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
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
    </main>
  );
}
