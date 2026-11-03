'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { Icon } from './icons';

/** Floating bar for the ticked rows: print picking slips (Admin, Picker) and labels (Admin, Staff). */
export default function BulkBar({ p }: { p: OrdersPageBundle }) {
  const count = p.selectedLabelIds.size;
  if (count === 0) return null;
  const btn = 'flex h-7 items-center gap-1.5 rounded-lg border border-white/20 px-2.5 text-[11px] font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';
  return (
    <div role="toolbar" aria-label="Bulk actions" className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-orders-text px-3 py-2 text-[11px] text-white shadow-orders-md">
      <b className="pr-1 tabular-nums">{count} selected</b>
      {p.caps.slip && (
        <button type="button" className={btn} onClick={() => p.openPrintModal(p.orders.filter((o) => p.selectedLabelIds.has(o.id)))}><Icon name="printer" className="h-3.5 w-3.5" />Print picking slips</button>
      )}
      {p.caps.labels && (
        <button type="button" className={btn} disabled={p.bulkPrinting || p.printableLabelCount === 0} title={p.printableLabelCount === 0 ? 'All selected orders are fulfilled' : ''} onClick={() => void p.bulkPrintLabels()}>
          <Icon name={p.bulkPrinting ? 'refresh' : 'tag'} className={`h-3.5 w-3.5 ${p.bulkPrinting ? 'animate-spin' : ''}`} />Print labels ({p.printableLabelCount})
        </button>
      )}
      <button type="button" aria-label="Clear selection" title="Clear selection" onClick={p.clearLabelSelection} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer"><Icon name="close" className="h-3.5 w-3.5" /></button>
    </div>
  );
}
