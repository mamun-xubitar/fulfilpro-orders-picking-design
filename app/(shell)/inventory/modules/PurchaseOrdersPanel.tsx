'use client';

import { useState } from 'react';
import BuyingHistoryModal from './BuyingHistoryModal';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import { Clipboard } from './icons';
import { PanelHeading, panelBorderClass } from './MainImagePanel';
import { formatDate, formatMoney, formatPoNumber, poAveragePrice } from './utils';

export const STATUS_BADGES: Record<string, string> = {
  REQUESTED: 'bg-inventory-warning/10 text-inventory-warning-ink border-inventory-warning/30',
  CONFIRMED: 'bg-inventory-primary/10 text-inventory-primary border-inventory-primary/30',
  PARTIALLY_RECEIVED: 'bg-inventory-secondary/10 text-inventory-secondary border-inventory-secondary/30',
  RECEIVED: 'bg-inventory-success/10 text-inventory-success-hover border-inventory-success/30',
  CANCELLED: 'bg-inventory-danger/10 text-inventory-danger-hover border-inventory-danger/30',
  DRAFT: 'bg-inventory-surface-muted text-inventory-text-muted border-inventory-border',
};

type PurchaseOrdersPanelProps = { po: ReturnType<typeof usePurchaseOrder> };

/** Compact card for the bottom five-up row (design 6) — the same PO list and Receive action as
 * before, sized to match its four siblings (Stocktake / Adjustments / Import-export / Recent
 * activity) instead of the old full-width strip. */
export default function PurchaseOrdersPanel({ po }: PurchaseOrdersPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  return (
    <>
    <section className={`flex min-h-0 flex-col rounded-[10px] border ${panelBorderClass('po')} bg-inventory-surface shadow-inventory`}>
      <PanelHeading
        tone="po"
        icon={<Clipboard className="h-3 w-3" />}
        title="Purchase orders"
        action={
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="cursor-pointer text-[10px] font-bold leading-none text-inventory-sec-po transition-opacity duration-150 hover:opacity-70 hover:underline"
          >
            PO history
          </button>
        }
      />
      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-[6px]">
        {po.loadingList ? (
          <p className="py-3 text-center text-[10px] text-inventory-text-subtle">Loading…</p>
        ) : po.purchaseOrders.length === 0 ? (
          <p className="py-3 text-center text-[10px] text-inventory-text-subtle">No purchase orders yet.</p>
        ) : (
          <ul className="divide-y divide-inventory-divider">
            {po.purchaseOrders.map((row) => {
              const outstanding = row.items.some((item) => item.receivedQuantity < item.quantity);
              const avgPrice = poAveragePrice(row.items);
              return (
                <li key={row.id} className="flex items-center justify-between gap-[6px] py-[4px]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-[4px]">
                      <span className="text-[10px] font-bold leading-none text-inventory-text">{formatPoNumber(row.number)}</span>
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-[5px] py-[1px] text-[8px] font-bold uppercase leading-none tracking-[0.4px] ${STATUS_BADGES[row.status]}`}
                      >
                        {row.status.replace('_', ' ')}
                      </span>
                      {avgPrice !== null && <span className="text-[9px] font-semibold leading-none text-inventory-text-subtle">Avg ${formatMoney(avgPrice)}</span>}
                    </div>
                    <p className="truncate text-[9px] leading-tight text-inventory-text-subtle">
                      {row.items.length} variant{row.items.length === 1 ? '' : 's'} · {formatDate(row.createdAt)}
                    </p>
                  </div>
                  {outstanding && row.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => po.openReceive(row)}
                      className="h-[20px] shrink-0 rounded-[6px] bg-inventory-success px-[6px] text-[9px] font-bold leading-none text-white transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer"
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
    {historyOpen && <BuyingHistoryModal purchaseOrders={po.purchaseOrders} onClose={() => setHistoryOpen(false)} onReceive={po.openReceive} />}
    </>
  );
}
