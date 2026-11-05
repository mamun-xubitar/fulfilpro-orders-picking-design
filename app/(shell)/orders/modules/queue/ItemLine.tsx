'use client';

import { Icon } from './icons';
import type { OrderItem, OrderRow, OrderStockAdjustmentItem } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { getFulfilledQty, getNameAttribute, isOrderFulfillmentLocked, nameKey, rowItemKey } from '../utils';
import { getRemainingToPack } from '../slipDocument';
import { getItemColour, getOtherOptions, getShopifyAdminUrl, getSwatchColour, getThumbnailUrl } from './queueUtils';
import { lineGap, lineGridTemplate, type LineColumnDef } from './lineColumns';
import { AvailCell, PoCell } from './StockCells';
import { DecoCell, DecoratorCell } from './LineDeco';
import Badge from './Badge';

type Props = { p: OrdersPageBundle; order: OrderRow; item: OrderItem; index: number; restockItems: OrderStockAdjustmentItem[]; cols: LineColumnDef[] };

const dayTime = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

function Tile({ item }: { item: OrderItem }) {
  return item.imageUrl
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={getThumbnailUrl(item.imageUrl, 64)} alt="" loading="lazy" className="h-[26px] w-[26px] shrink-0 rounded-md border border-orders-border bg-orders-canvas object-cover" />
    : <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border border-orders-border bg-orders-canvas text-[10px] font-bold text-orders-text-subtle">{item.name.slice(0, 1).toUpperCase()}</span>;
}

function ItemCell({ p, order, item, restock }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem; restock?: OrderStockAdjustmentItem }) {
  const colour = getItemColour(item);
  const other = getOtherOptions(item);
  const url = p.caps.stock ? getShopifyAdminUrl(order, item) : null;
  const nameAttr = getNameAttribute(item);
  const key = nameKey(order.id, item.id);
  const checked = nameAttr ? p.isNameChecked(key) : false;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Tile item={item} />
      <span className="flex min-w-0 flex-col gap-px">
        <span className="flex min-w-0 items-center gap-1">
          <b className="truncate text-[11.5px] font-bold text-orders-text" title={`${item.name}${item.sku ? ` · ${item.sku}` : ''}`}>{item.name}</b>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" title="Open product in Shopify admin" aria-label={`Open ${item.name} in Shopify admin`} onClick={(e) => e.stopPropagation()} className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-orders-primary-ink hover:bg-orders-primary-soft"><Icon name="external" className="h-2.5 w-2.5" /></a>
          )}
        </span>
        {(colour || other) && (
          <span className="flex min-w-0 items-center gap-1 text-[10px] text-orders-text-subtle">
            {colour && <span className="inline-flex items-center gap-1 text-orders-text-muted"><i className="inline-block h-[9px] w-[9px] shrink-0 rounded-full border border-[rgba(17,24,39,.35)]" style={{ background: getSwatchColour(colour) }} />{colour}</span>}
            {other && <span className="truncate">{colour ? '· ' : ''}{other}</span>}
          </span>
        )}
        {(nameAttr || restock) && (
          <span className="mt-px flex items-center gap-1">
            {nameAttr && (
              <label className="inline-flex h-[15px] cursor-pointer items-center gap-1 whitespace-nowrap rounded-[4px] border border-orders-border-strong bg-orders-surface-muted px-1 text-[9.5px] font-bold text-orders-text-muted" title={'Custom attribute "name". Tick to include in the name export'}>
                <input type="checkbox" checked={checked} onChange={() => p.setNamesChecked([{ key, row: { orderNumber: String(order.number), productTitle: item.title ?? item.name, value: nameAttr.value } }], !checked)} className="h-2.5 w-2.5 cursor-pointer rounded-sm border-orders-border-strong text-orders-primary" />
                {nameAttr.name}: {nameAttr.value}
              </label>
            )}
            {restock && <Badge tone={restock.managed ? 'ok' : 'warn'}>Restock {restock.managed ? restock.quantity : 0}/{restock.quantity}</Badge>}
          </span>
        )}
      </span>
    </span>
  );
}

function Stepper({ p, order, item, index, selectable, partial, isFull }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem; index: number; selectable: number; partial: number; isFull: boolean }) {
  const off = isFull || selectable === 0;
  const set = (value: number) => p.validPartial(order.id, index, selectable, String(value));
  const btn = 'h-full w-[22px] text-[13px] font-bold leading-none text-orders-text-muted hover:bg-orders-divider disabled:cursor-not-allowed cursor-pointer';
  return (
    <span className={`inline-flex h-6 items-center justify-self-end overflow-hidden rounded-[7px] border border-orders-border-strong bg-orders-surface ${off ? 'bg-orders-surface-muted opacity-50' : ''}`}>
      <button type="button" aria-label={`Decrease partial quantity for ${item.name}`} disabled={off || partial <= 0} onClick={() => set(partial - 1)} className={btn}>−</button>
      <input type="number" min={0} max={selectable} value={partial} disabled={off} aria-label={`Partial quantity for ${item.name}`} onChange={(e) => p.validPartial(order.id, index, selectable, e.target.value)} className="h-[22px] min-w-6 w-6 border-x border-orders-border bg-transparent text-center text-[11.5px] font-bold tabular-nums outline-none [appearance:textfield] disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none" />
      <button type="button" aria-label={`Increase partial quantity for ${item.name}`} disabled={off || partial >= selectable} onClick={() => set(partial + 1)} className={btn}>+</button>
    </span>
  );
}

function LineActions({ p, order, item }: { p: OrdersPageBundle; order: OrderRow; item: OrderItem }) {
  const locked = isOrderFulfillmentLocked(order);
  const fulfilled = getFulfilledQty(order, item.id);
  const why = 'Order is closed or canceled';
  const editOff = locked || fulfilled >= item.qty;
  const delOff = locked || fulfilled > 0;
  const cls = 'flex h-[22px] w-[22px] items-center justify-center rounded-md hover:bg-orders-divider disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer';
  return (
    <span className="flex items-center justify-center">
      <button type="button" disabled={editOff} title={locked ? why : fulfilled >= item.qty ? 'Fully fulfilled' : 'Edit line item'} aria-label="Edit line item" onClick={() => p.openEditLineItemModal(order, item)} className={`${cls} text-[#3b82f6]`}><Icon name="pencil" className="h-3.5 w-3.5" /></button>
      <button type="button" disabled={delOff} title={locked ? why : fulfilled > 0 ? 'Partially fulfilled. Cancel the fulfilment first' : 'Remove line item'} aria-label="Remove line item" onClick={() => p.openDeleteLineItemModal(order, item)} className={`${cls} text-[#ef4444]`}><Icon name="trash" className="h-3.5 w-3.5" /></button>
    </span>
  );
}

export default function ItemLine({ p, order, item, index, restockItems, cols }: Props) {
  const { caps } = p;
  const fulfilled = getFulfilledQty(order, item.id);
  const remainingFul = Math.max(0, item.qty - fulfilled);
  const remainingPack = getRemainingToPack(item);
  const selectable = caps.pack && !caps.fulfilment ? remainingPack : caps.fulfilment && !caps.pack ? remainingFul : Math.max(remainingPack, remainingFul);
  const isFull = p.isLineFullChecked(order, item, index);
  const partial = Math.min(selectable, Math.max(0, p.partialValues[rowItemKey(order.id, index)] ?? 0));
  const packed = item.packedQuantity ?? 0;
  const done = item.qty > 0 && packed >= item.qty;
  const part = packed > 0 && !done;
  const restock = restockItems.find((r) => r.lineItemId === item.id);
  const picked = caps.fulfilment && selectable > 0 && (isFull || partial > 0);
  const cell: Record<string, React.ReactNode> = {
    item: <ItemCell p={p} order={order} item={item} restock={restock} />,
    sku: <span className="block truncate font-mono text-[10px] text-orders-text-muted" title={item.sku || undefined}>{item.sku || '-'}</span>,
    deco: <DecoCell p={p} order={order} item={item} />,
    qty: <b className="text-center tabular-nums" title={caps.fulfilment ? `${fulfilled} of ${item.qty} fulfilled` : undefined}>{caps.fulfilment ? `${fulfilled}/${item.qty}` : item.qty}</b>,
    packed: <b className={`text-center tabular-nums ${done ? 'text-orders-success-ink' : part ? 'text-orders-warning-ink' : 'text-orders-text-subtle'}`}>{packed}/{item.qty}</b>,
    pdate: <span className="text-[10.5px] text-orders-text-subtle tabular-nums">{item.packedDate ? dayTime(item.packedDate) : '-'}</span>,
    avail: <AvailCell order={order} item={item} />,
    po: <PoCell p={p} order={order} item={item} />,
    decorator: <DecoratorCell p={p} order={order} item={item} />,
    full: <input type="checkbox" checked={isFull} disabled={selectable === 0} title={selectable === 0 ? 'Nothing left to select' : 'Select the whole remaining quantity'} onChange={() => p.toggleFull(order.id, index, selectable)} className="h-[13px] w-[13px] cursor-pointer rounded-[3px] border-orders-border-strong text-orders-primary disabled:cursor-not-allowed disabled:opacity-40" />,
    partial: <Stepper p={p} order={order} item={item} index={index} selectable={selectable} partial={partial} isFull={isFull} />,
    actions: <LineActions p={p} order={order} item={item} />,
  };
  const centered = new Set(['qty', 'packed', 'avail', 'full', 'actions', 'pdate']);
  return (
    <div role="row" className={`group grid min-h-[34px] items-center border-b border-orders-divider px-2 text-[11.5px] last:border-b-0 ${picked ? 'bg-orders-primary-soft' : done ? 'bg-orders-line-done' : part ? 'bg-orders-warning-soft' : ''}`} style={{ gridTemplateColumns: lineGridTemplate(cols), columnGap: lineGap(caps) }}>
      {cols.map((c) => <span key={c.key} className={`min-w-0 ${centered.has(c.key) ? 'flex justify-center' : ''}`}>{cell[c.key]}</span>)}
    </div>
  );
}
