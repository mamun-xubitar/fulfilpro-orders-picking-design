'use client';

import { Fragment } from 'react';
import type { useDecorationPage } from './hooks/useDecorationPage';
import { STATUS_MAP } from '../../orders/modules/constants';
import { getFulfillmentInfo, getOrderAddressLines, isOrderFullyFulfilled } from '../../orders/modules/utils';
import DecorationTableRow from './DecorationTableRow';
import DecorationExpandedRow from './DecorationExpandedRow';
import SortableColumnHeader from '../../orders/modules/SortableColumnHeader';

type DecorationPageBundle = ReturnType<typeof useDecorationPage>;

type DecorationTableProps = {
  p: DecorationPageBundle;
};

export default function DecorationTable({ p }: DecorationTableProps) {
  const { orders, loading, error, expandedIds, ordersColSpan, userIsAdmin, sort, dir, handleSortChange } = p;
  return (
    <table className="min-w-[900px] w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
          <SortableColumnHeader label="Order No." sortKey="number" sort={sort} dir={dir} onSortChange={handleSortChange} />
          {userIsAdmin && (
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store</th>
          )}
          <SortableColumnHeader label="Customer" sortKey="customer" sort={sort} dir={dir} onSortChange={handleSortChange} />
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordered At</th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
          {userIsAdmin && (
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock Adjustment</th>
          )}
          <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fulfillment</th>
          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Note</th>
          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr>
            <td colSpan={ordersColSpan} className="text-center text-gray-400 py-12 text-sm">Loading orders...</td>
          </tr>
        )}

        {!loading && error && (
          <tr>
            <td colSpan={ordersColSpan} className="text-center text-red-500 py-12 text-sm">{error}</td>
          </tr>
        )}

        {!loading && !error && orders.length === 0 && (
          <tr>
            <td colSpan={ordersColSpan} className="text-center text-gray-400 py-16 text-sm">No orders found.</td>
          </tr>
        )}

        {!loading && !error && orders.map((order, index) => {
          const statusKey = order.status.toLowerCase();
          const status = STATUS_MAP[statusKey] ?? STATUS_MAP.pending;
          const isExpanded = expandedIds.has(order.id);
          const isPrevExpanded = index > 0 ? expandedIds.has(orders[index - 1].id) : false;
          const orderAddressLines = getOrderAddressLines(order);
          const fulfillmentInfo = getFulfillmentInfo(order);
          const isFullyFulfilled = isOrderFullyFulfilled(order);
          const hasBackInStockSignal = Boolean(order.backInStockStatus && !isFullyFulfilled);
          const restockItems = (order.stockAdjustment?.items ?? []).filter((i) => i.action === 'restore');
          const hasRestock = restockItems.length > 0;
          const hasDecorationWork = order.items.some((i) => (i.decoration?.works?.length ?? 0) > 0);
          return (
            <Fragment key={order.id}>
              {isExpanded && isPrevExpanded && (
                <tr><td colSpan={ordersColSpan} className="h-2 p-0 bg-white" /></tr>
              )}
              <DecorationTableRow
                p={p}
                order={order}
                index={index}
                status={status}
                isExpanded={isExpanded}
                fulfillmentInfo={fulfillmentInfo}
                isFullyFulfilled={isFullyFulfilled}
                hasBackInStockSignal={hasBackInStockSignal}
              />
              {isExpanded && (
                <DecorationExpandedRow
                  p={p}
                  order={order}
                  orderAddressLines={orderAddressLines}
                  isFullyFulfilled={isFullyFulfilled}
                  restockItems={restockItems}
                  hasRestock={hasRestock}
                  hasDecorationWork={hasDecorationWork}
                />
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
