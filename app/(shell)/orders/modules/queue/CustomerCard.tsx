'use client';

import type { OrderRow } from '../types';
import { getOrderAddressLines } from '../utils';
import { CardBody, CardShell } from './ItemsCard';

/** Customer (prototype `custBox`): customer and ship-to. The Shipping block is its own card (`ShippingCard`). */
export default function CustomerCard({ order }: { order: OrderRow }) {
  const address = getOrderAddressLines(order);
  return (
    <CardShell title="Customer" icon="user">
      <CardBody>
        <dl className="grid grid-cols-[58px_1fr] items-baseline gap-x-2 gap-y-[3px] text-[11px]">
          <dt className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Customer</dt>
          <dd className="min-w-0 font-bold text-orders-text">{order.customer}</dd>
          {address.length > 0 && (
            <><dt className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Ship to</dt>
            <dd className="min-w-0 text-orders-text-body">{address.map((l) => <span key={l} className="block">{l}</span>)}</dd></>
          )}
        </dl>
      </CardBody>
    </CardShell>
  );
}
