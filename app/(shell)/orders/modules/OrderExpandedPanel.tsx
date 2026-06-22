'use client';

import type { OrderRow, OrderStockAdjustmentItem } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import OrderExpandedHeader from './OrderExpandedHeader';
import OrderCustomerColumn from './OrderCustomerColumn';
import FulfillmentDetailsView from './FulfillmentDetailsView';
import OrderItemsTable from './OrderItemsTable';
import OrderActionsColumn from './OrderActionsColumn';

type OrderExpandedPanelProps = {
  p: OrdersPageBundle;
  order: OrderRow;
  orderAddressLines: string[];
  isFullyFulfilled: boolean;
  restockItems: OrderStockAdjustmentItem[];
  hasRestock: boolean;
  hasDecorationWork: boolean;
};

export default function OrderExpandedPanel({
  p,
  order,
  orderAddressLines,
  isFullyFulfilled,
  restockItems,
  hasRestock,
  hasDecorationWork,
}: OrderExpandedPanelProps) {
  return (
    <div className="relative bg-gray-100 border-b border-gray-200 p-5">
      <OrderExpandedHeader
        order={order}
        fulfillmentViewOrderId={p.fulfillmentViewOrderId}
        setFulfillmentViewOrderId={p.setFulfillmentViewOrderId}
        openStockModal={p.openStockModal}
      />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,400px)]">
        <OrderCustomerColumn order={order} orderAddressLines={orderAddressLines} />

        {p.fulfillmentViewOrderId === order.id ? (
          <FulfillmentDetailsView p={p} order={order} />
        ) : (
          <>
            <OrderItemsTable
              p={p}
              order={order}
              restockItems={restockItems}
              hasRestock={hasRestock}
              hasDecorationWork={hasDecorationWork}
            />
            <OrderActionsColumn
              order={order}
              isFullyFulfilled={isFullyFulfilled}
              fulSaving={p.fulSaving}
              fulMessages={p.fulMessages}
              printingOrderId={p.printingOrderId}
              fullSelectBtnRef={p.fullSelectBtnRef}
              getFulfillmentLines={p.getFulfillmentLines}
              openFulfillmentConfirmation={p.openFulfillmentConfirmation}
              printPackingSlipLabel={p.printPackingSlipLabel}
              openMessageModal={p.openMessageModal}
            />
          </>
        )}
      </div>
    </div>
  );
}
