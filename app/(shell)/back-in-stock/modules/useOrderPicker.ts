'use client';

import { useEffect, useState } from 'react';
import type { OrderOption } from './requestStockTypes';

type ApiResponse<T> = { success: boolean; message: string; data: T; errors?: string[] };

export function useOrderPicker() {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<OrderOption[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/back-in-stock/order-options?q=${encodeURIComponent(query.trim())}`);
        const json = (await res.json()) as ApiResponse<OrderOption[]>;
        if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load orders');
        if (!cancelled) setOptions(json.data);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, open]);

  const toggleOrder = (option: OrderOption) => {
    setSelectedOrders((prev) => (
      prev.some((order) => order.id === option.id)
        ? prev.filter((order) => order.id !== option.id)
        : [...prev, option]
    ));
  };

  const removeOrder = (orderId: string) => {
    setSelectedOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  const reset = () => {
    setQuery('');
    setOptions([]);
    setOpen(false);
    setSelectedOrders([]);
  };

  return { query, setQuery, options, loading, open, setOpen, selectedOrders, toggleOrder, removeOrder, reset };
}
