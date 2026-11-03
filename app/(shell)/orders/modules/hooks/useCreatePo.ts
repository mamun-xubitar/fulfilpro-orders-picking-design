import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import type { ApiResponse, LineInventory, OrderItem, OrderRow } from '../types';
import { getApiErrorMessage } from '../utils';

/** Quantity of a line the hub cannot cover yet: still to fulfil, minus free stock and this order's own allocation. */
export function getLineShortfall(remaining: number, inventory: LineInventory) {
  return Math.max(0, remaining - (inventory.available + inventory.ownAllocated));
}

type UseCreatePoArgs = {
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

/** "+ PO" on an order line (Admin): opens Inventory's standard Create PO form for the line's variant, prefilled
 * with the quantity. When the product is not in the hub yet it is created under the line's store first. */
export function useCreatePo({ setOrders, blockTestModeAction }: UseCreatePoArgs) {
  const router = useRouter();
  const [creatingKey, setCreatingKey] = useState<string | null>(null);

  const goToCreatePo = (productId: string, variantId: string, quantity: number) => {
    const params = new URLSearchParams({ product: productId, createPo: variantId, qty: String(Math.max(1, quantity)) });
    router.push(`/inventory?${params.toString()}`);
  };

  const openCreatePo = async (order: OrderRow, item: OrderItem, quantity: number) => {
    if (item.inventory) {
      goToCreatePo(item.inventory.supplierProductId, item.inventory.variantId, quantity);
      return;
    }
    if (blockTestModeAction() || creatingKey) return;
    const key = `${order.id}:${item.id}`;
    setCreatingKey(key);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/line-items/${encodeURIComponent(item.id)}/hub-product`, { method: 'POST' });
      const json = (await res.json()) as ApiResponse<{ supplierProductId: string; variantId: string; created: boolean }>;
      if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to create the product in the hub'));
      const { supplierProductId, variantId, created } = json.data;
      const inventory: LineInventory = { supplierProductId, variantId, available: 0, onHand: 0, ownAllocated: 0, po: null };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, items: o.items.map((i) => (i.id === item.id ? { ...i, inventory } : i)) } : o)));
      if (created) toast.success(`"${item.name}" was added to the hub under ${order.storeName}.`);
      goToCreatePo(supplierProductId, variantId, quantity);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create the product in the hub.');
    } finally {
      setCreatingKey(null);
    }
  };

  return { openCreatePo, creatingKey };
}
