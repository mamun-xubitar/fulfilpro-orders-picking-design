import { useRouter } from 'next/navigation';
import type { LineInventory, OrderItem, OrderRow } from '../types';

/** Quantity of a line the hub cannot cover yet: still to fulfil, minus free stock and this order's own allocation. */
export function getLineShortfall(remaining: number, inventory: LineInventory) {
  return Math.max(0, remaining - (inventory.available + inventory.ownAllocated));
}

/** "+ PO" on an order line (Admin): opens Inventory's standard Create PO form for the line's variant, prefilled
 * with the shortfall. */
export function useCreatePo() {
  const router = useRouter();

  const openCreatePo = (order: OrderRow, item: OrderItem, quantity: number) => {
    const inventory = item.inventory;
    if (!inventory) return;
    const params = new URLSearchParams({ product: inventory.supplierProductId, createPo: inventory.variantId, qty: String(Math.max(1, quantity)) });
    router.push(`/inventory?${params.toString()}`);
  };

  return { openCreatePo };
}
