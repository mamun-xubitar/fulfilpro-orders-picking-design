'use client';

import type { OrderItem, OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import Badge from './Badge';
import { Icon } from './icons';

const firstName = (name: string) => name.split(' ')[0];
const kindOn = { emb: 'border-orders-emb-border bg-orders-emb-soft text-orders-emb', prt: 'border-orders-prt-border bg-orders-prt-soft text-orders-prt' };

/** Decoration badges at the right of the Item cell (prototype `lineDeco` with both toggles): EMB over PRT on every line
 * (Admin toggles them, Staff reads them). Who does the work lives in the Decorator column. */
export function DecoCell({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const done = item.decoration?.doneQty ?? 0;
  const admin = p.caps.admin;
  const badge = (key: 'isEmbroidery' | 'isPrint', short: 'EMB' | 'PRT', on: boolean | undefined, name: string, tone: keyof typeof kindOn) => {
    const text = on ? `${done}/${item.qty} ${short}` : short;
    if (admin) {
      return (
        <button key={key} type="button" title={`Toggle ${name}`} onClick={() => p.toggleLineItemDecoration(order, item, key)} className={`inline-flex h-4 items-center whitespace-nowrap rounded-full border px-1.5 text-[9.5px] font-bold cursor-pointer ${on ? kindOn[tone] : 'border-orders-border bg-orders-canvas text-orders-text-subtle hover:bg-orders-border'}`}>{text}</button>
      );
    }
    return on ? <Badge key={key} tone={tone} title={`${name}: ${done} of ${item.qty} decorated`}>{text}</Badge> : null;
  };
  const badges = [badge('isEmbroidery', 'EMB', item.isEmbroidery, 'embroidery', 'emb'), badge('isPrint', 'PRT', item.isPrint, 'print', 'prt')].filter(Boolean);
  if (badges.length === 0) return null;
  return <span className="flex flex-none flex-col items-end gap-0.5 whitespace-nowrap">{badges}</span>;
}

const TEXT_BTN = 'inline-flex h-4 items-center whitespace-nowrap rounded-full border border-orders-border px-1.5 text-[9.5px] font-bold text-orders-text-muted hover:bg-orders-divider hover:text-orders-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-orders-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';

/** Decorator column: who is assigned (chip, a `+` button to assign for Admin) and, below, Admin's two decoration actions as
 * icon buttons: Mark decoration done and View decorations. Staff reads the assignee only. */
export function DecoratorCell({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const admin = p.caps.admin;
  const decorated = Boolean(item.isEmbroidery || item.isPrint);
  const assignments = item.assignments ?? [];
  const first = assignments[0];
  if (!first && !admin) return <span className="text-orders-text-subtle">-</span>;
  const remaining = item.decoration?.remaining ?? item.qty;
  const hasWork = (item.decoration?.works?.length ?? 0) > 0;
  const label = first ? `${firstName(first.assigneeName)}${first.dueDate ? ` · ${first.dueDate}` : ''}` : '';
  const title = first ? `Assigned to ${first.assigneeName}${first.dueDate ? ` · due ${first.dueDate}` : ''}` : '';
  return (
    <span className="flex min-w-0 flex-col items-start gap-0.5 py-0.5">
      <span className="flex min-w-0 max-w-full items-center gap-1">
        {first ? (
          <span className="min-w-0 [&>span]:max-w-full [&>span]:truncate" title={title}><Badge tone="info">{label}</Badge></span>
        ) : (
          <span className="text-[10px] text-orders-text-subtle">Unassigned</span>
        )}
        {assignments.length > 1 && <span className="text-[9.5px] font-bold text-orders-text-subtle">+{assignments.length - 1}</span>}
        {admin && (
          <button type="button" title={first ? 'Change the decorator' : 'Assign a decorator'} aria-label={first ? 'Change the decorator' : 'Assign a decorator'} onClick={() => p.openAssignModal(order, item)} className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-orders-primary-ring text-orders-primary-ink hover:bg-orders-primary-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-orders-primary cursor-pointer">
            <Icon name="plus" className="h-2.5 w-2.5" />
          </button>
        )}
      </span>
      {admin && decorated && (
        <span className="flex items-center gap-1">
          <button type="button" disabled={remaining <= 0} title="Mark decoration done" aria-label="Mark decoration done" onClick={() => p.openWorkModal(order, item)} className={TEXT_BTN}>Mark done</button>
          <button type="button" disabled={!hasWork} title="View decorations" aria-label="View decorations" onClick={() => p.openWorkDetails(order, item)} className={TEXT_BTN}>View</button>
        </span>
      )}
    </span>
  );
}
