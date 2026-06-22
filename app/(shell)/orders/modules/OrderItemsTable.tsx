'use client';

import type { OrderRow, OrderStockAdjustmentItem } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import { orderNameEntries } from './utils';
import OrderItemRow from './OrderItemRow';

type OrderItemsTableProps = {
  p: OrdersPageBundle;
  order: OrderRow;
  restockItems: OrderStockAdjustmentItem[];
  hasRestock: boolean;
  hasDecorationWork: boolean;
};

export default function OrderItemsTable({ p, order, restockItems, hasRestock, hasDecorationWork }: OrderItemsTableProps) {
  return (
    <div className="min-w-0">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Product Fulfilment</h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-blue-200">
            <th className="text-left py-1 text-gray-400 font-medium">
              {orderNameEntries(order).length > 0 ? (
                <label className="inline-flex items-center gap-1 cursor-pointer justify-start">
                  <input
                    type="checkbox"
                    checked={p.isOrderAllNamesChecked(order)}
                    onChange={() => p.toggleOrderNames(order)}
                    className="rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  Product
                </label>
              ) : (
                'Product'
              )}
            </th>
            <th className="text-left py-1 text-gray-400 font-medium">SKU</th>
            <th className="text-center py-1 text-gray-400 font-medium">Emb</th>
            <th className="text-center py-1 text-gray-400 font-medium">Print</th>
            <th className="text-center py-1 text-gray-400 font-medium">QTY</th>
            <th className="text-center py-1 text-gray-400 font-medium">Packed</th>
            {hasRestock && <th className="text-center py-1 text-gray-400 font-medium">Restock</th>}
            {hasDecorationWork && <th className="text-center py-1 text-gray-400 font-medium">Work</th>}
            <th className="text-start py-1 text-gray-400 font-medium">
              <label className="inline-flex items-center gap-1 cursor-pointer justify-start">
                <input
                  type="checkbox"
                  checked={order.items.length > 0 && order.items.every((item, itemIndex) => p.isLineFullChecked(order, item, itemIndex))}
                  onChange={() => p.toggleAllFull(order)}
                  className="rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                Full
              </label>
            </th>
            <th className="text-center py-1 text-gray-400 font-medium">Partial</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, itemIndex) => (
            <OrderItemRow
              key={`${order.id}-${itemIndex}`}
              p={p}
              order={order}
              item={item}
              itemIndex={itemIndex}
              restockItems={restockItems}
              hasRestock={hasRestock}
              hasDecorationWork={hasDecorationWork}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
