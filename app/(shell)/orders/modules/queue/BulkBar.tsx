'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { Icon } from './icons';
import NamesPopover from './NamesPopover';

/** Floating bar over the ticked rows, pinned to the table card (prototype `.bulk`): print picking slips (Admin, Picker),
 * labels and name export (Admin, Staff). */
export default function BulkBar({ p }: { p: OrdersPageBundle }) {
  const count = p.selectedLabelIds.size;
  if (count === 0) return null;
  const btn = 'inline-flex h-[26px] items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-[#374151] bg-[#1f2937] px-[9px] text-[11px] font-bold text-[#e5e7eb] hover:bg-[#374151] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';
  return (
    <div role="toolbar" aria-label="Bulk actions" className="absolute bottom-2.5 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#111827] py-[5px] pl-3 pr-1.5 text-[11px] text-[#e5e7eb] shadow-[0_12px_30px_rgb(0_0_0/.28),0_2px_6px_rgb(0_0_0/.2)]">
      <b className="tabular-nums text-white">{count} selected</b>
      <span className="mx-0.5 h-[18px] w-px bg-[#374151]" />
      {p.caps.slip && <button type="button" className={btn} onClick={() => p.openPrintModal(p.orders.filter((o) => p.selectedLabelIds.has(o.id)))}><Icon name="printer" className="h-3.5 w-3.5" />Print picking slips</button>}
      {p.caps.labels && (
        <button type="button" className={btn} disabled={p.bulkPrinting || p.printableLabelCount === 0} title={p.printableLabelCount === 0 ? 'All selected orders are fulfilled' : ''} onClick={() => void p.bulkPrintLabels()}>
          <Icon name={p.bulkPrinting ? 'refresh' : 'printer'} className={`h-3.5 w-3.5 ${p.bulkPrinting ? 'animate-spin' : ''}`} />Print labels
        </button>
      )}
      {p.caps.names && <NamesPopover p={p} up align="left" className={btn} />}
      <span className="mx-0.5 h-[18px] w-px bg-[#374151]" />
      <button type="button" aria-label="Clear selection" title="Clear selection" onClick={p.clearLabelSelection} className="flex h-6 w-6 items-center justify-center rounded-md text-[#9ca3af] hover:bg-[#374151] cursor-pointer"><Icon name="close" className="h-3.5 w-3.5" /></button>
    </div>
  );
}
