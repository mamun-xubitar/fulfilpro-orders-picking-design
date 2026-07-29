'use client';

import { getItemRemaining } from './utils';
import type { usePurchaseOrders } from './hooks/usePurchaseOrders';
import type { PurchaseOrderItemRow } from './types';

type PoDetailItemsTableProps = {
  items: PurchaseOrderItemRow[];
  po: ReturnType<typeof usePurchaseOrders>;
};

export default function PoDetailItemsTable({ items, po }: PoDetailItemsTableProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2">Variant</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Quantity</th>
            <th className="px-3 py-2 text-end">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const remaining = getItemRemaining(item);
            return (
              <tr key={item.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-gray-900">{item.variantTitle}</td>
                <td className="px-3 py-2 text-gray-500">{item.sku ?? '-'}</td>
                <td className="px-3 py-2 text-gray-500">{item.receivedQuantity}/{item.quantity}</td>
                <td className="px-3 py-2 text-right">
                  {remaining === 0 ? (
                    <span className="text-xs text-gray-400">Received</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => po.receive.openForItem(item)}
                      disabled={!item.variantId}
                      title={!item.variantId ? 'This variant no longer exists in Shopify' : undefined}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Receive
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
