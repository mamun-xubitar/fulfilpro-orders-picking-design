'use client';

import type { OrderRow } from '../types';
import { formatShippingMoney, getShippingDiscountCodes, getShippingLineFinalPrice } from '../utils';
import Badge from './Badge';

/** Shipping (prototype `shipBox`): title, Free / Paid, discount codes, price and discounted price. Sits under Packing & slip. */
export default function ShippingCard({ order }: { order: OrderRow }) {
  if (!order.shippingLines?.length) return null;
  return (
    <section className="flex min-w-0 flex-col gap-[5px] rounded-[9px] border border-orders-primary-ring bg-orders-primary-soft p-2">
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
            <div className="mt-[3px] flex flex-col text-[10.5px] tabular-nums text-orders-text-subtle"><span>Price: {formatShippingMoney(line.price, line.currencyCode)}</span><span>Discounted: {formatShippingMoney(final, line.currencyCode)}</span></div>
          </div>
        );
      })}
      <span className="text-[10.5px] text-orders-text-subtle">{order.storeName} · #{order.number}</span>
    </section>
  );
}
