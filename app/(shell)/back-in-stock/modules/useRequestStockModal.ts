'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { isTestUserRole } from '@/lib/roles';
import { useOrderPicker } from './useOrderPicker';
import type { OrderOption } from './requestStockTypes';
import type { BackInStockItem, BackInStockRequest } from './useBackInStockData';

type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };

export type OrderStockSectionState = {
  order: OrderOption;
  requests: BackInStockRequest[];
  items: BackInStockItem[];
  loading: boolean;
  saving: boolean;
  error: string;
};

function createDefaultItem(order: OrderOption): BackInStockItem {
  const firstItem = order.eligibleItems[0];
  return {
    lineItemId: firstItem?.lineItemId ?? '',
    dueDate: '',
    supplierName: firstItem?.vendor ?? '',
    quantity: firstItem?.remainingQty ?? 1,
    item: firstItem?.name ?? '',
  };
}

export function useRequestStockModal(onSubmitted?: () => void) {
  const { data: session } = useSession();
  const picker = useOrderPicker();
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<Record<string, OrderStockSectionState>>({});
  const [message, setMessage] = useState('');

  const blockTestModeAction = () => {
    if (!isTestUserRole(session?.user?.role)) return false;
    toast.error('This action is not allowed in test mode.');
    return true;
  };

  const openModal = () => setOpen(true);

  const closeModal = () => {
    if (Object.values(sections).some((section) => section.saving)) return;
    setOpen(false);
    picker.reset();
    setSections({});
    setMessage('');
  };

  const loadExistingRequests = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/back-in-stock`);
      const json = (await res.json()) as ApiResponse<BackInStockRequest[]>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load back in stock requests');
      setSections((prev) => (
        prev[orderId] ? { ...prev, [orderId]: { ...prev[orderId], requests: json.data, loading: false } } : prev
      ));
    } catch (err) {
      setSections((prev) => (
        prev[orderId]
          ? { ...prev, [orderId]: { ...prev[orderId], loading: false, error: err instanceof Error ? err.message : 'Failed to load back in stock requests.' } }
          : prev
      ));
    }
  };

  const toggleOrder = (option: OrderOption) => {
    const isSelected = picker.selectedOrders.some((order) => order.id === option.id);
    picker.toggleOrder(option);

    if (isSelected) {
      setSections((prev) => {
        const next = { ...prev };
        delete next[option.id];
        return next;
      });
      return;
    }

    setSections((prev) => ({
      ...prev,
      [option.id]: {
        order: option,
        requests: [],
        items: [createDefaultItem(option)],
        loading: true,
        saving: false,
        error: '',
      },
    }));
    void loadExistingRequests(option.id);
  };

  const removeOrder = (orderId: string) => {
    picker.removeOrder(orderId);
    setSections((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  };

  const updateItem = (orderId: string, index: number, field: keyof BackInStockItem, value: string) => {
    setSections((prev) => {
      const section = prev[orderId];
      if (!section) return prev;
      const eligibleItems = section.order.eligibleItems;
      const items = section.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
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
      });
      return { ...prev, [orderId]: { ...section, items, error: '' } };
    });
  };

  const addItem = (orderId: string) => {
    setSections((prev) => {
      const section = prev[orderId];
      if (!section) return prev;
      const nextItem = section.order.eligibleItems.find((item) => (
        !section.items.some((selected) => selected.lineItemId === item.lineItemId)
      ));
      if (!nextItem) return { ...prev, [orderId]: { ...section, error: 'No more products available to add.' } };
      return {
        ...prev,
        [orderId]: {
          ...section,
          items: [
            ...section.items,
            { lineItemId: nextItem.lineItemId, dueDate: '', supplierName: nextItem.vendor, quantity: nextItem.remainingQty, item: nextItem.name },
          ],
          error: '',
        },
      };
    });
  };

  const removeItem = (orderId: string, index: number) => {
    setSections((prev) => {
      const section = prev[orderId];
      if (!section || section.items.length === 1) return prev;
      return { ...prev, [orderId]: { ...section, items: section.items.filter((_, itemIndex) => itemIndex !== index), error: '' } };
    });
  };

  const submitAll = async () => {
    if (blockTestModeAction()) return;

    const pendingIds = Object.values(sections)
      .filter((section) => !section.loading && section.requests.length === 0)
      .map((section) => section.order.id);
    if (pendingIds.length === 0) return;

    const validationErrors: Record<string, string> = {};
    for (const orderId of pendingIds) {
      const section = sections[orderId];
      if (section.order.eligibleItems.length === 0) {
        validationErrors[orderId] = 'No product to request back in stock.';
        continue;
      }
      const eligibleIds = new Set(section.order.eligibleItems.map((item) => item.lineItemId));
      const invalid = section.items.some((item) => (
        !eligibleIds.has(item.lineItemId)
        || !item.dueDate.trim()
        || !item.supplierName.trim()
        || !item.item.trim()
        || !Number.isFinite(Number(item.quantity))
        || Number(item.quantity) <= 0
      ));
      if (invalid) validationErrors[orderId] = 'Complete every product detail before submitting.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setSections((prev) => {
        const next = { ...prev };
        for (const [orderId, error] of Object.entries(validationErrors)) {
          next[orderId] = { ...next[orderId], error };
        }
        return next;
      });
      return;
    }

    setSections((prev) => {
      const next = { ...prev };
      pendingIds.forEach((orderId) => { next[orderId] = { ...next[orderId], saving: true, error: '' }; });
      return next;
    });

    const results = await Promise.allSettled(pendingIds.map(async (orderId) => {
      const section = sections[orderId];
      const items = section.items.map((item) => ({
        lineItemId: item.lineItemId.trim(),
        dueDate: item.dueDate.trim(),
        supplierName: item.supplierName.trim(),
        quantity: Number(item.quantity),
        item: item.item.trim(),
      }));
      const res = await fetch('/api/back-in-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, items, message: message.trim() }),
      });
      const json = (await res.json()) as ApiResponse<BackInStockRequest>;
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to submit back in stock request');
      return json.data;
    }));

    setSections((prev) => {
      const next = { ...prev };
      results.forEach((result, index) => {
        const orderId = pendingIds[index];
        if (!next[orderId]) return;
        next[orderId] = result.status === 'fulfilled'
          ? { ...next[orderId], requests: [result.value], saving: false, error: '' }
          : { ...next[orderId], saving: false, error: result.reason instanceof Error ? result.reason.message : 'Failed to submit back in stock request.' };
      });
      return next;
    });

    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    if (succeeded === pendingIds.length) {
      toast.success(`Submitted ${succeeded} back in stock request${succeeded === 1 ? '' : 's'}.`);
      setMessage('');
      onSubmitted?.();
    } else if (succeeded > 0) {
      toast.error(`${succeeded} of ${pendingIds.length} requests submitted. Check errors below.`);
      onSubmitted?.();
    } else {
      toast.error('Failed to submit back in stock requests.');
    }
  };

  const hasPendingSection = Object.values(sections).some((section) => !section.loading && section.requests.length === 0);
  const saving = Object.values(sections).some((section) => section.saving);

  return {
    open,
    openModal,
    closeModal,
    picker,
    toggleOrder,
    removeOrder,
    sections,
    message,
    setMessage,
    updateItem,
    addItem,
    removeItem,
    submitAll,
    hasPendingSection,
    saving,
  };
}
