'use client';

import type { OrderRow } from './types';
import { formatShippingMoney, getShippingDiscountCodes, getShippingLineFinalPrice } from './utils';

type OrderCustomerColumnProps = {
  order: OrderRow;
  orderAddressLines: string[];
};

export default function OrderCustomerColumn({ order, orderAddressLines }: OrderCustomerColumnProps) {
  return (
    <div className="w-full lg:max-w-[300px]">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer &amp; Order</h4>
      <p className="text-sm font-semibold text-gray-800">{order.customer}</p>
      {orderAddressLines.length > 0 && (
        <div className="text-xs text-gray-500 mt-1">
          {orderAddressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      {order.shippingLines?.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <h5 className="text-[11px] font-semibold uppercase text-gray-400">Shipping</h5>
          {order.shippingLines.map((line, lineIndex) => {
            const finalPrice = getShippingLineFinalPrice(line);
            const isFree = finalPrice <= 0;
            const discountCodes = getShippingDiscountCodes(line);
            return (
              <div key={line.id || `${order.id}-shipping-${lineIndex}`} className="rounded-md border border-blue-100 bg-white/70 px-2.5 py-2 text-xs text-gray-600">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-gray-800">{line.title || line.code || 'Shipping'}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isFree ? 'Free' : 'Paid'}
                  </span>
                  {discountCodes.map((code) => (
                    <span key={code} className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700">
                      {code}
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  <span>Price: {formatShippingMoney(line.price, line.currencyCode)}</span>
                  <span>Discounted: {formatShippingMoney(finalPrice, line.currencyCode)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">{order.storeName} · {order.number}</p>
    </div>
  );
}
