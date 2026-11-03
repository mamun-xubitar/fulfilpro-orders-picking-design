'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import type { OrderQueueKey } from '../hooks/useOrdersFilters';
import { Icon } from './icons';

type Tab = { key: OrderQueueKey; label: string };

/** Queue tabs are role-shaped: Staff cannot see slips, Pickers only work the open pool. */
function tabsFor(role: 'admin' | 'staff' | 'picker'): Tab[] {
  if (role === 'picker') return [{ key: 'open', label: 'Open' }, { key: 'slip_not_printed', label: 'Slip not printed' }, { key: 'slip_printed', label: 'Slip printed' }, { key: 'packed', label: 'Packed' }];
  if (role === 'staff') return [{ key: 'all', label: 'All' }, { key: 'not_packed', label: 'Not packed' }, { key: 'partial', label: 'Partial' }, { key: 'packed', label: 'Packed' }, { key: 'shipped', label: 'Shipped' }, { key: 'issues', label: 'Issues' }];
  return [{ key: 'all', label: 'All' }, { key: 'slip_not_printed', label: 'Slip not printed' }, { key: 'slip_printed', label: 'Slip printed' }, { key: 'packed', label: 'Packed' }, { key: 'shipped', label: 'Shipped' }, { key: 'issues', label: 'Issues' }];
}

const SORTS: ReadonlyArray<{ label: string; sort: 'number' | 'customer' | 'orderedAt' | null; dir: 'asc' | 'desc' }> = [
  { label: 'Newest first', sort: null, dir: 'desc' },
  { label: 'Oldest first', sort: 'orderedAt', dir: 'asc' },
  { label: 'Order no. ↑', sort: 'number', dir: 'asc' },
  { label: 'Order no. ↓', sort: 'number', dir: 'desc' },
  { label: 'Customer A–Z', sort: 'customer', dir: 'asc' },
];

export default function QueueTabs({ p }: { p: OrdersPageBundle }) {
  const tabs = tabsFor(p.caps.role);
  const sortValue = SORTS.findIndex((s) => s.sort === p.sort && (s.sort === null || s.dir === p.dir));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="tablist" aria-label="Order queues" className="flex flex-wrap items-center gap-0.5 rounded-xl border border-orders-border bg-orders-surface p-0.5 shadow-orders">
        {tabs.map((t) => {
          const on = p.queue === t.key;
          return (
            <button key={t.key} type="button" role="tab" aria-selected={on} onClick={() => p.setQueue(t.key)} className={`flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold cursor-pointer ${on ? 'bg-orders-primary-soft text-orders-primary-ink' : 'text-orders-text-muted hover:bg-orders-surface-muted'}`}>
              {t.label}
              <span className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${on ? 'bg-orders-primary text-white' : 'bg-orders-canvas text-orders-text-muted'}`}>{p.queueCounts[t.key]}</span>
            </button>
          );
        })}
      </div>
      <span className="flex-1" />
      <label className="flex items-center gap-1.5 text-[11px] text-orders-text-subtle">
        Sort
        <select
          value={sortValue < 0 ? 0 : sortValue}
          onChange={(e) => { const next = SORTS[Number(e.target.value)]; p.setSortBy(next.sort, next.dir); }}
          className="h-8 rounded-lg border border-orders-border-strong bg-orders-surface px-2 text-[11px] font-semibold text-orders-text outline-none focus:border-orders-primary"
        >
          {SORTS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
        </select>
      </label>
      {p.canCreateInvoice && (
        <button type="button" onClick={p.openNewInvoice} className="flex h-8 items-center gap-1.5 rounded-lg border border-orders-border-strong bg-orders-surface px-2.5 text-[11px] font-semibold text-orders-text-body shadow-orders hover:bg-orders-surface-muted cursor-pointer"><Icon name="plus" className="h-3.5 w-3.5" />New invoice</button>
      )}
      <button type="button" onClick={p.handleToggleExpandAll} aria-pressed={p.expandAll} className="flex h-8 items-center gap-1.5 rounded-lg border border-orders-border-strong bg-orders-surface px-2.5 text-[11px] font-semibold text-orders-text-body shadow-orders hover:bg-orders-surface-muted cursor-pointer"><Icon name="expand" className="h-3.5 w-3.5" />{p.expandAll ? 'Collapse all' : 'Expand all'}</button>
    </div>
  );
}
