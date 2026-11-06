import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ApiResponse, LineInventory, OrderItem, OrderRow } from '../types';
import { getApiErrorMessage } from '../utils';
import { usePurchaseOrder } from '@/app/(shell)/inventory/modules/hooks/usePurchaseOrder';
import type { ProductRecord, PurchaseOrderRecord } from '@/app/(shell)/inventory/modules/types';

/** Quantity of a line the hub cannot cover yet: still to fulfil, minus free stock and this order's own allocation. */
export function getLineShortfall(remaining: number, inventory: LineInventory) {
  return Math.max(0, remaining - (inventory.available + inventory.ownAllocated));
}

type UseCreatePoArgs = {
  /** Only Admin raises purchase orders, so only Admin loads the supplier list. */
  canCreatePo: boolean;
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
};

/** Moves a freshly created PO onto the loaded lines it covers, so their PO status shows without a reload. */
const withPo = (items: OrderItem[], po: PurchaseOrderRecord): OrderItem[] =>
  items.map((i) => {
    const line = i.inventory ? po.items.find((x) => x.variantId === i.inventory!.variantId) : undefined;
    if (!i.inventory || !line) return i;
    return { ...i, inventory: { ...i.inventory, po: { number: po.number, status: po.status, ordered: line.quantity, received: line.receivedQuantity, deliveryDate: po.deliveryDate } } };
  });

/** "+ PO" on an order line (Admin): opens Inventory's standard Create PO form right on the Orders page, prefilled
 * with the quantity. When the product is not in the hub yet it is created under the line's store first. */
export function useCreatePo({ canCreatePo, setOrders, blockTestModeAction }: UseCreatePoArgs) {
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const form = usePurchaseOrder({
    product: null,
    onSaved: () => {},
    loadSuppliers: canCreatePo,
    onCreated: (po) => setOrders((prev) => prev.map((o) => (o.items.some((i) => i.inventory?.supplierProductId === po.supplierProductId) ? { ...o, items: withPo(o.items, po) } : o))),
  });

  const openForm = async (productId: string, variantId: string, quantity: number) => {
    const res = await fetch(`/api/inventory/catalog?${new URLSearchParams({ mode: 'detail', focusId: productId })}`);
    const json = (await res.json()) as ApiResponse<{ products: ProductRecord[] }>;
    const product = json.success ? json.data.products[0] : undefined;
    if (!res.ok || !product || product.id !== productId) throw new Error(getApiErrorMessage(json, 'Failed to load the product'));
    form.openCreate([variantId], product, Math.max(1, quantity));
  };

  const openCreatePo = async (order: OrderRow, item: OrderItem, quantity: number) => {
    if (blockTestModeAction() || creatingKey) return;
    const key = `${order.id}:${item.id}`;
    setCreatingKey(key);
    try {
      let { supplierProductId, variantId } = item.inventory ?? { supplierProductId: '', variantId: '' };
      if (!item.inventory) {
        const res = await fetch(`/api/orders/${encodeURIComponent(order.id)}/line-items/${encodeURIComponent(item.id)}/hub-product`, { method: 'POST' });
        const json = (await res.json()) as ApiResponse<{ supplierProductId: string; variantId: string; created: boolean; inventory: LineInventory | null }>;
        if (!res.ok || !json.success) throw new Error(getApiErrorMessage(json, 'Failed to create the product in the hub'));
        ({ supplierProductId, variantId } = json.data);
        const inventory: LineInventory = json.data.inventory ?? { supplierProductId, variantId, available: 0, onHand: 0, ownAllocated: 0, po: null };
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, items: o.items.map((i) => (i.id === item.id ? { ...i, inventory } : i)) } : o)));
        if (json.data.created) toast.success(json.message);
      }
      await openForm(supplierProductId, variantId, quantity);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to open the purchase order.');
    } finally {
      setCreatingKey(null);
    }
  };

  return { openCreatePo, creatingKey, form };
}
