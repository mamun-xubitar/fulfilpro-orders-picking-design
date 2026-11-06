'use client';

import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { formatFulfillmentDate, formatStockStatus, getFulfillmentInfo, isOrderFullyFulfilled } from '../utils';
import { STATUS_MAP } from '../constants';
import { formatPlaced, getDecoProgress, getGridColumns, getRowTone, getStoreChip, getThumbnailUrl } from './queueUtils';
import Badge, { type BadgeTone } from './Badge';
import { Icon } from './icons';
import StageTrack from './StageTrack';
import RowActions from './RowActions';

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

/** Packed count and bar, then (Admin, Staff) the first parcel's date and carrier · tracking. */
function PackedFulfilmentCell({ order, withFulfilment }: { order: OrderRow; withFulfilment: boolean }) {
  const pct = order.totalQuantity > 0 ? Math.round((order.packedQuantity / order.totalQuantity) * 100) : 0;
  const bar = order.packedQuantity >= order.totalQuantity && order.totalQuantity > 0 ? 'bg-orders-primary' : order.packedQuantity > 0 ? 'bg-orders-warning' : 'bg-orders-primary';
  const info = withFulfilment ? getFulfillmentInfo(order) : [];
  const first = info[0];
  return (
    <span className="flex min-w-0 flex-col justify-center gap-px">
      <span className="flex items-center gap-1.5">
        <b className="tabular-nums">{order.packedQuantity}/{order.totalQuantity}</b>
        <span className="h-1 w-6 overflow-hidden rounded-sm bg-orders-border"><i className={`block h-full ${bar}`} style={{ width: `${pct}%` }} /></span>
      </span>
      {first && (
        <>
          <span className="max-w-full truncate text-[10.5px] font-bold text-orders-text">{first.date ? formatFulfillmentDate(first.date) : ''}{info.length > 1 && <span className="ml-1 font-normal text-orders-text-subtle">+{info.length - 1}</span>}</span>
          <span className="max-w-full truncate text-[10px] text-orders-text-subtle">
            {first.carrier}{first.carrier && first.trackingNumber ? ' · ' : ''}
            {first.trackingUrl ? <a href={first.trackingUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-orders-primary hover:underline">{first.trackingNumber}</a> : <span className="text-orders-primary">{first.trackingNumber}</span>}
          </span>
        </>
      )}
    </span>
  );
}

type StatusChip = { key: string; tone: BadgeTone; title: string; node: React.ReactNode };

function getStatusChips(order: OrderRow, p: OrdersPageBundle): StatusChip[] {
  const { caps } = p;
  const fulfilled = isOrderFullyFulfilled(order);
  const chips: StatusChip[] = [];
  const map = STATUS_MAP[order.status.toLowerCase()] ?? STATUS_MAP.pending;
  if (order.canceled) chips.push({ key: 'canceled', tone: 'bad', title: 'Order canceled', node: 'Canceled' });
  else if (order.closed) chips.push({ key: 'closed', tone: 'neutral', title: 'Order closed in Shopify', node: 'Closed' });
  else {
    const key = order.status.toLowerCase();
    const tone: BadgeTone = key === 'fulfilled' || key === 'shipped' ? 'solid' : key === 'partial' || key === 'partially_fulfilled' ? 'warn' : 'outline';
    chips.push({ key: 'status', tone, title: map.label, node: map.label });
  }
  if (order.packingStatus === 'packed') chips.push({ key: 'packed', tone: 'ok', title: 'Every line packed', node: 'Packed' });
  else if (order.packingStatus === 'partially_packed') chips.push({ key: 'partial-packed', tone: 'warn', title: 'Some lines packed', node: 'Partial Packed' });
  if (caps.slipStatus && order.slipPrinted) chips.push({ key: 'slip', tone: 'ok', title: 'Picking slip printed', node: <><Icon name="printer" className="h-2.5 w-2.5" />Slip printed</> });
  if (caps.labels && order.labelPrintedAt) chips.push({ key: 'label', tone: 'ok', title: 'Shipping label printed', node: <><Icon name="tag" className="h-2.5 w-2.5" />Label</> });
  const track = caps.fulfilment ? order.trackings?.[0]?.status : null;
  if (track) chips.push({ key: 'track', tone: track === 'Delivered' ? 'ok' : 'info', title: `17track: ${track}`, node: track });
  if (caps.requestStock && order.backInStockStatus && !fulfilled) chips.push({ key: 'restock', tone: order.backInStockStatus === 'back_in_stock' ? 'ok' : 'warn', title: 'Back-in-stock request', node: formatStockStatus(order.backInStockStatus) });
  if (caps.decoration) {
    for (const d of getDecoProgress(order)) {
      chips.push({ key: d.key, tone: d.tone, title: `${d.label} decorated${d.assignees ? ` · ${d.assignees} decorator${d.assignees > 1 ? 's' : ''}` : ''}`, node: <>{d.label}{d.assignees > 0 && <i className="ml-0.5 inline-flex h-3 min-w-3 items-center justify-center rounded-full bg-white/75 px-[3px] text-[8.5px] not-italic" title="Decorators assigned">{d.assignees}</i>}</> });
    }
  }
  return chips;
}

/** Status column (was Decoration): the old Orders page's badges plus slip, tracking and decoration state, two per line.
 * Order Picker sees the date of the last packing instead. */
function StatusCell({ order, p }: { order: OrderRow; p: OrdersPageBundle }) {
  if (p.caps.packedDate) {
    const last = (order.packingConfirmations ?? []).find((c) => !c.canceledAt);
    return <span className="text-[10.5px] tabular-nums text-orders-text-subtle">{last ? new Date(last.confirmedAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>;
  }
  const chips = getStatusChips(order, p);
  const lines = Array.from({ length: Math.ceil(chips.length / 2) }, (_, i) => chips.slice(i * 2, i * 2 + 2));
  return (
    <span className="flex min-w-0 flex-col items-start gap-0.5">
      {lines.map((line, i) => <span key={i} className="flex min-w-0 max-w-full gap-[3px]">{line.map((c) => <Badge key={c.key} tone={c.tone} title={c.title}>{c.node}</Badge>)}</span>)}
    </span>
  );
}

export default function QueueRow({ p, order, isExpanded }: { p: OrdersPageBundle; order: OrderRow; isExpanded: boolean }) {
  const { caps } = p;
  const canceled = order.canceled;
  const selected = p.selectedLabelIds.has(order.id);
  const tone = getRowTone(order, caps);
  const plain = tone.includes('bg-orders-surface ');
  const bg = isExpanded && plain ? 'bg-orders-surface' : selected && plain ? 'bg-orders-primary-soft' : tone;
  return (
    <div
      role="row"
      onClick={() => p.toggleExpanded(order.id)}
      className={`grid min-h-10 cursor-pointer items-center gap-x-2 px-2.5 py-1 text-[11.5px] ${canceled ? 'text-orders-text-subtle' : 'text-orders-text-body'} ${isExpanded ? 'relative shadow-[inset_0_0_0_1.5px_var(--orders-primary)]' : ''} ${bg}`}
      style={{ gridTemplateColumns: getGridColumns(caps) }}
    >
      <span onClick={(e) => e.stopPropagation()} className="flex">
        <input type="checkbox" checked={selected} onChange={() => p.toggleLabelSelected(order.id)} aria-label={`Select order ${order.number}`} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary" />
      </span>
      <span className="flex min-w-0 flex-col items-start justify-center gap-px">
        <span className="flex min-w-0 items-center gap-[5px] whitespace-nowrap">
          <b className={`tabular-nums ${canceled ? 'text-orders-text-subtle line-through' : caps.labels && order.labelPrintedAt ? 'text-orders-success-ink' : 'text-orders-text'}`}>#{order.number}</b>
          {caps.packedDate && order.closed && !canceled && <Badge title="Order closed in Shopify">Closed</Badge>}
          {caps.packedDate && canceled && <Badge>Canceled</Badge>}
        </span>
        <span className="max-w-full truncate text-[10px] text-orders-text-subtle">{formatPlaced(order.orderedAt)}</span>
      </span>
      <StoreChip name={order.storeName} />
      <b className="truncate text-[11.5px] font-bold text-orders-text">{order.customer}</b>
      {caps.admin && <StockAdjCell p={p} order={order} />}
      <Thumbs order={order} />
      <StageTrack order={order} caps={caps} />
      <PackedFulfilmentCell order={order} withFulfilment={caps.fulfilment} />
      <StatusCell order={order} p={p} />
      <span onClick={(e) => e.stopPropagation()}><RowActions p={p} order={order} isExpanded={isExpanded} /></span>
    </div>
  );
}
