import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, OrderRow, Pagination, StoreOption } from '../types';
import { getApiErrorMessage } from '../utils';

type UseOrdersDataArgs = {
  queryString: string;
  search: string;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  blockTestModeAction: () => boolean;
  setError: (msg: string) => void;
};

export function useOrdersData({ queryString, search, setPagination, blockTestModeAction, setError }: UseOrdersDataArgs) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [refreshingOrderIds, setRefreshingOrderIds] = useState<Record<string, boolean>>({});

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

  const bumpRefresh = () => setRefreshToken((prev) => prev + 1);

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

  const handleToggleExpandAll = () => {
    setExpandAll((prev) => {
      const next = !prev;
      setExpandedIds(next ? new Set(orders.map((o) => o.id)) : new Set());
      return next;
    });
  };

  return {
    orders,
    setOrders,
    stores,
    loading,
    expandedIds,
    setExpandedIds,
    expandAll,
    setExpandAll,
    refreshToken,
    bumpRefresh,
    refreshRotation,
    setRefreshRotation,
    refreshingOrderIds,
    refreshSingleOrder,
    handleToggleExpandAll,
  };
}
