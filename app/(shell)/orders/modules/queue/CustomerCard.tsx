'use client';

import type { OrderRow } from '../types';
import { formatShippingMoney, getOrderAddressLines, getShippingDiscountCodes, getShippingLineFinalPrice } from '../utils';
import { CardBody, CardShell } from './ItemsCard';
import Badge from './Badge';

/** Customer & shipping (prototype `custBox` + `shipBox`): customer, ship-to, then the Shipping block. */
export default function CustomerCard({ order }: { order: OrderRow }) {
  const address = getOrderAddressLines(order);
  return (
    <CardShell title="Customer & shipping" icon="user">
      <CardBody>
        <dl className="grid grid-cols-[58px_1fr] items-baseline gap-x-2 gap-y-[3px] text-[11px]">
          <dt className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Customer</dt>
          <dd className="min-w-0 font-bold text-orders-text">{order.customer}</dd>
          {address.length > 0 && (
            <><dt className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Ship to</dt>
            <dd className="min-w-0 text-orders-text-body">{address.map((l) => <span key={l} className="block">{l}</span>)}</dd></>
          )}
        </dl>
        {order.shippingLines?.length > 0 && (
          <div className="flex flex-col gap-[5px] rounded-lg border border-orders-primary-ring bg-orders-primary-soft px-2 py-1.5">
            <span className="text-[9.5px] font-bold uppercase tracking-[.35px] text-orders-text-subtle">Shipping</span>
            {order.shippingLines.map((line, i) => {
              const final = getShippingLineFinalPrice(line);
              const free = final <= 0;
              return (
                <div key={line.id || `${order.id}-ship-${i}`} className="rounded-[7px] border border-orders-primary-ring bg-orders-surface px-[7px] py-[5px] text-[11px]">
                  <div className="flex flex-wrap items-center gap-[5px]">
                    <b className="font-bold text-orders-text">{line.title || line.code || 'Shipping'}</b>
                    <Badge tone={free ? 'ok' : 'neutral'}>{free ? 'Free' : 'Paid'}</Badge>
                    {getShippingDiscountCodes(line).map((code) => <span key={code} title="Discount code" className="inline-flex h-4 items-center rounded-full border border-orders-warning-border bg-orders-warning-soft px-1.5 font-mono text-[9.5px] font-bold text-orders-warning-ink">{code}</span>)}
                  </div>
                  <div className="mt-[3px] flex flex-wrap gap-3 text-[10.5px] tabular-nums text-orders-text-subtle"><span>Price: {formatShippingMoney(line.price, line.currencyCode)}</span><span>Discounted: {formatShippingMoney(final, line.currencyCode)}</span></div>
                </div>
              );
            })}
            <span className="text-[10.5px] text-orders-text-subtle">{order.storeName} · #{order.number}</span>
          </div>
        )}
      </CardBody>
    </CardShell>
  );
}
