'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { formatFulfillmentDate, formatStockStatus, getDecorationStatusBadges, getFulfillmentInfo, isOrderFullyFulfilled } from '../utils';
import { countShortLines, getGridColumns, getRowTone, getStoreChip, getThumbnailUrl } from './queueUtils';
import Badge from './Badge';
import StageTrack from './StageTrack';
import RowActions, { IconButton } from './RowActions';

const dateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

function Thumbs({ order }: { order: OrderRow }) {
  const shown = order.items.slice(0, 3);
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex -space-x-1.5">
        {shown.map((item, i) => (
          item.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img key={`${item.id}-${i}`} src={getThumbnailUrl(item.imageUrl)} alt="" loading="lazy" className="h-6 w-6 rounded border border-orders-surface bg-orders-canvas object-cover ring-1 ring-orders-border" />
            : <span key={`${item.id}-${i}`} className="flex h-6 w-6 items-center justify-center rounded border border-orders-surface bg-orders-canvas text-[9px] font-bold text-orders-text-subtle ring-1 ring-orders-border">{item.name.slice(0, 1).toUpperCase()}</span>
        ))}
      </span>
      <span className="whitespace-nowrap text-[11px] text-orders-text-muted tabular-nums">{order.itemsCount} pcs</span>
    </span>
  );
}

function StockAdjButton({ p, order }: { p: OrdersPageBundle; order: OrderRow }) {
  const sa = order.stockAdjustment;
  if (!sa) return <span className="text-orders-border-strong">-</span>;
  const tone = sa.status === 'managed' ? 'bg-orders-success-soft text-orders-success-ink' : sa.status === 'partial' ? 'bg-orders-warning-soft text-orders-warning-ink' : 'bg-orders-danger-soft text-orders-danger-ink';
  return (
    <button type="button" aria-label={`Manage stock adjustment for order ${order.number}`} onClick={(e) => { e.stopPropagation(); void p.openStockAdjustmentModal(order); }} className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums cursor-pointer hover:opacity-80 ${tone}`}>
      {sa.managedCount}/{sa.totalCount}
    </button>
  );
}

function FulfilmentCell({ order }: { order: OrderRow }) {
  const info = getFulfillmentInfo(order);
  if (info.length === 0) return <span className="text-orders-border-strong">-</span>;
  const first = info[0];
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="truncate text-[11px] font-semibold text-orders-text">{first.date ? formatFulfillmentDate(first.date) : ''}{info.length > 1 && <b className="ml-1 text-orders-primary">+{info.length - 1}</b>}</span>
      <span className="truncate text-[10.5px] text-orders-text-muted">
        {first.carrier}{first.carrier && first.trackingNumber ? ' · ' : ''}
        {first.trackingUrl ? <a href={first.trackingUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-orders-primary hover:underline">{first.trackingNumber}</a> : first.trackingNumber}
      </span>
    </span>
  );
}

function PackedCell({ order }: { order: OrderRow }) {
  const pct = order.totalQuantity > 0 ? Math.round((order.packedQuantity / order.totalQuantity) * 100) : 0;
  const bar = order.packingStatus === 'packed' ? 'bg-orders-success' : order.packingStatus === 'partially_packed' ? 'bg-orders-warning' : 'bg-orders-border-strong';
  return (
    <span className="flex items-center gap-1.5">
      <b className="text-[11.5px] tabular-nums text-orders-text">{order.packedQuantity}/{order.totalQuantity}</b>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-orders-canvas"><i className={`block h-full ${bar}`} style={{ width: `${pct}%` }} /></span>
    </span>
  );
}

function StoreChip({ name }: { name: string }) {
  const { code, hue } = getStoreChip(name);
  return (
    <span title={name} className="inline-flex h-4 w-fit items-center gap-1 rounded-[5px] border border-orders-border bg-orders-surface-muted px-1.5 text-[9.5px] font-bold text-orders-text-muted">
      <i className="h-1.5 w-1.5 rounded-full" style={{ background: hue }} />{code}
    </span>
  );
}

function DecoCell({ order, p }: { order: OrderRow; p: OrdersPageBundle }) {
  if (p.caps.packedDate) {
    const last = (order.packingConfirmations ?? []).find((c) => !c.canceledAt);
    return <span className="text-[10.5px] text-orders-text-muted tabular-nums">{last ? dateTime(last.confirmedAt) : '-'}</span>;
  }
  const badges = getDecorationStatusBadges(order);
  const short = p.caps.stock && !isOrderFullyFulfilled(order) ? countShortLines(order) : 0;
  if (badges.length === 0 && short === 0) return <span className="text-orders-border-strong">-</span>;
  return (
    <span className="flex flex-wrap items-center gap-0.5">
      {short > 0 && <Badge tone="warn" title="Lines not covered by available hub stock">Short {short}</Badge>}
      {badges.map((b) => <Badge key={b.label} tone={b.label.includes('Emb') ? 'emb' : 'prt'}>{b.label}</Badge>)}
    </span>
  );
}

export default function QueueRow({ p, order, isExpanded }: { p: OrdersPageBundle; order: OrderRow; isExpanded: boolean }) {
  const { caps } = p;
  const status = order.status.toLowerCase();
  const fulfilled = isOrderFullyFulfilled(order);
  return (
    <div
      role="row"
      onClick={() => p.toggleExpanded(order.id)}
      className={`grid cursor-pointer items-center gap-x-1.5 border-b border-orders-border px-2.5 py-1.5 text-[11.5px] transition-colors ${isExpanded ? 'relative z-[1] ring-[1.5px] ring-inset ring-orders-primary' : ''} ${p.selectedLabelIds.has(order.id) && getRowTone(order, caps).includes('bg-orders-surface ') ? 'bg-orders-primary-soft' : getRowTone(order, caps)}`}
      style={{ gridTemplateColumns: getGridColumns(caps) }}
    >
      <span onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={p.selectedLabelIds.has(order.id)} onChange={() => p.toggleLabelSelected(order.id)} aria-label={`Select order ${order.number}`} className="h-3.5 w-3.5 rounded border-orders-border-strong text-orders-primary cursor-pointer" />
      </span>
      <span className="flex flex-col leading-tight">
        <b className={`font-mono text-[12px] ${order.labelPrintedAt && caps.labels ? 'text-orders-success-ink' : 'text-orders-text'}`}>#{order.number}</b>
        <span className="text-[10px] text-orders-text-subtle">{order.orderedAt ? dateTime(order.orderedAt) : ''}</span>
      </span>
      <StoreChip name={order.storeName} />
      <span className="flex min-w-0 flex-col leading-tight">
        <b className="truncate text-[12px] font-semibold text-orders-text">{order.customer}</b>
        <span className="flex flex-wrap items-center gap-1">
          {(order.canceled || status === 'canceled') && <Badge tone="bad">Canceled</Badge>}
          {order.closed && !order.canceled && !fulfilled && <Badge>Closed</Badge>}
          {caps.requestStock && order.backInStockStatus && !fulfilled && <Badge tone="warn">{formatStockStatus(order.backInStockStatus)}</Badge>}
          {caps.labels && order.labelPrintedAt && <Badge tone="emb">Label printed</Badge>}
          {caps.slip && order.slipPrinted && order.packingStatus !== 'packed' && <Badge tone="ok">Slip printed</Badge>}
        </span>
      </span>
      {caps.admin && <span onClick={(e) => e.stopPropagation()}><StockAdjButton p={p} order={order} /></span>}
      <Thumbs order={order} />
      <StageTrack order={order} caps={caps} />
      {caps.fulfilment && <FulfilmentCell order={order} />}
      <PackedCell order={order} />
      {(caps.decoration || caps.packedDate) && <DecoCell order={order} p={p} />}
      <span onClick={(e) => e.stopPropagation()}><IconButton icon="note" label="Order notes" count={order.noteCount} onClick={() => void p.openNoteModal(order)} /></span>
      <span onClick={(e) => e.stopPropagation()}><RowActions p={p} order={order} isExpanded={isExpanded} /></span>
    </div>
  );
}
