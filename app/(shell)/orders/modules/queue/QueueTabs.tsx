'use client';

import { useEffect, useRef, useState } from 'react';
import type { OrdersPageBundle } from '../ordersPageContext';
import type { OrderQueueKey } from '../hooks/useOrdersFilters';
import { Icon } from './icons';
import { MenuOption } from './FilterChip';

type Tab = { key: OrderQueueKey; label: string };

/** Queue tabs are role-shaped: Staff cannot see slips, Pickers only work the open pool. */
function tabsFor(role: 'admin' | 'staff' | 'picker'): Tab[] {
  if (role === 'picker') return [{ key: 'open', label: 'Open' }, { key: 'slip_not_printed', label: 'Slip not printed' }, { key: 'slip_printed', label: 'Slip printed' }, { key: 'packed', label: 'Packed' }];
  if (role === 'staff') return [{ key: 'all', label: 'All' }, { key: 'not_packed', label: 'Not packed' }, { key: 'partial', label: 'Partial' }, { key: 'packed', label: 'Packed' }, { key: 'shipped', label: 'Shipped' }, { key: 'issues', label: 'Issues' }];
  return [{ key: 'all', label: 'All' }, { key: 'slip_not_printed', label: 'Slip not printed' }, { key: 'slip_printed', label: 'Slip printed' }, { key: 'packed', label: 'Packed' }, { key: 'shipped', label: 'Shipped' }, { key: 'issues', label: 'Issues' }];
}

type SortField = 'orderedAt' | 'number' | 'customer';

const SORT_FIELDS: ReadonlyArray<{ label: string; value: SortField }> = [
  { label: 'Date placed', value: 'orderedAt' },
  { label: 'Order no.', value: 'number' },
  { label: 'Customer', value: 'customer' },
];

const GHOST = 'inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-orders-border-strong bg-orders-surface px-[9px] text-[11px] font-bold text-orders-text-body hover:bg-orders-surface-muted cursor-pointer';

/** "Date placed ↓" as a chip menu: sortable fields, a separator, then Ascending / Descending. Every pick applies at once. */
function SortChip({ p }: { p: OrdersPageBundle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const field = p.sort ?? 'orderedAt';
  const current = SORT_FIELDS.find((f) => f.value === field) ?? SORT_FIELDS[0];
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex h-7 items-center gap-[5px] whitespace-nowrap rounded-lg border border-orders-border-strong bg-orders-surface pl-2 pr-[7px] text-[11px] hover:bg-orders-surface-muted cursor-pointer">
        <b className="font-bold text-orders-text">{current.label}</b>
        <Icon name={p.dir === 'asc' ? 'chevronUp' : 'chevronDown'} className="h-[11px] w-[11px] text-orders-primary" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-40 rounded-xl border border-orders-border bg-orders-surface py-1 shadow-orders-md">
          {SORT_FIELDS.map((f) => <MenuOption key={f.value} selected={f.value === field} onClick={() => p.setSortBy(f.value, p.dir)}>{f.label}</MenuOption>)}
          <div role="separator" className="my-1 border-t border-orders-divider" />
          <MenuOption selected={p.dir === 'asc'} onClick={() => p.setSortBy(field, 'asc')}>Ascending</MenuOption>
          <MenuOption selected={p.dir === 'desc'} onClick={() => p.setSortBy(field, 'desc')}>Descending</MenuOption>
        </div>
      )}
    </div>
  );
}

export default function QueueTabs({ p }: { p: OrdersPageBundle }) {
  const tabs = tabsFor(p.caps.role);
  return (
    <div className="flex items-center justify-between gap-2">
      <div role="tablist" aria-label="Order queues" className="flex flex-none gap-0.5 rounded-[10px] border border-orders-border bg-orders-divider p-0.5">
        {tabs.map((t) => {
          const on = p.queue === t.key;
          return (
            <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => p.setQueue(t.key)} className={`flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[11.5px] font-bold cursor-pointer ${on ? 'bg-orders-surface text-orders-text shadow-orders' : 'text-orders-text-muted hover:text-orders-text'}`}>
              {t.label}
              <span className={`min-w-[18px] rounded-full px-[5px] py-px text-center text-[10px] tabular-nums ${on ? 'bg-orders-primary text-white' : 'bg-orders-border text-orders-text-body'}`}>{p.queueCounts[t.key]}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10.5px] text-orders-text-subtle">Sort</span>
        <SortChip p={p} />
        {p.canCreateInvoice && <button type="button" onClick={p.openNewInvoice} className={GHOST}><Icon name="plus" className="h-3.5 w-3.5" />New invoice</button>}
        <button type="button" onClick={p.handleToggleExpandAll} aria-pressed={p.expandAll} className={GHOST}><Icon name="expand" className="h-3.5 w-3.5" />{p.expandAll ? 'Collapse all' : 'Expand all'}</button>
      </div>
    </div>
  );
}
