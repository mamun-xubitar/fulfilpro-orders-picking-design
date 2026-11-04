'use client';

import type { OrderItem, OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import Badge from './Badge';

const firstName = (name: string) => name.split(' ')[0];
const kindOn = { emb: 'border-orders-emb-border bg-orders-emb-soft text-orders-emb', prt: 'border-orders-prt-border bg-orders-prt-soft text-orders-prt' };

/** Deco column (prototype `lineDeco` with both toggles): an EMB and a PRT badge on every line (Admin toggles them,
 * Staff reads them) and the assignee chip below. Admin reaches Assign by clicking the chip, or the `+` that shows
 * on row hover. */
export function DecoCell({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const done = item.decoration?.doneQty ?? 0;
  const admin = p.caps.admin;
  const badge = (key: 'isEmbroidery' | 'isPrint', short: 'EMB' | 'PRT', on: boolean | undefined, name: string, tone: keyof typeof kindOn) => {
    const text = on ? `${done}/${item.qty} ${short}` : short;
    if (admin) {
      return (
        <button key={key} type="button" title={`Toggle ${name}`} onClick={() => p.toggleLineItemDecoration(order, item, key)} className={`inline-flex h-4 items-center rounded-full border px-1.5 text-[9.5px] font-bold cursor-pointer ${on ? kindOn[tone] : 'border-orders-border bg-orders-canvas text-orders-text-subtle hover:bg-orders-border'}`}>{text}</button>
      );
    }
    return on ? <Badge key={key} tone={tone} title={`${name}: ${done} of ${item.qty} decorated`}>{text}</Badge> : null;
  };
  const badges = [badge('isEmbroidery', 'EMB', item.isEmbroidery, 'embroidery', 'emb'), badge('isPrint', 'PRT', item.isPrint, 'print', 'prt')].filter(Boolean);
  const assignments = item.assignments ?? [];
  return (
    <span className="flex flex-col items-start gap-0.5 leading-[1.1]">
      <span className="flex gap-[3px]">{badges.length > 0 ? badges : <span className="text-orders-text-subtle">-</span>}</span>
      {(assignments.length > 0 || admin) && (
        <span className="flex items-center gap-0.5">
          {assignments.slice(0, 1).map((a) => {
            const label = `${firstName(a.assigneeName)}${a.dueDate ? ` · ${a.dueDate}` : ''}`;
            return admin
              ? <button key={a.id} type="button" title={`Assigned to ${a.assigneeName}${a.dueDate ? ` · due ${a.dueDate}` : ''}: click to change`} onClick={() => p.openAssignModal(order, item)} className="cursor-pointer"><Badge tone="info">{label}</Badge></button>
              : <Badge key={a.id} tone="info" title={`Assigned to ${a.assigneeName}${a.dueDate ? ` · due ${a.dueDate}` : ''}`}>{label}</Badge>;
          })}
          {assignments.length > 1 && <span className="text-[9.5px] font-bold text-orders-text-subtle">+{assignments.length - 1}</span>}
          {admin && (
            <button type="button" title="Assign a decorator" aria-label="Assign a decorator" onClick={() => p.openAssignModal(order, item)} className="flex h-4 w-4 items-center justify-center rounded-full border border-orders-emb-border text-[11px] font-bold leading-none text-orders-emb opacity-0 transition-opacity hover:bg-orders-emb-soft focus:opacity-100 group-hover:opacity-100 cursor-pointer">+</button>
          )}
        </span>
      )}
    </span>
  );
}

/** Work column: decorated / total, green when finished, amber when started. Admin opens the decoration work list
 * (which also offers Mark done); a decorated line without work yet opens Mark done directly. */
export function WorkCell({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const works = item.decoration?.works?.length ?? 0;
  const decorated = Boolean(item.isEmbroidery || item.isPrint);
  const done = item.decoration?.doneQty ?? 0;
  if (works === 0 && !(decorated && p.caps.admin)) return <span className="text-orders-text-subtle">-</span>;
  if (works === 0) {
    return <button type="button" title="Mark decoration done" onClick={() => p.openWorkModal(order, item)} className="h-4 rounded-full border border-orders-border px-1.5 text-[9.5px] font-bold text-orders-text-subtle hover:bg-orders-canvas cursor-pointer">-</button>;
  }
  const tone = item.decoration?.fullyDone ? 'ok' : done > 0 ? 'warn' : 'neutral';
  const label = `${done}/${item.qty}`;
  return p.caps.admin
    ? <button type="button" title="View decoration work" onClick={() => p.openWorkDetails(order, item)} className="cursor-pointer"><Badge tone={tone}>{label}</Badge></button>
    : <Badge tone={tone} title="Decoration work">{label}</Badge>;
}
