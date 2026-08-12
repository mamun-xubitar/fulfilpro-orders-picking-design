'use client';

import type { FulfillmentLine, OrderRow } from './types';
import { isOrderFulfillmentLocked } from './utils';

type OrderActionsColumnProps = {
  order: OrderRow;
  isFullyFulfilled: boolean;
  fulSaving: Record<string, boolean>;
  fulMessages: Record<string, string>;
  printingOrderId: string | null;
  fullSelectBtnRef: React.RefObject<HTMLButtonElement | null>;
  getFulfillmentLines: (order: OrderRow) => FulfillmentLine[];
  openFulfillmentConfirmation: (order: OrderRow) => void;
  printPackingSlipLabel: (order: OrderRow) => void;
  openMessageModal: (order: OrderRow) => void;
};

export default function OrderActionsColumn({
  order,
  isFullyFulfilled,
  fulSaving,
  fulMessages,
  printingOrderId,
  fullSelectBtnRef,
  getFulfillmentLines,
  openFulfillmentConfirmation,
  printPackingSlipLabel,
  openMessageModal,
}: OrderActionsColumnProps) {
  return (
    <div className="w-full lg:max-w-[280px]">
      {(() => {
        const lockedFulfillment = isOrderFulfillmentLocked(order);
        const canConfirmFulfillment = !lockedFulfillment && getFulfillmentLines(order).length > 0;
        const isConfirmDisabled = fulSaving[order.id] || !canConfirmFulfillment;
        return (
          <>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Actions</h4>
            <div className="flex items-center gap-2">
              <button
                ref={fullSelectBtnRef}
                onClick={() => openFulfillmentConfirmation(order)}
                disabled={isConfirmDisabled}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors duration-150 mb-2 ${isConfirmDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  }`}
              >
                {lockedFulfillment ? 'Fulfilment Locked' : fulSaving[order.id] ? 'Confirming...' : 'Confirm Fulfilment'}
              </button>
              <button
                onClick={() => { openFulfillmentConfirmation(order); printPackingSlipLabel(order) }}
                disabled={isConfirmDisabled}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors duration-150 mb-2 ${isConfirmDisabled
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-sky-600 text-white hover:bg-sky-700 cursor-pointer'
                  }`}
              >
                {lockedFulfillment ? 'Fulfilment Locked' : fulSaving[order.id] ? 'Confirming...' : 'Confirm & Print'}
              </button>
            </div>
          </>
        );
      })()}
      <div className="flex items-center gap-2">
        <button
          onClick={() => void printPackingSlipLabel(order)}
          disabled={printingOrderId === order.id || isFullyFulfilled}
          className={`flex-1 border py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${printingOrderId === order.id || isFullyFulfilled
            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer'
            }`}
        >
          {printingOrderId === order.id ? 'Loading label...' : 'Print Label'}
        </button>
        <button
          onClick={() => void openMessageModal(order)}
          disabled={isFullyFulfilled}
          className={`relative flex-1 border py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${isFullyFulfilled
            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 cursor-pointer'
            }`}
        >
          Message
          {order.messageCount > 0 && (
            <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
              {order.messageCount > 99 ? '99+' : order.messageCount}
            </span>
          )}
        </button>
      </div>
      {fulMessages[order.id] && (
        <div className="mt-2 text-xs text-center text-green-600 font-medium">{fulMessages[order.id]}</div>
      )}
      {order.note && (
        <div className="mt-3 rounded-md border border-blue-100 bg-white/70 px-3 py-2">
          <h4 className="text-[11px] font-semibold uppercase text-gray-400">Note</h4>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600">{order.note}</p>
        </div>
      )}
    </div>
  );
}
