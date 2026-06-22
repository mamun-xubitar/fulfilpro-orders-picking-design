'use client';

import type { OrderRow } from './types';
import { formatStockStatus, getDecorationStatusBadges, getStockStatusChip } from './utils';

type StatusInfo = { label: string; chip: string; row?: string };

type OrderStatusBadgesProps = {
  order: OrderRow;
  status: StatusInfo;
  hasBackInStockSignal: boolean;
};

export default function OrderStatusBadges({ order, status, hasBackInStockSignal }: OrderStatusBadgesProps) {
  return (
    <div className="flex flex-col flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.chip}`}>
        {status.label}
      </span>
      {order.packingStatus === 'packed' && (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700">
          Packed
        </span>
      )}
      {order.packingStatus === 'partially_packed' && (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-700">
          Partial Packed
        </span>
      )}
      {hasBackInStockSignal && order.backInStockStatus && (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStockStatusChip(order.backInStockStatus)}`}>
          {formatStockStatus(order.backInStockStatus)}
        </span>
      )}
      {getDecorationStatusBadges(order).map((badge) => (
        <span key={badge.label} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
          {badge.label}
          {badge.count ? (
            <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-white/70 px-1.5 text-[10px] font-bold">
              {badge.count}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
