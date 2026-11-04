'use client';

import type { ReactNode } from 'react';
import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import ExtrasBar from './ExtrasBar';
import ItemLine from './ItemLine';
import { CENTERED_COLUMNS, getLineColumns, lineGap, lineGridTemplate } from './lineColumns';
import { Icon, type IconName } from './icons';

/** One card of the expanded order (prototype `.bx`): 9px radius, no shadow, 26px section header. */
export function CardShell({ title, icon, right, children }: { title: string; icon: IconName; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col rounded-[9px] border border-orders-border bg-orders-surface">
      <header className="flex h-[26px] shrink-0 items-center justify-between gap-1.5 border-b border-orders-divider px-[9px]">
        <h4 className="flex items-center gap-[5px] text-[9.5px] font-bold uppercase tracking-[.5px] text-orders-text-subtle"><Icon name={icon} className="h-[11px] w-[11px]" />{title}</h4>
        {right && <span className="tabular-nums text-orders-text-subtle">{right}</span>}
      </header>
      {children}
    </section>
  );
}

/** Body padding used by the side cards (prototype `.in`). */
export const CardBody = ({ children }: { children: ReactNode }) => <div className="flex flex-col gap-1.5 p-2">{children}</div>;

export default function ItemsCard({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const { caps } = p;
  const showDecorator = order.items.some((i) => i.isEmbroidery || i.isPrint || (i.assignments?.length ?? 0) > 0 || (i.decoration?.works?.length ?? 0) > 0);
  const cols = getLineColumns(caps, showDecorator);
  const restockItems = (order.stockAdjustment?.items ?? []).filter((i) => i.action === 'restore');
  const allFull = order.items.length > 0 && order.items.every((item, i) => p.isLineFullChecked(order, item, i));
  return (
    <CardShell title="Order items" icon="cube" right={`${order.totalQuantity} pcs · ${order.packedQuantity} packed`}>
      <ExtrasBar p={p} order={order} />
      <div role="table" aria-label={`Items of order ${order.number}`}>
        <div role="row" className="grid h-[22px] items-center whitespace-nowrap border-b border-orders-border bg-orders-surface-muted px-2 text-[9px] font-bold uppercase tracking-[.4px] text-orders-text-subtle" style={{ gridTemplateColumns: lineGridTemplate(cols), columnGap: lineGap(caps) }}>
          {cols.map((c) => (
            <span key={c.key} className={CENTERED_COLUMNS.includes(c.key) ? 'text-center' : c.key === 'full' ? 'flex items-center justify-center gap-[3px]' : ''}>
              {c.label}
              {c.key === 'full' && <input type="checkbox" checked={allFull} onChange={() => p.toggleAllFull(order)} aria-label="Mark every line Full" title="Mark every line Full" className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />}
            </span>
          ))}
        </div>
        {order.items.map((item, index) => <ItemLine key={`${order.id}-${index}`} p={p} order={order} item={item} index={index} restockItems={restockItems} cols={cols} />)}
      </div>
    </CardShell>
  );
}
