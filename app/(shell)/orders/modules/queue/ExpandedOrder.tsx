'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import ItemsCard from './ItemsCard';
import FulfilmentCard from './FulfilmentCard';
import PackingCard from './PackingCard';
import CustomerCard from './CustomerCard';

/** The opened order: items on the left, role-shaped side cards on the right. */
export default function ExpandedOrder({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  const side = [caps.pack, caps.fulfilment, caps.customer].filter(Boolean).length;
  const gridCols = side === 0 ? 'lg:grid-cols-1' : side === 1 ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)_minmax(0,280px)]';
  return (
    <div className="border-b border-orders-border border-l-4 border-l-orders-primary bg-orders-canvas p-2">
      <div className={`grid grid-cols-1 items-start gap-2 ${gridCols}`}>
        <ItemsCard p={p} order={order} />
        {side > 0 && (
          <div className="flex min-w-0 flex-col gap-2">
            {caps.fulfilment && <FulfilmentCard p={p} order={order} />}
            {caps.pack && <PackingCard p={p} order={order} />}
          </div>
        )}
        {caps.customer && <CustomerCard order={order} />}
      </div>
    </div>
  );
}
