'use client';

import type { OrderRow } from './types';

type StockAdjustmentCellProps = {
  order: OrderRow;
  openStockAdjustmentModal: (order: OrderRow) => void;
};

export default function StockAdjustmentCell({ order, openStockAdjustmentModal }: StockAdjustmentCellProps) {
  return (
    <td className="px-4 py-3 text-center">
      {order.stockAdjustment ? (() => {
        const saClass = order.stockAdjustment.status === 'managed'
          ? 'bg-green-100 text-green-700'
          : order.stockAdjustment.status === 'partial'
            ? 'bg-amber-100 text-amber-800'
            : 'bg-red-100 text-red-700';
        const label = `${order.stockAdjustment.managedCount}/${order.stockAdjustment.totalCount}`;
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void openStockAdjustmentModal(order);
            }}
            className={`inline-flex min-w-14 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${saClass} hover:opacity-80 cursor-pointer`}
            aria-label={`Manage stock adjustment for order ${order.number}`}
          >
            {label}
          </button>
        );
      })() : (
        <span className="text-xs text-gray-300">-</span>
      )}
    </td>
  );
}
