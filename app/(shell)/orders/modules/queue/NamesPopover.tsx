'use client';

import { useEffect, useRef, useState } from 'react';
import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { orderNameEntries } from '../utils';
import { Icon } from './icons';
import { MenuCheck, MenuHeading } from './FilterChip';

type Props = { p: OrdersPageBundle; order?: OrderRow; align?: 'left' | 'right'; up?: boolean; className: string };

/** "Export names (n) ▾": tick "Name:" chips on lines (or this order's names / every match of the filters), then export
 * the selection as CSV or print it. Used in an order's items bar and in the floating bulk bar. */
export default function NamesPopover({ p, order, align = 'right', up = false, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const count = p.nameCountLoading ? '…' : p.selectedNameCount;
  const none = p.selectedNameCount === 0;
  const own = order ? orderNameEntries(order).length : 0;
  const item = 'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-orders-text-body hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';
  return (
    <div ref={ref} className="relative">
      <button type="button" disabled={p.exportLoading} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} title="Export name attributes as CSV or print" className={className}>
        <Icon name={p.exportLoading ? 'refresh' : 'download'} className={`h-2.5 w-2.5 ${p.exportLoading ? 'animate-spin' : ''}`} />Export names ({order ? own : count})<Icon name="chevronDown" className="h-2.5 w-2.5" />
      </button>
      {open && (
        <div role="menu" className={`absolute z-40 w-64 rounded-xl border border-orders-border bg-orders-surface py-1 text-left shadow-orders-md ${up ? 'bottom-full mb-1' : 'top-full mt-1'} ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <MenuHeading>Select names</MenuHeading>
          {order && <MenuCheck checked={p.isOrderAllNamesChecked(order)} onClick={() => p.toggleOrderNames(order)}>Select the names on this order</MenuCheck>}
          <MenuCheck checked={p.selectAllFilters} onClick={p.handleToggleSelectAllFilters}>Select all name attributes matching filters</MenuCheck>
          <MenuCheck checked={p.isCurrentPageAllChecked} onClick={p.handleToggleCurrentPage}>Select all on this page</MenuCheck>
          <div className="my-1 border-t border-orders-divider" />
          <button type="button" role="menuitem" disabled={none} onClick={() => { setOpen(false); void p.runExport('csv'); }} className={item}><Icon name="download" className="h-3 w-3" />Export as CSV ({count})</button>
          <button type="button" role="menuitem" disabled={none} onClick={() => { setOpen(false); void p.runExport('print'); }} className={item}><Icon name="printer" className="h-3 w-3" />Print ({count})</button>
          {none && <p className="px-3 pb-1 pt-0.5 text-[10px] text-orders-text-subtle">Tick a “Name:” chip on a line, or select by filter.</p>}
        </div>
      )}
    </div>
  );
}
