'use client';

import type { OrderRow } from './types';

type OrderRowActionsProps = {
  order: OrderRow;
  isExpanded: boolean;
  isFullyFulfilled: boolean;
  userIsDecorator?: boolean;
  userIsAdmin: boolean;
  refreshingOrderIds: Record<string, boolean>;
  printingOrderId: string | null;
  toggleExpanded: (id: string) => void;
  refreshSingleOrder: (order: OrderRow) => void;
  printPackingSlipLabel: (order: OrderRow) => void;
  openMessageModal: (order: OrderRow) => void;
  openTrackingModal: (order: OrderRow) => void;
};

function trackingIconColor(order: OrderRow) {
  const t = order?.trackings?.[0];
  if (!t) return 'text-gray-400';
  if (t.registrationStatus === 'paused') return 'text-amber-500';
  if (t.status && t.status !== 'NotFound') return 'text-green-500';
  return 'text-blue-500';
}

function trackingTooltip(order: OrderRow) {
  const t = order?.trackings?.[0];
  if (!t) return 'Register Tracking';
  if (t.registrationStatus === 'paused') return 'Tracking Paused — Click to Restart';
  if (t.status && t.status !== 'NotFound') return `Tracking: ${t.status}`;
  return 'Tracking Registered';
}

export default function OrderRowActions({
  order,
  isExpanded,
  isFullyFulfilled,
  userIsDecorator = false,
  userIsAdmin,
  refreshingOrderIds,
  printingOrderId,
  toggleExpanded,
  refreshSingleOrder,
  printPackingSlipLabel,
  openMessageModal,
  openTrackingModal,
}: OrderRowActionsProps) {
  const hasTrackingNumber = (order.fulfillmentItems?.confirmations ?? []).some(
    (c) => c.trackingInfo?.number?.trim(),
  );
  return (
    <td className="px-4 py-3">
      <div className="flex items-center gap-1">
        <div className="tooltip">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(order.id);
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-150 cursor-pointer text-lg font-medium"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
          <span className="tt">View Details</span>
        </div>
        {!userIsDecorator && (
        <>
        <div className="tooltip">
          <button
            onClick={(e) => {
              e.stopPropagation();
              void refreshSingleOrder(order);
            }}
            disabled={refreshingOrderIds[order.id]}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className={`w-6 h-6 ${refreshingOrderIds[order.id] ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <span className="tt">Refresh Order</span>
        </div>
        <div className="tooltip">
          <button
            onClick={(e) => {
              e.stopPropagation();
              void printPackingSlipLabel(order);
            }}
            disabled={printingOrderId === order.id || isFullyFulfilled}
            className={`p-2 rounded-lg transition-colors duration-150 ${printingOrderId === order.id || isFullyFulfilled
              ? 'text-gray-300 cursor-not-allowed'
              : order.labelPrintedAt
                ? 'hover:bg-gray-100 text-green-600 hover:text-green-700 cursor-pointer'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700 cursor-pointer'
              }`}
          >
            {printingOrderId === order.id ? (
              <span className="block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" aria-label="Loading label" />
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            )}
          </button>
          <span className="tt">{order.labelPrintedAt ? 'Label Printed — Print Again' : 'Print Label'}</span>
        </div>
        </>
        )}
        <div className="tooltip">
          <button
            onClick={(e) => {
              e.stopPropagation();
              void openMessageModal(order);
            }}
            disabled={isFullyFulfilled}
            className={`relative p-2 rounded-lg transition-colors duration-150 ${isFullyFulfilled
              ? 'text-gray-300 cursor-not-allowed'
              : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600 cursor-pointer'
              }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.4-3.5A7.5 7.5 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {order.messageCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                {order.messageCount > 99 ? '99+' : order.messageCount}
              </span>
            )}
          </button>
          <span className="tt">Admin Messages</span>
        </div>
        {hasTrackingNumber && userIsAdmin && (
          <div className="tooltip">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openTrackingModal(order);
              }}
              className={`p-2 rounded-lg transition-colors duration-150 hover:bg-gray-100 cursor-pointer ${trackingIconColor(order)}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m0-5l-4-4-4 4M12 3v13" />
              </svg>
            </button>
            <span className="tt">{trackingTooltip(order)}</span>
          </div>
        )}
      </div>
    </td>
  );
}
