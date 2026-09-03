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

export default function PurchaseOrdersPanel({ po }: PurchaseOrdersPanelProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Clipboard className="h-4 w-4" />} title="Purchase orders" />
      <div className="p-4">
        {po.loadingList ? (
          <p className="py-6 text-center text-xs text-gray-400">Loading…</p>
        ) : po.purchaseOrders.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">No purchase orders yet for this product.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {po.purchaseOrders.map((row) => {
              const outstanding = row.items.some((item) => item.receivedQuantity < item.quantity);
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-gray-900">{formatPoNumber(row.number)}</span>
                      {row.referenceNumber && <span className="text-[11px] text-gray-400">· Ref {row.referenceNumber}</span>}
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[row.status]}`}>
                        {row.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {row.items.length} variant{row.items.length === 1 ? '' : 's'} · created {formatDate(row.createdAt)}
                      {row.deliveryDate ? ` · due ${formatDate(row.deliveryDate)}` : ''}
                    </p>
                  </div>
                  {outstanding && row.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => po.openReceive(row)}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
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
