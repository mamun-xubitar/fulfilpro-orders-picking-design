'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { Icon } from './icons';

const SIZES = [10, 20, 50, 100];

/** Footer of the table card (prototype `.foot` + `.pager`): range, rows per page, page squares. */
export default function QueuePager({ p }: { p: OrdersPageBundle }) {
  const { pagination: g } = p;
  const from = g.total === 0 ? 0 : (g.page - 1) * g.pageSize + 1;
  const to = Math.min(g.page * g.pageSize, g.total);
  const square = 'flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-transparent text-[10.5px] font-bold';
  return (
    <div className="flex h-7 shrink-0 items-center justify-between rounded-b-[10px] border-t border-orders-border bg-orders-surface-muted px-2.5 text-[10.5px] text-orders-text-subtle">
      <span className="flex items-center gap-3">
        <span>Showing <b className="tabular-nums text-orders-text">{from}–{to}</b> of <b className="tabular-nums text-orders-text">{g.total}</b> orders</span>
        <label className="flex items-center gap-[5px]">
          Rows per page
          <select value={g.pageSize} disabled={p.loading} onChange={(e) => p.setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))} className="h-5 cursor-pointer rounded-[5px] border border-orders-border-strong bg-orders-surface px-0.5 text-[10.5px] font-bold text-orders-text-body">
            {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </span>
      <span className="flex gap-0.5" role="navigation" aria-label="Pages">
        <button type="button" aria-label="Previous page" disabled={!g.hasPrev || p.loading} onClick={() => p.goToPage(g.page - 1)} className={`${square} text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer`}><Icon name="chevronRight" className="h-3 w-3 rotate-180" /></button>
        {p.pageNumbers.map((n, i) => (n === 'ellipsis'
          ? <span key={`e${i}`} className={`${square} text-orders-text-subtle`}>…</span>
          : <button key={n} type="button" aria-current={n === g.page ? 'page' : undefined} disabled={p.loading} onClick={() => p.goToPage(n)} className={`${square} cursor-pointer ${n === g.page ? 'bg-orders-primary text-white' : 'text-orders-text-muted hover:bg-orders-divider'}`}>{n}</button>))}
        <button type="button" aria-label="Next page" disabled={!g.hasNext || p.loading} onClick={() => p.goToPage(g.page + 1)} className={`${square} text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer`}><Icon name="chevronRight" className="h-3 w-3" /></button>
      </span>
    </div>
  );
}
