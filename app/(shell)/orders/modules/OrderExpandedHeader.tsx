'use client';

import type { OrderRow } from './types';

type OrderExpandedHeaderProps = {
  order: OrderRow;
  fulfillmentViewOrderId: string | null;
  setFulfillmentViewOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  openStockModal: (order: OrderRow) => void;
};

export default function OrderExpandedHeader({
  order,
  fulfillmentViewOrderId,
  setFulfillmentViewOrderId,
  openStockModal,
}: OrderExpandedHeaderProps) {
  return (
    <div className="absolute top-3 right-4">
      {fulfillmentViewOrderId === order.id ? (
        <button
          onClick={() => setFulfillmentViewOrderId(null)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => void openStockModal(order)}
            className="relative flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-50 cursor-pointer"
          >
            Request Stock
            {order.stockRequestCount > 0 && (
              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-4 text-white">
                {order.stockRequestCount > 99 ? '99+' : order.stockRequestCount}
              </span>
            )}
          </button>
          {order.fulfillmentItems.confirmations.length > 0 && (
            <button
              onClick={() => setFulfillmentViewOrderId(order.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-white border border-blue-300 rounded-lg px-3 py-1.5 hover:bg-blue-50 cursor-pointer"
            >
              Fulfillments
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
