'use client';

import { Fragment } from 'react';
import type { OrdersPageBundle } from '../ordersPageContext';
import { getGridColumns, getTableMinWidth } from './queueUtils';
import QueueRow from './QueueRow';
import ExpandedOrder from './ExpandedOrder';
import { StageTrackHead } from './StageTrack';
import QueuePager from './QueuePager';
import BulkBar from './BulkBar';
import AttachmentsStrip from './AttachmentsStrip';
import { Icon } from './icons';

function SortHead({ p, label, sortKey }: { p: OrdersPageBundle; label: string; sortKey: 'number' | 'customer' }) {
  const on = p.sort === sortKey;
  return (
    <button type="button" onClick={() => p.handleSortChange(sortKey)} className="flex items-center gap-0.5 uppercase cursor-pointer hover:text-orders-text" aria-label={`Sort by ${label}`}>
      {label}<Icon name={on && p.dir === 'desc' ? 'chevronDown' : 'chevronUp'} className={`h-2.5 w-2.5 ${on ? 'text-orders-primary' : 'opacity-40'}`} />
    </button>
  );
}

function Header({ p }: { p: OrdersPageBundle }) {
  const { caps } = p;
  const some = p.selectedLabelIds.size > 0;
  return (
    <div role="row" className="sticky top-0 z-10 grid h-[26px] whitespace-nowrap items-center gap-x-2 rounded-t-[10px] border-b border-orders-border bg-orders-surface-muted px-2.5 text-[9.5px] font-bold uppercase tracking-[.4px] text-orders-text-subtle" style={{ gridTemplateColumns: getGridColumns(caps) }}>
      <input type="checkbox" checked={p.allLabelsOnPageSelected} ref={(el) => { if (el) el.indeterminate = some && !p.allLabelsOnPageSelected; }} onChange={p.toggleSelectAllLabelsOnPage} disabled={p.loading || p.orders.length === 0} aria-label="Select all orders on this page" className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
      <SortHead p={p} label="Order" sortKey="number" />
      <span>Store</span>
      <SortHead p={p} label="Customer" sortKey="customer" />
      {caps.admin && <span className="text-center" title="Stock adjustment">Stock adj.</span>}
      <span>Items</span>
      <StageTrackHead caps={caps} />
      {caps.fulfilment && <span>Fulfilment</span>}
      <span>Packed</span>
      <span>{caps.packedDate ? 'Packed date' : 'Decoration'}</span>
      <span>Notes</span>
      <span className="text-right">Actions</span>
    </div>
  );
}

export default function QueueTable({ p }: { p: OrdersPageBundle }) {
  const { orders, loading, error, expandedIds, caps } = p;
  return (
    <section className="flex min-h-[320px] min-w-0 flex-col rounded-[10px] border border-orders-border bg-orders-surface shadow-orders xl:min-h-0 xl:flex-1">
      <div className="relative min-h-0 flex-1">
        <div className="thin-scroll xl:absolute xl:inset-0 xl:overflow-auto xl:pb-[70px]">
          <div role="table" aria-label="Orders queue" aria-busy={loading} style={{ minWidth: getTableMinWidth(caps) }}>
            <Header p={p} />
            {loading && <div className="py-12 text-center text-[12px] text-orders-text-subtle">Loading orders…</div>}
            {!loading && error && <div className="py-12 text-center text-[12px] text-orders-danger">{error}</div>}
            {!loading && !error && orders.length === 0 && <div className="py-16 text-center text-[12px] text-orders-text-subtle">No orders found.</div>}
            {!loading && !error && orders.map((order) => {
              const isExpanded = expandedIds.has(order.id);
              return (
                <Fragment key={order.id}>
                  <QueueRow p={p} order={order} isExpanded={isExpanded} />
                  {caps.admin && order.items.some((i) => i.isEmbroidery || i.isPrint) && <AttachmentsStrip p={p} order={order} />}
                  {isExpanded && <ExpandedOrder p={p} order={order} />}
                </Fragment>
              );
            })}
          </div>
        </div>
        <BulkBar p={p} />
      </div>
      <QueuePager p={p} />
    </section>
  );
}
