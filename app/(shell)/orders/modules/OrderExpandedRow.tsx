'use client';

import type { OrderRow, OrderStockAdjustmentItem } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import DecoratorFulfillmentPanel from './DecoratorFulfillmentPanel';
import OrderExpandedPanel from './OrderExpandedPanel';

type OrderExpandedRowProps = {
  p: OrdersPageBundle;
  order: OrderRow;
  orderAddressLines: string[];
  isFullyFulfilled: boolean;
  restockItems: OrderStockAdjustmentItem[];
  hasRestock: boolean;
  hasDecorationWork: boolean;
};

export default function OrderExpandedRow({
  p,
  order,
  orderAddressLines,
  isFullyFulfilled,
  restockItems,
  hasRestock,
  hasDecorationWork,
}: OrderExpandedRowProps) {
  return (
    <tr className="border-l-4 border-l-blue-500">
      <td colSpan={p.ordersColSpan} className="p-0">
        {p.userIsDecorator ? (
          <DecoratorFulfillmentPanel
            order={order}
            decoratorCategory={p.decoratorCategory}
            currentUserId={p.session?.user?.id ?? ''}
            requestingAccessKey={p.requestingAccessKey}
            onMarkDone={p.openWorkModal}
            onRequestAccess={p.requestEditAccess}
            onDeleteWork={p.deleteWorkRecord}
          />
        ) : (
          <OrderExpandedPanel
            p={p}
            order={order}
            orderAddressLines={orderAddressLines}
            isFullyFulfilled={isFullyFulfilled}
            restockItems={restockItems}
            hasRestock={hasRestock}
            hasDecorationWork={hasDecorationWork}
          />
        )}
      </td>
    </tr>
  );
}
