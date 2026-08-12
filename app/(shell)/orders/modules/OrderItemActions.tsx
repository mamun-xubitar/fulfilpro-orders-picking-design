'use client';

import type { OrderItem, OrderRow } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import { getFulfilledQty, isOrderFulfillmentLocked } from './utils';

type OrderItemActionsProps = {
  p: OrdersPageBundle;
  order: OrderRow;
  item: OrderItem;
};

export default function OrderItemActions({ p, order, item }: OrderItemActionsProps) {
  const locked = isOrderFulfillmentLocked(order);
  const lockedReason = 'Order is closed or canceled';
  const fulfilledQty = getFulfilledQty(order, item.id);

  const deleteDisabled = locked || fulfilledQty > 0;
  const deleteReason = locked
    ? lockedReason
    : fulfilledQty > 0
      ? 'Partially fulfilled — cancel the fulfillment first'
      : 'Remove line item';

  const editDisabled = locked || fulfilledQty >= item.qty;
  const editReason = locked ? lockedReason : fulfilledQty >= item.qty ? 'Fully fulfilled' : 'Edit line item';

  const addDisabled = locked;
  const addReason = locked ? lockedReason : 'Add line item after this row';

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => p.openEditLineItemModal(order, item)}
        disabled={editDisabled}
        title={editReason}
        className="inline-flex items-center rounded-full p-1 text-blue-500 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors duration-150"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => p.openDeleteLineItemModal(order, item)}
        disabled={deleteDisabled}
        title={deleteReason}
        className="inline-flex items-center rounded-full p-1 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors duration-150"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => p.openAddLineItemModal(order, item.id)}
        disabled={addDisabled}
        title={addReason}
        className="inline-flex items-center rounded-full p-1 text-emerald-500 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors duration-150"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
