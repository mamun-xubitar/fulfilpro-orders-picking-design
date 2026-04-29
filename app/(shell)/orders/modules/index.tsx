'use client';

import { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-toastify';

type OrderItem = { id: string; name: string; sku: string; qty: number };
type OrderRow = {
  id: string;
  number: string;
  customer: string;
  customerEmail: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string;
  orderedAt: string;
  storeId: string;
  storeName: string;
  storeDomain: string;
  items: OrderItem[];
  fulfillmentItems: {
    shopifyOrderId: string | null;
    confirmations: Array<{
      id?: string;
      confirmedAt?: string;
      lines: Array<{ lineItemId: string; quantity: number; full?: boolean }>;
    }>;
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

type FulfillmentLine = { lineItemId: string; quantity: number; full: boolean };

const PERIODS = [
  { label: 'All', value: 'all' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
] as const;

const STATUS_MAP: Record<string, { chip: string; label: string }> = {
  pending: { chip: 'bg-white border border-gray-300 text-gray-600', label: 'Pending' },
  partial: { chip: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Partially Shipped' },
  partially_fulfilled: { chip: 'bg-amber-100 text-amber-700 border border-amber-200', label: 'Partially Shipped' },
  fulfilled: { chip: 'bg-blue-600 text-white', label: 'Fully Shipped' },
  shipped: { chip: 'bg-blue-600 text-white', label: 'Fully Shipped' },
  unfulfilled: { chip: 'bg-white border border-gray-300 text-gray-600', label: 'Pending' },
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
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState('Not synced yet');
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [barcodeLists, setBarcodeLists] = useState<Record<string, string[]>>({});
  const [bcInputs, setBcInputs] = useState<Record<string, string>>({});
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [fullChecks, setFullChecks] = useState<Record<string, boolean>>({});
  const [partialValues, setPartialValues] = useState<Record<string, number>>({});
  const [fulMessages, setFulMessages] = useState<Record<string, string>>({});
  const [fulSaving, setFulSaving] = useState<Record<string, boolean>>({});
  const [pendingFulfillment, setPendingFulfillment] = useState<{
    order: OrderRow;
    lines: FulfillmentLine[];
    notifyCustomer: boolean;
  } | null>(null);
  const messageTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
        setLastSynced(`Last synced: ${new Date().toLocaleTimeString()}`);
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
    setSyncing(true);
    setError('');
    try {
      const res = await fetch('/api/orders/sync', { method: 'POST' });
      const json = (await res.json()) as ApiResponse<{
        totalStores: number;
        totalFetched: number;
        totalCreated: number;
        totalUpdated: number;
        failedStores: number;
      }>;

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to sync Shopify orders');
      }

      setLastSynced(
        `Synced ${json.data.totalFetched} orders (${json.data.totalCreated} new, ${json.data.totalUpdated} updated)`
      );
      setRefreshToken((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync Shopify orders');
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

  const addBC = (orderId: string) => {
    const value = (bcInputs[orderId] ?? '').trim();
    if (!value) return;
    setBarcodeLists((prev) => {
      const existing = prev[orderId] ?? [];
      if (existing.includes(value)) return prev;
      return { ...prev, [orderId]: [...existing, value] };
    });
    setBcInputs((prev) => ({ ...prev, [orderId]: '' }));
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
    const lines = getFulfillmentLines(order);

    if (lines.length === 0) {
      toast.error('Increase a quantity or check Full for an item with remaining stock.');
      return;
    }

    setPendingFulfillment({
      order,
      lines,
      notifyCustomer: true,
    });
  };

  const closeFulfillmentConfirmation = () => {
    if (!pendingFulfillment || fulSaving[pendingFulfillment.order.id]) return;
    setPendingFulfillment(null);
  };

  const confirmFul = async () => {
    if (!pendingFulfillment) return;

    const { order, lines, notifyCustomer } = pendingFulfillment;
    setFulSaving((prev) => ({ ...prev, [order.id]: true }));
    try {
      const res = await fetch(`/api/orders/${order.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, notifyCustomer }),
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm fulfillment.');
    } finally {
      setFulSaving((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const stepCp = (orderId: string, delta: number) => {
    setCopies((prev) => ({ ...prev, [orderId]: Math.max(1, (prev[orderId] ?? 1) + delta) }));
  };

  const printLabel = (orderNumber: string) => {
    alert(`Print label for ${orderNumber}`);
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
            disabled={syncing || loading}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5m0 0h-5m5 0v5M19 5A9 9 0 005 19m0 0h5m-5 0v-5" />
            </svg>
            {syncing ? 'Syncing...' : 'Sync'}
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
          <span className="text-xs text-gray-400 whitespace-nowrap">{lastSynced}</span>
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
                                printLabel(order.number);
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
                                {order.customerEmail && <p className="text-xs text-gray-500 mt-1">{order.customerEmail}</p>}
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
                                  const canConfirmFulfillment = getFulfillmentLines(order).length > 0;
                                  const isConfirmDisabled = fulSaving[order.id] || !canConfirmFulfillment;
                                  return (
                                    <>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Barcode &amp; Actions</h4>
                                <div className="flex gap-2 mb-2">
                                  <input
                                    type="text"
                                    placeholder="Scan or enter barcode"
                                    value={bcInputs[order.id] ?? order.items[0]?.sku ?? ''}
                                    onChange={(e) => setBcInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && addBC(order.id)}
                                    className="flex-1 border border-blue-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                  <button
                                    onClick={() => addBC(order.id)}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                                <div className="chip-list mb-3 min-h-[20px]">
                                  {(barcodeLists[order.id] || []).map((barcode) => (
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
                                  {fulSaving[order.id] ? 'Confirming...' : 'Confirm Fulfilment'}
                                </button>
                                    </>
                                  );
                                })()}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => printLabel(order.number)}
                                    className="flex-1 border border-gray-300 bg-white text-gray-600 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                                  >
                                    Print Label
                                  </button>
                                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white select-none">
                                    <button onClick={() => stepCp(order.id, -1)} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">−</button>
                                    <span className="px-2 text-xs font-medium text-gray-700">{copies[order.id] || 1}</span>
                                    <button onClick={() => stepCp(order.id, 1)} className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">+</button>
                                  </div>
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
