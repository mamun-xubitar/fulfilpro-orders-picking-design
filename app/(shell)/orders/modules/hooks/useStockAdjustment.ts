import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, OrderRow, StockAdjustmentModalState } from '../types';
import { getApiErrorMessage } from '../utils';

type UseStockAdjustmentArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
  userIsAdmin: boolean;
};

export function useStockAdjustment({ setOrders, blockTestModeAction, userIsAdmin }: UseStockAdjustmentArgs) {
  const [stockAdjustmentModal, setStockAdjustmentModal] = useState<StockAdjustmentModalState | null>(null);

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

  return {
    stockAdjustmentModal,
    setStockAdjustmentModal,
    openStockAdjustmentModal,
    closeStockAdjustmentModal,
    toggleManagedStockAdjustmentItem,
    submitStockAdjustment,
  };
}
