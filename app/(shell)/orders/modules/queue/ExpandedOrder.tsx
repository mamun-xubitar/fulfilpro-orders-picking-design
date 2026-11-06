'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import ItemsCard from './ItemsCard';
import FulfilmentCard from './FulfilmentCard';
import PackingCard from './PackingCard';
import CustomerCard from './CustomerCard';

/** The opened order (prototype `expandedA2`): items + note | fulfilment + packing (246px) | customer (224px). */
export default function ExpandedOrder({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  const showNote = caps.customer && Boolean(order.note);
  const showMiddle = caps.fulfilment || caps.pack;
  return (
    <div className="flex items-start gap-2 border-b border-orders-primary-ring bg-orders-surface-muted px-2.5 pb-2.5 pt-2">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <ItemsCard p={p} order={order} />
        {showNote && (
          <section className="rounded-[9px] border border-orders-border bg-orders-surface">
            <div className="flex flex-col gap-1.5 p-2">
              <div className="allow-copy rounded-md border border-orders-primary-soft bg-white/70 px-[9px] py-1.5">
                <h4 className="text-[9.5px] font-bold uppercase text-orders-text-subtle">Customer note</h4>
                <p className="mt-[3px] whitespace-pre-wrap text-[11px] leading-[1.4] text-orders-text-muted">{order.note}</p>
              </div>
            </div>
          </section>
        )}
      </div>
      {showMiddle && (
        <div className="flex w-[246px] min-w-0 flex-none flex-col gap-2">
          {caps.fulfilment && <FulfilmentCard p={p} order={order} />}
          {caps.pack && <PackingCard p={p} order={order} />}
        </div>
      )}
      {caps.customer && (
        <div className="flex w-[224px] min-w-0 flex-none flex-col gap-2">
          <CustomerCard order={order} />
        </div>
      )}
    </div>
  );
}
