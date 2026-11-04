'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { formatFulfillmentDate, formatStockStatus, getFulfillmentInfo, isOrderFullyFulfilled } from '../utils';
import { countShortLines, formatPlaced, getGridColumns, getRowTone, getStoreChip, getThumbnailUrl } from './queueUtils';
import Badge from './Badge';
import { Icon } from './icons';
import StageTrack from './StageTrack';
import RowActions from './RowActions';

const MINI = 'inline-flex h-4 items-center rounded-full border px-[3px]';

function StoreChip({ name }: { name: string }) {
  const { code, hue } = getStoreChip(name);
  return (
    <span title={name} className="inline-flex h-4 w-fit items-center gap-1 whitespace-nowrap rounded-[5px] border border-orders-border bg-orders-surface-muted px-[5px] text-[9.5px] font-bold text-orders-text-muted">
      <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: hue }} />{code}
    </span>
  );
}

function Thumbs({ order }: { order: OrderRow }) {
  const more = order.items.length - 3;
  return (
    <span className="flex min-w-0 items-center gap-[5px] whitespace-nowrap">
      <span className="inline-flex">
        {order.items.slice(0, 3).map((item, i) => (
          item.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img key={`${item.id}-${i}`} src={getThumbnailUrl(item.imageUrl)} alt="" loading="lazy" className={`h-[22px] w-[22px] rounded-md border-[1.5px] border-orders-surface bg-orders-canvas object-cover ring-1 ring-orders-border ${i ? '-ml-1.5' : ''}`} />
            : <span key={`${item.id}-${i}`} className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-[1.5px] border-orders-surface bg-orders-canvas text-[9px] font-bold text-orders-text-subtle ring-1 ring-orders-border ${i ? '-ml-1.5' : ''}`}>{item.name.slice(0, 1).toUpperCase()}</span>
        ))}
      </span>
      {more > 0 && <span className="text-[11.5px] tabular-nums text-orders-text-subtle">+{more}</span>}
      <span className="text-[10.5px] tabular-nums text-orders-text-subtle">{order.itemsCount} pcs</span>
    </span>
  );
}

function StockAdjCell({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const sa = order.stockAdjustment;
  if (!sa) return <span className="text-center text-orders-text-subtle">-</span>;
  return (
    <span className="flex justify-center">
      <button type="button" title={`Stock adjustment: ${sa.managedCount} of ${sa.totalCount} lines managed`} aria-label={`Manage stock adjustment for order ${order.number}`} onClick={(e) => { e.stopPropagation(); void p.openStockAdjustmentModal(order); }} className="cursor-pointer">
        <Badge tone={sa.status === 'managed' ? 'ok' : sa.status === 'partial' ? 'warn' : 'bad'}>{sa.managedCount}/{sa.totalCount}</Badge>
      </button>
    </span>
  );
}

function FulfilmentCell({ order }: { order: OrderRow }) {
  const info = getFulfillmentInfo(order);
  const first = info[0];
  if (!first) return <span className="text-orders-text-subtle">-</span>;
  return (
    <span className="flex min-w-0 flex-col items-start justify-center gap-px">
      <span className="max-w-full truncate text-[10.5px] font-bold text-orders-text">{first.date ? formatFulfillmentDate(first.date) : ''}{info.length > 1 && <span className="ml-1 font-normal text-orders-text-subtle">+{info.length - 1}</span>}</span>
      <span className="max-w-full truncate text-[10px] text-orders-text-subtle">
        {first.carrier}{first.carrier && first.trackingNumber ? ' · ' : ''}
        {first.trackingUrl ? <a href={first.trackingUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-orders-primary hover:underline">{first.trackingNumber}</a> : <span className="text-orders-primary">{first.trackingNumber}</span>}
      </span>
    </span>
  );
}

function PackedCell({ order }: { order: OrderRow }) {
  const pct = order.totalQuantity > 0 ? Math.round((order.packedQuantity / order.totalQuantity) * 100) : 0;
  const bar = order.packedQuantity >= order.totalQuantity && order.totalQuantity > 0 ? 'bg-orders-primary' : order.packedQuantity > 0 ? 'bg-orders-warning' : 'bg-orders-primary';
  return (
    <span className="flex items-center gap-1.5">
      <b className="tabular-nums">{order.packedQuantity}/{order.totalQuantity}</b>
      <span className="h-1 w-[38px] overflow-hidden rounded-sm bg-orders-border"><i className={`block h-full ${bar}`} style={{ width: `${pct}%` }} /></span>
    </span>
  );
}

function DecoCell({ order, p }: { order: OrderRow; p: OrdersPageBundle }) {
  if (p.caps.packedDate) {
    const last = (order.packingConfirmations ?? []).find((c) => !c.canceledAt);
    return <span className="text-[10.5px] tabular-nums text-orders-text-subtle">{last ? new Date(last.confirmedAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>;
  }
  const short = p.caps.stock && !isOrderFullyFulfilled(order) ? countShortLines(order) : 0;
  const prog = p.caps.decoration
    ? (['isEmbroidery', 'isPrint'] as const).flatMap((key) => {
        const lines = order.items.filter((i) => i[key]);
        if (lines.length === 0) return [];
        const total = lines.reduce((s, i) => s + i.qty, 0);
        const done = lines.reduce((s, i) => s + (i.decoration?.doneQty ?? 0), 0);
        return [{ key, label: `${done}/${total} ${key === 'isEmbroidery' ? 'EMB' : 'PRT'}`, tone: key === 'isEmbroidery' ? ('emb' as const) : ('prt' as const) }];
      })
    : [];
  return (
    <span className="flex items-center gap-[5px]">
      {short > 0 && <Badge tone="warn" title={`${short} line${short > 1 ? 's' : ''} not covered by available stock`}>Short {short}</Badge>}
      {prog.map((d) => <Badge key={d.key} tone={d.tone}>{d.label}</Badge>)}
    </span>
  );
}

export default function QueueRow({ p, order, isExpanded }: { p: OrdersPageBundle; order: OrderRow; isExpanded: boolean }) {
  const { caps } = p;
  const fulfilled = isOrderFullyFulfilled(order);
  const canceled = order.canceled;
  const selected = p.selectedLabelIds.has(order.id);
  const tone = getRowTone(order, caps);
  const plain = tone.includes('bg-orders-surface ');
  const bg = isExpanded && plain ? 'bg-orders-surface' : selected && plain ? 'bg-orders-primary-soft' : tone;
  return (
    <div
      role="row"
      onClick={() => p.toggleExpanded(order.id)}
      className={`grid h-9 cursor-pointer items-center gap-x-2 border-b border-orders-divider px-2.5 text-[11.5px] ${canceled ? 'text-orders-text-subtle' : 'text-orders-text-body'} ${isExpanded ? 'relative shadow-[inset_0_0_0_1.5px_var(--orders-primary)]' : ''} ${bg}`}
      style={{ gridTemplateColumns: getGridColumns(caps) }}
    >
      <span onClick={(e) => e.stopPropagation()} className="flex">
        <input type="checkbox" checked={selected} onChange={() => p.toggleLabelSelected(order.id)} aria-label={`Select order ${order.number}`} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
      </span>
      <span className="flex min-w-0 flex-col items-start justify-center gap-px">
        <span className="flex min-w-0 items-center gap-[5px] whitespace-nowrap">
          <b className={`tabular-nums ${canceled ? 'text-orders-text-subtle line-through' : caps.labels && order.labelPrintedAt ? 'text-orders-success-ink' : 'text-orders-text'}`}>#{order.number}</b>
          {caps.labels && order.labelPrintedAt && <span title="Shipping label printed" className={`${MINI} border-orders-success-border bg-orders-success-soft text-orders-success-ink`}><Icon name="tag" className="h-2.5 w-2.5" /></span>}
          {caps.requestStock && order.backInStockStatus && !fulfilled && <span title={`${formatStockStatus(order.backInStockStatus)}: back-in-stock request`} className={`${MINI} ${order.backInStockStatus === 'back_in_stock' ? 'border-orders-success-border bg-orders-success-soft text-orders-success-ink' : 'border-orders-warning-border bg-orders-warning-soft text-orders-warning-ink'}`}><Icon name="cube" className="h-2.5 w-2.5" /></span>}
          {order.closed && !canceled && <Badge title="Order closed in Shopify">Closed</Badge>}
          {canceled && <Badge>Canceled</Badge>}
        </span>
        <span className="max-w-full truncate text-[10px] text-orders-text-subtle">{formatPlaced(order.orderedAt)}</span>
      </span>
      <StoreChip name={order.storeName} />
      <b className="truncate text-[11.5px] font-bold text-orders-text">{order.customer}</b>
      {caps.admin && <StockAdjCell p={p} order={order} />}
      <Thumbs order={order} />
      <StageTrack order={order} caps={caps} />
      {caps.fulfilment && <FulfilmentCell order={order} />}
      <PackedCell order={order} />
      <DecoCell order={order} p={p} />
      <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <NoteButton p={p} order={order} />
      </span>
      <span onClick={(e) => e.stopPropagation()}><RowActions p={p} order={order} isExpanded={isExpanded} /></span>
    </div>
  );
}

function NoteButton({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  return (
    <button type="button" title="Order notes" aria-label="Order notes" onClick={() => void p.openNoteModal(order)} className="relative flex h-5 w-5 items-center justify-center rounded text-orders-text-subtle hover:bg-orders-divider hover:text-orders-text cursor-pointer">
      <Icon name="note" className="h-3.5 w-3.5" />
      {order.noteCount > 0 && <i className="absolute -right-[3px] -top-0.5 rounded-full bg-orders-primary px-[3.5px] text-[8px] font-bold not-italic leading-3 text-white">{order.noteCount > 99 ? '99+' : order.noteCount}</i>}
    </button>
  );
}
