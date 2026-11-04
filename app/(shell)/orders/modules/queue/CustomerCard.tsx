'use client';

import type { OrderRow } from '../types';
import { formatShippingMoney, getOrderAddressLines, getShippingDiscountCodes, getShippingLineFinalPrice } from '../utils';
import { CardShell } from './ItemsCard';

/** Customer, ship-to, shipping lines and the customer's note (Admin, Staff). */
export default function CustomerCard({ order }: { order: OrderRow }) {
  const address = getOrderAddressLines(order);
  return (
    <CardShell title="Customer & shipping" icon="user">
      <div className="flex flex-col gap-2 p-3 text-[11px]">
        <dl className="grid grid-cols-[58px_1fr] gap-x-2 gap-y-0.5">
          <dt className="text-[9.5px] font-bold uppercase text-orders-text-subtle">Customer</dt><dd className="font-semibold text-orders-text">{order.customer}</dd>
          {address.length > 0 && (<><dt className="text-[9.5px] font-bold uppercase text-orders-text-subtle">Ship to</dt><dd className="text-orders-text-body">{address.map((l) => <span key={l} className="block">{l}</span>)}</dd></>)}
        </dl>
        {order.shippingLines?.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg border border-orders-primary-ring bg-orders-primary-soft p-2">
            <span className="text-[9.5px] font-bold uppercase text-orders-text-subtle">Shipping</span>
            {order.shippingLines.map((line, i) => {
              const final = getShippingLineFinalPrice(line);
              const free = final <= 0;
              return (
                <div key={line.id || `${order.id}-ship-${i}`} className="rounded-md bg-orders-surface px-2 py-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <b className="text-orders-text">{line.title || line.code || 'Shipping'}</b>
                    <span className={`rounded-full px-1.5 text-[9.5px] font-bold ${free ? 'bg-orders-success-soft text-orders-success-ink' : 'bg-orders-canvas text-orders-text-muted'}`}>{free ? 'Free' : 'Paid'}</span>
                    {getShippingDiscountCodes(line).map((code) => <span key={code} className="rounded-full bg-orders-warning-soft px-1.5 font-mono text-[9.5px] font-bold text-orders-warning-ink">{code}</span>)}
                  </div>
                  <div className="mt-0.5 flex gap-3 text-[10.5px] text-orders-text-muted"><span>Price: {formatShippingMoney(line.price, line.currencyCode)}</span><span>Discounted: {formatShippingMoney(final, line.currencyCode)}</span></div>
                </div>
              );
            })}
          </div>
        )}
        <span className="text-[10.5px] text-orders-text-subtle">{order.storeName} · #{order.number}</span>
      </div>
    </CardShell>
  );
}
