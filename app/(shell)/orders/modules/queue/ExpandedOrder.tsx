'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import ItemsCard from './ItemsCard';
import FulfilmentCard from './FulfilmentCard';
import PackingCard from './PackingCard';
import CustomerCard from './CustomerCard';

/** The opened order: items on the left, role-shaped side cards stacked on the right. */
export default function ExpandedOrder({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  return (
    <div className="border-b border-orders-border bg-orders-canvas p-2">
      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,290px)]">
        <div className="flex min-w-0 flex-col gap-2">
          <ItemsCard p={p} order={order} />
          {caps.customer && order.note && (
            <section className="allow-copy rounded-xl border border-orders-border bg-orders-surface px-3 py-2 shadow-orders">
              <h4 className="text-[9.5px] font-bold uppercase tracking-wide text-orders-text-subtle">Customer note</h4>
              <p className="mt-0.5 whitespace-pre-wrap break-words text-[11.5px] text-orders-text-body">{order.note}</p>
            </section>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {caps.fulfilment && <FulfilmentCard p={p} order={order} />}
          {caps.pack && <PackingCard p={p} order={order} />}
          {caps.customer && <CustomerCard order={order} />}
        </div>
      </div>
    </div>
  );
}
