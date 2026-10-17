'use client';

import { Fragment, useEffect, useRef } from 'react';
import type { OrdersPageBundle } from './ordersPageContext';
import { STATUS_MAP } from './constants';
import { getFulfillmentInfo, getOrderAddressLines, isOrderFullyFulfilled } from './utils';
import OrderTableRow from './OrderTableRow';
import OrderExpandedRow from './OrderExpandedRow';
import OrderAttachmentsRow from './OrderAttachmentsRow';
import SortableColumnHeader from './SortableColumnHeader';

type OrdersTableProps = {
  p: OrdersPageBundle;
};

export default function OrdersTable({ p }: OrdersTableProps) {
  const { orders, loading, error, expandedIds, ordersColSpan, userIsAdmin, userIsDecorator, sort, dir, handleSortChange } = p;
  const selectAllRef = useRef<HTMLInputElement>(null);
  const anyLabelSelected = p.selectedLabelIds.size > 0;
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = anyLabelSelected && !p.allLabelsOnPageSelected;
    }
  }, [anyLabelSelected, p.allLabelsOnPageSelected]);
  return (
    <table className="min-w-[900px] w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          {!userIsDecorator && (
            <th className="px-4 py-3 w-10">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={p.allLabelsOnPageSelected}
                onChange={p.toggleSelectAllLabelsOnPage}
                disabled={loading || orders.length === 0}
                aria-label="Select all orders on this page"
                className="rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            </th>
          )}
          <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
          <SortableColumnHeader label="Order No." sortKey="number" sort={sort} dir={dir} onSortChange={handleSortChange} />
          <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Store</th>
          <SortableColumnHeader label="Customer" sortKey="customer" sort={sort} dir={dir} onSortChange={handleSortChange} />
          <SortableColumnHeader label="Ordered At" sortKey="orderedAt" sort={sort} dir={dir} onSortChange={handleSortChange} />
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
          const orderAddressLines = getOrderAddressLines(order);
          const fulfillmentInfo = getFulfillmentInfo(order);
          const isFullyFulfilled = isOrderFullyFulfilled(order);
          const hasBackInStockSignal = Boolean(order.backInStockStatus && !isFullyFulfilled);
          const restockItems = (order.stockAdjustment?.items ?? []).filter((i) => i.action === 'restore');
          const hasRestock = restockItems.length > 0;
          const hasDecorationWork = order.items.some((i) => (i.decoration?.works?.length ?? 0) > 0);
          const isEmbOrPrint = order.items.some((i) => i.isEmbroidery || i.isPrint);
          return (
            <Fragment key={order.id}>
              {index > 0 && (
                <tr><td colSpan={ordersColSpan} className="h-2 p-0 bg-white" /></tr>
              )}
              <OrderTableRow
                p={p}
                order={order}
                index={index}
                status={status}
                isExpanded={isExpanded}
                fulfillmentInfo={fulfillmentInfo}
                isFullyFulfilled={isFullyFulfilled}
                hasBackInStockSignal={hasBackInStockSignal}
              />
              {userIsAdmin && isEmbOrPrint && <OrderAttachmentsRow p={p} order={order} />}
              {isExpanded && (
                <OrderExpandedRow
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
