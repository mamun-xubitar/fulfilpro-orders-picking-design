'use client';

import { PanelHeading } from './MainImagePanel';
import { formatDate, formatPoNumber } from './utils';
import { Clipboard } from './icons';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';

export const STATUS_BADGES: Record<string, string> = {
  REQUESTED: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PARTIALLY_RECEIVED: 'bg-blue-50 text-blue-700 border-blue-200',
  RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  DRAFT: 'bg-gray-100 text-gray-600 border-gray-200',
};

type PurchaseOrdersPanelProps = { po: ReturnType<typeof usePurchaseOrder> };

/** Compact card for the bottom five-up row (design 6) — the same PO list and Receive action as
 * before, sized to match its four siblings (Stocktake / Adjustments / Import-export / Recent
 * activity) instead of the old full-width strip. */
export default function PurchaseOrdersPanel({ po }: PurchaseOrdersPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded-[10px] border border-gray-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
      <PanelHeading icon={<Clipboard className="h-3 w-3" />} title="Purchase orders" />
      <div className="min-h-0 flex-1 overflow-y-auto p-[6px]">
        {po.loadingList ? (
          <p className="py-3 text-center text-[10px] text-gray-400">Loading…</p>
        ) : po.purchaseOrders.length === 0 ? (
          <p className="py-3 text-center text-[10px] text-gray-400">No purchase orders yet.</p>
        ) : (
          <ul className="space-y-[4px]">
            {po.purchaseOrders.map((row) => {
              const outstanding = row.items.some((item) => item.receivedQuantity < item.quantity);
              return (
                <li key={row.id} className="flex items-center justify-between gap-[6px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-[4px]">
                      <span className="text-[10px] font-bold leading-none text-gray-900">{formatPoNumber(row.number)}</span>
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-[5px] py-[1px] text-[8px] font-bold uppercase leading-none tracking-[0.4px] ${STATUS_BADGES[row.status]}`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="truncate text-[9px] leading-tight text-gray-400">
                      {row.items.length} variant{row.items.length === 1 ? '' : 's'} · {formatDate(row.createdAt)}
                    </p>
                  </div>
                  {outstanding && row.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => po.openReceive(row)}
                      className="h-[20px] shrink-0 rounded-[6px] bg-emerald-600 px-[6px] text-[9px] font-bold leading-none text-white transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
                    >
                      Receive
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
