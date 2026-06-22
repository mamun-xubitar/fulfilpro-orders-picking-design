import { useState } from 'react';
import { toast } from 'react-toastify';
import type {
  ApiResponse,
  BackInStockItem,
  BackInStockRequest,
  OrderRow,
  StockModalState,
} from '../types';
import { createDefaultStockItem, getApiErrorMessage, getBackInStockEligibleItems } from '../utils';

type UseStockRequestsArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

export function useStockRequests({ setOrders, blockTestModeAction }: UseStockRequestsArgs) {
  const [stockModal, setStockModal] = useState<StockModalState | null>(null);

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

  return {
    stockModal,
    setStockModal,
    openStockModal,
    closeStockModal,
    updateStockItem,
    addStockItem,
    removeStockItem,
    submitStockRequest,
  };
}
