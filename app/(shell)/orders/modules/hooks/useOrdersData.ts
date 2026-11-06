import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, OrderRow, Pagination, PackingRecipient, StoreOption } from '../types';
import { getApiErrorMessage } from '../utils';

type UseOrdersDataArgs = {
  queryString: string;
  search: string;
  setPagination: React.Dispatch<React.SetStateAction<Pagination>>;
  blockTestModeAction: () => boolean;
  setError: (msg: string) => void;
};

export function useOrdersData({ queryString, search, setPagination, blockTestModeAction, setError }: UseOrdersDataArgs) {
  const [orders, setOrdersRaw] = useState<OrderRow[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [crossDecorationVisibility, setCrossDecorationVisibility] = useState(false);
  const [packingRecipients, setPackingRecipients] = useState<PackingRecipient[]>([]);
  const [packingDefaultRecipientIds, setPackingDefaultRecipientIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshRotation, setRefreshRotation] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [countsToken, setCountsToken] = useState(0);
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
          crossDecorationVisibility: boolean;
          packingRecipients?: PackingRecipient[];
          packingDefaultRecipientUserIds?: string[];
        }>;

        if (!res.ok || !json.success) {
          throw new Error(json.message || 'Failed to load orders');
        }
        if (cancelled) return;

        setOrdersRaw(json.data.orders);
        setStores(json.data.stores);
        setPagination(json.data.pagination);
        setCrossDecorationVisibility(json.data.crossDecorationVisibility);
        setPackingRecipients(json.data.packingRecipients ?? []);
        setPackingDefaultRecipientIds(json.data.packingDefaultRecipientUserIds ?? []);
        const firstId = json.data.orders[0]?.id;
        if (expandAll) {
          setExpandedIds(new Set(json.data.orders.map((o) => o.id)));
        } else {
          setExpandedIds(search && firstId ? new Set([firstId]) : new Set());
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        setOrdersRaw([]);
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

  // Mutation responses replace a whole order row but do not carry the hub stock / PO state of its lines
  // (it is only loaded with the list), so keep what the row already had.
  const bumpCounts = () => setCountsToken((prev) => prev + 1);

  // Every local row change can move an order between queue tabs, so it also refetches the tab counts.
  const setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>> = (action) => {
    bumpCounts();
    setOrdersRaw((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      const before = new Map(prev.map((o) => [o.id, o]));
      return next.map((order) => {
        const old = before.get(order.id);
        if (!old || old === order || !order.items.some((i) => i.inventory === undefined)) return order;
        const inventory = new Map(old.items.map((i) => [i.id, i.inventory]));
        return { ...order, items: order.items.map((i) => (i.inventory === undefined && inventory.has(i.id) ? { ...i, inventory: inventory.get(i.id) } : i)) };
      });
    });
  };

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

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return {
    orders,
    setOrders,
    stores,
    crossDecorationVisibility,
    packingRecipients,
    packingDefaultRecipientIds,
    loading,
    expandedIds,
    setExpandedIds,
    expandAll,
    setExpandAll,
    refreshToken,
    countsToken,
    bumpCounts,
    bumpRefresh,
    refreshRotation,
    setRefreshRotation,
    refreshingOrderIds,
    refreshSingleOrder,
    handleToggleExpandAll,
    toggleExpanded,
  };
}
