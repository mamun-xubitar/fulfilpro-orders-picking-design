'use client';

import type { OrderRow } from '../../orders/modules/types';
import type { useDecorationPage } from './hooks/useDecorationPage';
import { getOrderDecorationRowTint } from '../../orders/modules/utils';
import OrderStatusBadges from '../../orders/modules/OrderStatusBadges';
import StockAdjustmentCell from '../../orders/modules/StockAdjustmentCell';
import OrderFulfillmentInfoCell from '../../orders/modules/OrderFulfillmentInfoCell';
import OrderRowActions from '../../orders/modules/OrderRowActions';

type DecorationPageBundle = ReturnType<typeof useDecorationPage>;

type StatusInfo = { label: string; chip: string; row?: string };

type FulfillmentInfo = { date: string; carrier: string; trackingNumber: string; trackingUrl: string };

type DecorationTableRowProps = {
  p: DecorationPageBundle;
  order: OrderRow;
  index: number;
  status: StatusInfo;
  isExpanded: boolean;
  fulfillmentInfo: FulfillmentInfo[];
  isFullyFulfilled: boolean;
  hasBackInStockSignal: boolean;
};

export default function DecorationTableRow({
  p,
  order,
  index,
  status,
  isExpanded,
  fulfillmentInfo,
  isFullyFulfilled,
  hasBackInStockSignal,
}: DecorationTableRowProps) {
  return (
    <tr
      className={`border-b border-gray-200 ${isExpanded ? 'border-l-4 border-l-blue-500' : ''} ${hasBackInStockSignal ? 'bg-amber-50 hover:bg-amber-100' : status.row ?? getOrderDecorationRowTint(order) ?? 'hover:bg-gray-50'} transition-colors duration-100`}
    >
      <td className="hidden sm:table-cell px-4 py-3 text-gray-400 text-xs">
        {(p.pagination.page - 1) * p.pagination.pageSize + index + 1}
      </td>
      <td className="px-4 py-3 font-mono text-sm font-medium text-gray-900">{order.number}</td>
      {p.userIsAdmin && (
        <td className="px-4 py-3 text-sm text-gray-600">{order.storeName}</td>
      )}
      <td className="px-4 py-3 text-sm text-gray-700">{order.customer}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {new Date(order.orderedAt).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <OrderStatusBadges order={order} status={status} hasBackInStockSignal={hasBackInStockSignal} />
      </td>
      {p.userIsAdmin && (
        <StockAdjustmentCell order={order} openStockAdjustmentModal={p.openStockAdjustmentModal} />
      )}
      <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-600">
        {order.itemsCount} item{order.itemsCount !== 1 ? 's' : ''}
      </td>
      <OrderFulfillmentInfoCell fulfillmentInfo={fulfillmentInfo} userIsDecorator={true} />
      <td className="px-4 py-3 text-center">
        <div className="tooltip inline-flex">
          <button
            onClick={(e) => {
              e.stopPropagation();
              void p.openNoteModal(order);
            }}
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 cursor-pointer"
            aria-label={`Order ${order.number} notes`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v14l-4-3H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8M8 12h5" />
            </svg>
            {order.noteCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                {order.noteCount > 99 ? '99+' : order.noteCount}
              </span>
            )}
          </button>
          <span className="tt">Order Notes</span>
        </div>
      </td>
      <OrderRowActions
        order={order}
        isExpanded={isExpanded}
        isFullyFulfilled={isFullyFulfilled}
        userIsDecorator={true}
        userIsAdmin={p.userIsAdmin}
        refreshingOrderIds={p.refreshingOrderIds}
        printingOrderId={p.printingOrderId}
        setExpandedIds={p.setExpandedIds}
        refreshSingleOrder={p.refreshSingleOrder}
        printPackingSlipLabel={p.printPackingSlipLabel}
        openMessageModal={p.openMessageModal}
        openTrackingModal={p.openTrackingModal}
      />
    </tr>
  );
}
