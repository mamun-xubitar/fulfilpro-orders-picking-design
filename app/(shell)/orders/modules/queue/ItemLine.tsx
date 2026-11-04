'use client';

import { getRoleLabel } from '@/lib/roles';
import type { OrderItem, OrderRow, OrderStockAdjustmentItem } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { getFulfilledQty, getNameAttribute, nameKey, rowItemKey } from '../utils';
import OrderItemActions from '../OrderItemActions';
import { getRemainingToPack } from '../slipDocument';
import { getItemColour, getOtherOptions, getShopifyAdminUrl, getSwatchColour, getThumbnailUrl } from './queueUtils';
import { getLineColumns, lineGridTemplate } from './lineColumns';
import { AvailCell, PoCell } from './StockCells';
import { Icon } from './icons';
import Badge from './Badge';

type Props = { p: OrdersPageBundle; order: OrderRow; item: OrderItem; index: number; restockItems: OrderStockAdjustmentItem[]; cols: ReturnType<typeof getLineColumns> };

function ProductCell({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const colour = getItemColour(item);
  const url = p.caps.stock ? getShopifyAdminUrl(order, item) : null;
  const nameAttr = getNameAttribute(item);
  const nameChecked = nameAttr ? p.isNameChecked(nameKey(order.id, item.id)) : false;
  return (
    <span className="flex min-w-0 items-start gap-2">
      {item.imageUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={getThumbnailUrl(item.imageUrl, 64)} alt="" loading="lazy" className="h-8 w-8 shrink-0 rounded border border-orders-border bg-orders-canvas object-cover" />
        : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-orders-border bg-orders-canvas text-[10px] font-bold text-orders-text-subtle">{item.name.slice(0, 1).toUpperCase()}</span>}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="flex min-w-0 items-center gap-1">
          <b className="truncate text-[11.5px] font-semibold text-orders-text" title={item.name}>{item.name}</b>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" title="Open product in Shopify admin" aria-label={`Open ${item.name} in Shopify admin`} onClick={(e) => e.stopPropagation()} className="shrink-0 text-orders-primary hover:text-orders-primary-hover"><Icon name="external" className="h-3 w-3" /></a>
          )}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-[10px] text-orders-text-muted">
          {colour && <span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full border border-black/15" style={{ background: getSwatchColour(colour) }} />{colour}</span>}
          {getOtherOptions(item) && <span>· {getOtherOptions(item)}</span>}
        </span>
        {nameAttr && (
          <label className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-orders-primary-ink cursor-pointer">
            <input type="checkbox" checked={nameChecked} onChange={() => p.setNamesChecked([{ key: nameKey(order.id, item.id), row: { orderNumber: String(order.number), productTitle: item.title ?? item.name, value: nameAttr.value } }], !nameChecked)} className="h-3 w-3 rounded border-orders-border-strong text-orders-primary cursor-pointer" />
            {nameAttr.name}: {nameAttr.value}
          </label>
        )}
        {p.caps.admin && <DecorationControls p={p} order={order} item={item} />}
      </span>
    </span>
  );
}

function DecorationControls({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const decorated = item.isEmbroidery || item.isPrint;
  const remaining = item.decoration?.remaining ?? item.qty;
  const chip = 'inline-flex items-center rounded-full border px-1.5 text-[9.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-1">
      {(item.assignments ?? []).map((a) => (
        <span key={a.id} title={`${getRoleLabel(a.assigneeRole)}${a.dueDate ? ` · due ${a.dueDate}` : ''}`} className="inline-flex items-center rounded-full bg-orders-emb-soft px-1.5 text-[9.5px] font-medium text-orders-emb">{a.assigneeName}{a.dueDate ? ` · ${a.dueDate}` : ''}</span>
      ))}
      <button type="button" onClick={() => p.openAssignModal(order, item)} className={`${chip} border-orders-emb-border text-orders-emb hover:bg-orders-emb-soft`}>+ Assign</button>
      {decorated && (
        <>
          <button type="button" onClick={() => p.openWorkModal(order, item)} disabled={remaining <= 0} title={remaining <= 0 ? 'All pieces are done' : 'Mark decoration done'} className={`${chip} border-orders-success-border text-orders-success-ink hover:bg-orders-success-soft`}>Mark done</button>
          <button type="button" onClick={() => p.openWorkDetails(order, item)} disabled={(item.decoration?.works?.length ?? 0) === 0} title={(item.decoration?.works?.length ?? 0) === 0 ? 'No decoration work yet' : 'View decorations'} className={`${chip} border-orders-primary-ring text-orders-primary-ink hover:bg-orders-primary-soft`}>View</button>
        </>
      )}
    </span>
  );
}

function DecoCell({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const done = item.decoration?.doneQty ?? 0;
  const make = (key: 'isEmbroidery' | 'isPrint', on: boolean | undefined, label: string, onCls: string) => {
    const text = on ? `${done}/${item.qty} ${label}` : label;
    if (p.caps.admin) {
      return <button type="button" title={`Toggle ${label === 'Emb' ? 'embroidery' : 'print'}`} onClick={() => p.toggleLineItemDecoration(order, item, key)} className={`h-4 rounded-full border px-1.5 text-[9.5px] font-bold cursor-pointer ${on ? onCls : 'border-orders-border bg-orders-canvas text-orders-text-subtle hover:bg-orders-border'}`}>{text}</button>;
    }
    return on ? <Badge tone={key === 'isEmbroidery' ? 'emb' : 'prt'}>{text}</Badge> : null;
  };
  return <span className="flex flex-col items-start gap-0.5">{make('isEmbroidery', item.isEmbroidery, 'Emb', 'border-orders-emb-border bg-orders-emb-soft text-orders-emb')}{make('isPrint', item.isPrint, 'Print', 'border-orders-prt-border bg-orders-prt-soft text-orders-prt')}</span>;
}

export default function ItemLine({ p, order, item, index, restockItems, cols }: Props) {
  const { caps } = p;
  const key = rowItemKey(order.id, index);
  const fulfilled = getFulfilledQty(order, item.id);
  const remainingFul = Math.max(0, item.qty - fulfilled);
  const remainingPack = getRemainingToPack(item);
  const selectable = caps.pack && !caps.fulfilment ? remainingPack : caps.fulfilment && !caps.pack ? remainingFul : Math.max(remainingPack, remainingFul);
  const isFull = p.isLineFullChecked(order, item, index);
  const partial = Math.min(selectable, Math.max(0, p.partialValues[key] ?? 0));
  const packed = item.packedQuantity ?? 0;
  const done = item.qty > 0 && packed >= item.qty;
  const restock = restockItems.find((r) => r.lineItemId === item.id);
  const work = item.decoration;
  const cell: Record<string, React.ReactNode> = {
    item: <ProductCell p={p} order={order} item={item} />,
    sku: <span className="truncate font-mono text-[10px] text-orders-text-muted" title={item.sku || undefined}>{item.sku || '-'}</span>,
    deco: <DecoCell p={p} order={order} item={item} />,
    qty: <b className="tabular-nums">{item.qty}</b>,
    packed: <b className={`tabular-nums ${done ? 'text-orders-success-ink' : packed > 0 ? 'text-orders-warning-ink' : 'text-orders-text-subtle'}`}>{packed}/{item.qty}</b>,
    pdate: <span className="text-[10px] text-orders-text-muted tabular-nums">{item.packedDate ? new Date(item.packedDate).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</span>,
    ful: <b className={`tabular-nums ${fulfilled >= item.qty && item.qty > 0 ? 'text-orders-success-ink' : 'text-orders-text-subtle'}`}>{fulfilled}/{item.qty}</b>,
    avail: <AvailCell order={order} item={item} />,
    po: <PoCell p={p} order={order} item={item} />,
    work: (work?.works?.length ?? 0) > 0
      ? <button type="button" disabled={!caps.admin} title="View decoration work" onClick={() => p.openWorkDetails(order, item)} className={`rounded-full px-1.5 text-[9.5px] font-bold ${work?.fullyDone ? 'bg-orders-success-soft text-orders-success-ink' : (work?.doneQty ?? 0) > 0 ? 'bg-orders-warning-soft text-orders-warning-ink' : 'bg-orders-canvas text-orders-text-muted'} ${caps.admin ? 'cursor-pointer' : 'cursor-default'}`}>{work?.doneQty ?? 0}/{item.qty}</button>
      : <span className="text-orders-border-strong">-</span>,
    full: <input type="checkbox" checked={isFull} disabled={selectable === 0} title={selectable === 0 ? 'Nothing left to select' : 'Select the whole remaining quantity'} onChange={() => p.toggleFull(order.id, index, selectable)} className="h-3.5 w-3.5 rounded border-orders-border-strong text-orders-primary disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer" />,
    partial: (
      <span className={`inline-flex h-6 items-center overflow-hidden rounded-[7px] border border-orders-border-strong bg-orders-surface ${isFull || selectable === 0 ? 'opacity-50' : ''}`}>
        <button type="button" aria-label={`Decrease partial quantity for ${item.name}`} disabled={isFull || selectable === 0 || partial <= 0} onClick={() => p.validPartial(order.id, index, selectable, String(partial - 1))} className="h-full w-5 text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed cursor-pointer">−</button>
        <input type="number" min={0} max={selectable} value={partial} disabled={isFull || selectable === 0} aria-label={`Partial quantity for ${item.name}`} onChange={(e) => p.validPartial(order.id, index, selectable, e.target.value)} className="h-full w-7 border-x border-orders-border bg-transparent text-center text-[11px] font-bold tabular-nums outline-none [appearance:textfield] disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none" />
        <button type="button" aria-label={`Increase partial quantity for ${item.name}`} disabled={isFull || selectable === 0 || partial >= selectable} onClick={() => p.validPartial(order.id, index, selectable, String(partial + 1))} className="h-full w-5 text-[13px] font-bold text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed cursor-pointer">+</button>
      </span>
    ),
    actions: caps.admin ? <OrderItemActions p={p} order={order} item={item} /> : null,
  };
  return (
    <div role="row" className={`grid items-center gap-x-2 border-b border-orders-divider px-2 py-1.5 text-[11px] ${done ? 'bg-orders-tone-packed' : packed > 0 ? 'bg-orders-warning-soft' : ''}`} style={{ gridTemplateColumns: lineGridTemplate(cols) }}>
      {cols.map((c) => <span key={c.key} className={c.key === 'item' || c.key === 'sku' ? 'min-w-0' : 'flex justify-center'}>{cell[c.key]}</span>)}
      {restock && <span className="col-span-full -mt-0.5 ml-10"><Badge tone={restock.managed ? 'ok' : 'warn'}>Restock {restock.managed ? restock.quantity : 0}/{restock.quantity}</Badge></span>}
    </div>
  );
}
