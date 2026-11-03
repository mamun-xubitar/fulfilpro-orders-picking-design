'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { isOrderFulfillmentLocked, orderNameEntries } from '../utils';
import FulfillmentDetailsView from '../FulfillmentDetailsView';
import ItemLine from './ItemLine';
import { getLineColumns, lineGridTemplate } from './lineColumns';
import { Icon } from './icons';

const toolBtn = 'flex h-6 items-center gap-1 rounded-md border px-2 text-[10.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer';

export function CardShell({ title, icon, right, children }: { title: string; icon: 'cube' | 'tracking' | 'user' | 'printer'; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-orders-border bg-orders-surface shadow-orders">
      <header className="flex items-center justify-between gap-2 border-b border-orders-divider px-3 py-1.5">
        <h4 className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-orders-text-muted"><Icon name={icon} className="h-3 w-3" />{title}</h4>
        {right && <span className="text-[10.5px] text-orders-text-muted">{right}</span>}
      </header>
      {children}
    </section>
  );
}

export default function ItemsCard({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  const locked = isOrderFulfillmentLocked(order);
  const showFulfilments = p.fulfillmentViewOrderId === order.id;
  const hasWork = order.items.some((i) => (i.decoration?.works?.length ?? 0) > 0);
  const cols = getLineColumns(caps, hasWork);
  const restockItems = (order.stockAdjustment?.items ?? []).filter((i) => i.action === 'restore');
  const allFull = order.items.length > 0 && order.items.every((item, i) => p.isLineFullChecked(order, item, i));
  const namesAll = orderNameEntries(order).length > 0;
  const hasFulfilments = order.fulfillmentItems.confirmations.length > 0;

  return (
    <CardShell title="Order items" icon="cube" right={`${order.totalQuantity} pcs · ${order.packedQuantity} packed`}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-orders-divider px-3 py-1.5">
        {namesAll && !showFulfilments && (
          <label className="flex items-center gap-1 text-[10.5px] text-orders-text-muted cursor-pointer"><input type="checkbox" checked={p.isOrderAllNamesChecked(order)} onChange={() => p.toggleOrderNames(order)} className="h-3 w-3 rounded border-orders-border-strong text-orders-primary cursor-pointer" />Select names</label>
        )}
        <span className="flex-1" />
        {showFulfilments ? (
          <button type="button" onClick={() => p.setFulfillmentViewOrderId(null)} className={`${toolBtn} border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted`}>← Back to items</button>
        ) : (
          <>
            {caps.requestStock && (
              <button type="button" onClick={() => void p.openStockModal(order)} className={`${toolBtn} border-orders-warning-border bg-orders-surface text-orders-warning-ink hover:bg-orders-warning-soft`}>
                <Icon name="cube" className="h-3 w-3" />Request stock{order.stockRequestCount > 0 && <b className="rounded-full bg-orders-warning px-1 text-[9px] text-white">{order.stockRequestCount}</b>}
              </button>
            )}
            {caps.fulfilment && (
              <button type="button" disabled={!hasFulfilments} title={hasFulfilments ? 'View fulfilments' : 'No fulfilments yet'} onClick={() => p.setFulfillmentViewOrderId(order.id)} className={`${toolBtn} border-orders-primary-ring bg-orders-surface text-orders-primary-ink hover:bg-orders-primary-soft`}>
                Fulfilments<Icon name="chevronRight" className="h-3 w-3" />
              </button>
            )}
            {caps.admin && (
              <button type="button" disabled={locked} title={locked ? 'Order is closed or canceled' : 'Add a line item'} onClick={() => p.openAddLineItemModal(order, order.items[order.items.length - 1]?.id ?? null)} className={`${toolBtn} border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted`}>
                <Icon name="plus" className="h-3 w-3" />Add line
              </button>
            )}
          </>
        )}
      </div>
      {showFulfilments ? (
        <div className="p-3"><FulfillmentDetailsView p={p} order={order} /></div>
      ) : (
        <div role="table" aria-label={`Items of order ${order.number}`}>
          <div role="row" className="grid items-center gap-x-2 border-b border-orders-border px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide text-orders-text-subtle" style={{ gridTemplateColumns: lineGridTemplate(cols) }}>
            {cols.map((c) => (
              <span key={c.key} className={c.key === 'item' ? '' : 'flex justify-center'}>
                {c.key === 'full' ? <label className="flex items-center gap-1 cursor-pointer">{c.label}<input type="checkbox" checked={allFull} onChange={() => p.toggleAllFull(order)} aria-label="Mark every line Full" className="h-3 w-3 rounded border-orders-border-strong text-orders-primary cursor-pointer" /></label> : c.label}
              </span>
            ))}
          </div>
          {order.items.map((item, index) => <ItemLine key={`${order.id}-${index}`} p={p} order={order} item={item} index={index} restockItems={restockItems} cols={cols} />)}
        </div>
      )}
    </CardShell>
  );
}
