'use client';

/* eslint-disable @next/next/no-img-element */

import { Fragment, type Dispatch, type SetStateAction } from 'react';
import { formatShippingMoney, getShippingDiscountCodes, getShippingLineFinalPrice } from '../../orders/modules/utils';
import { type PickingOrder, type PickingItem, rowItemKey, getRemaining, clampNumber, formatDateTime, getVariantText } from './usePickingListPage';

type OrderRowProps = {
  order: PickingOrder;
  isAdmin: boolean;
  isPicker: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  fullChecks: Record<string, boolean>;
  partialValues: Record<string, number>;
  refreshingIds: Record<string, boolean>;
  setFullChecks: Dispatch<SetStateAction<Record<string, boolean>>>;
  setPartialValues: Dispatch<SetStateAction<Record<string, number>>>;
  setOrderFullChecks: (order: PickingOrder, checked: boolean) => void;
  onSelect: () => void;
  onToggleExpand: () => void;
  onOpenNote: (order: PickingOrder) => void;
  onOpenMessage: (order: PickingOrder) => void;
  onOpenPrint: (orders: PickingOrder[]) => void;
  onRefresh: (order: PickingOrder) => void;
  onConfirmPacked: (order: PickingOrder) => void;
  onCancelPacked: (order: PickingOrder, confirmationId?: string) => void;
};

export default function OrderRow({ order, isAdmin, isPicker, isExpanded, isSelected, fullChecks, partialValues, refreshingIds, setFullChecks, setPartialValues, setOrderFullChecks, onSelect, onToggleExpand, onOpenNote, onOpenMessage, onOpenPrint, onRefresh, onConfirmPacked, onCancelPacked }: OrderRowProps) {
  const isAllPacked = order.packingStatus === 'packed' || (order.totalQuantity > 0 && order.packedQuantity >= order.totalQuantity);
  const canConfirmPacked = !order.closed && !order.canceled && order.packedQuantity < order.totalQuantity;

  const rowClass = (() => {
    if (isSelected) return 'border-b border-blue-500 bg-blue-100 hover:bg-blue-200';
    if (order.canceled) return 'border-b border-red-500 bg-red-100 hover:bg-red-200';
    if (order.closed) return 'border-b border-gray-500 bg-gray-100 hover:bg-gray-200';
    if (order.packingStatus === 'packed') return 'border-b border-blue-500 bg-blue-100 hover:bg-blue-200';
    if (order.packingStatus === 'partially_packed') return 'border-b border-amber-500 bg-amber-100 hover:bg-amber-200';
    return 'border-b border-gray-100 hover:bg-gray-50';
  })();

  return (
    <Fragment>
      <tr className={`${rowClass} transition-colors duration-100`}>
        <td className="px-3 py-3"><input type="checkbox" checked={isSelected} onChange={onSelect} className="rounded border-gray-300 text-blue-600" /></td>
        <td className="px-3 py-3 font-mono font-medium text-gray-900">{order.number}</td>
        <td className="px-3 py-3 text-gray-600">{order.storeName}</td>
        <td className="px-3 py-3 text-gray-700">{order.customer}</td>
        <td className="px-3 py-3 text-gray-600">{formatDateTime(order.orderedAt)}</td>
        <td className="px-3 py-3"><StatusChips order={order} isAdmin={isAdmin} /></td>
        <td className="px-3 py-3 font-medium text-gray-700">{order.packedQuantity}/{order.totalQuantity}</td>
        <td className="px-3 py-3 text-gray-600">{order.lastPackedAt ? formatDateTime(order.lastPackedAt) : '-'}</td>
        <td className="px-3 py-3 text-center">
          <div className="tooltip inline-flex">
            <button onClick={(e) => { e.stopPropagation(); void onOpenNote(order); }} className="relative inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600" aria-label={`Notes for ${order.number}`}>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4h10a2 2 0 012 2v14l-4-3H7a2 2 0 01-2-2V6a2 2 0 012-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8M8 12h5" /></svg>
              {order.noteCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">{order.noteCount > 99 ? '99+' : order.noteCount}</span>}
            </button>
            <span className="tt">Order Notes</span>
          </div>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1">
            <div className="tooltip"><button onClick={(e) => { e.stopPropagation(); onToggleExpand(); }} className="cursor-pointer rounded-lg p-2 text-lg font-medium text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600" aria-label={`${isExpanded ? 'Hide' : 'View'} details for ${order.number}`}>{isExpanded ? '▲' : '▼'}</button><span className="tt">View Details</span></div>
            <div className="tooltip"><button onClick={(e) => { e.stopPropagation(); onOpenPrint([order]); }} disabled={isAllPacked} className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500" aria-label={`Print picking slip for ${order.number}`}><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button><span className="tt">Print Picking Slip</span></div>
            <div className="tooltip"><button onClick={(e) => { e.stopPropagation(); void onOpenMessage(order); }} disabled={isAllPacked} className="relative cursor-pointer rounded-lg p-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500" aria-label={`Messages for ${order.number}`}><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.4-3.5A7.5 7.5 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>{order.messageCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">{order.messageCount > 99 ? '99+' : order.messageCount}</span>}</button><span className="tt">Messages</span></div>
            <div className="tooltip"><button onClick={(e) => { e.stopPropagation(); void onRefresh(order); }} disabled={isAllPacked || refreshingIds[order.id]} className="cursor-pointer rounded-lg p-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-gray-500" aria-label={`Refresh ${order.number}`}><svg className={`h-6 w-6 ${refreshingIds[order.id] ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button><span className="tt">Refresh Order</span></div>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={10} className="border-b border-gray-200 bg-gray-50 p-3 sm:p-5">
            <div className={`grid w-[calc(100vw-2.5rem)] min-w-0 max-w-full gap-3 sm:w-[calc(100vw-4rem)] sm:gap-5 lg:w-full ${isPicker ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,260px)]' : 'lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,260px)]'}`}>
              {!isPicker && <CustomerSection order={order} />}
              <ItemsSection order={order} isAdmin={isAdmin} fullChecks={fullChecks} partialValues={partialValues} setFullChecks={setFullChecks} setPartialValues={setPartialValues} setOrderFullChecks={setOrderFullChecks} />
              <ActionsSection order={order} canConfirmPacked={canConfirmPacked} onConfirmPacked={onConfirmPacked} onCancelPacked={onCancelPacked} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function CustomerSection({ order }: { order: PickingOrder }) {
  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">Customer Details</h3>
      <div className="space-y-1 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">{order.customer}</p>
        {[order.address, order.address2, order.city, order.state, order.zip, order.country].filter(Boolean).map((line, i) => <p key={`addr-${i}`}>{line}</p>)}
        {order.shippingLines.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase text-gray-400">Delivery Method</h4>
            {order.shippingLines.map((line, i) => {
              const finalPrice = getShippingLineFinalPrice(line);
              const isFree = finalPrice <= 0;
              const codes = getShippingDiscountCodes(line);
              return (
                <div key={`ship-${line.id || i}`} className="min-w-0 rounded-md border border-blue-100 bg-white/70 px-2.5 py-2 text-xs text-gray-600">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-gray-800">{line.title || line.code || 'Shipping'}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{isFree ? 'Free' : 'Paid'}</span>
                    {codes.map((code, ci) => <span key={`code-${ci}`} className="rounded-full bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700">{code}</span>)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                    <span>Price: {formatShippingMoney(line.price, line.currencyCode)}</span>
                    <span>Discounted: {formatShippingMoney(finalPrice, line.currencyCode)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {order.note && <p className="mt-3 whitespace-pre-wrap rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{order.note}</p>}
      </div>
    </section>
  );
}

function ItemsSection({ order, isAdmin, fullChecks, partialValues, setFullChecks, setPartialValues, setOrderFullChecks }: { order: PickingOrder; isAdmin: boolean; fullChecks: Record<string, boolean>; partialValues: Record<string, number>; setFullChecks: Dispatch<SetStateAction<Record<string, boolean>>>; setPartialValues: Dispatch<SetStateAction<Record<string, number>>>; setOrderFullChecks: (order: PickingOrder, checked: boolean) => void }) {
  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">Order Items</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-xs md:min-w-[760px]">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 text-left font-medium">Item</th><th className="py-2 text-left font-medium">SKU</th>
              <th className="py-2 text-center font-medium">Qty</th><th className="py-2 text-center font-medium">Packed</th>
              <th className="py-2 text-left font-medium">Packed Date</th>
              {isAdmin && <th className="py-2 text-center font-medium">Fulfilled</th>}
              <th className="py-2 text-left font-medium">
                <label className="inline-flex cursor-pointer items-center justify-start gap-1.5">
                  <input type="checkbox" checked={order.items.some((i) => getRemaining(i) > 0) && order.items.every((item, idx) => getRemaining(item) === 0 || Boolean(fullChecks[rowItemKey(order.id, idx)]))} disabled={!order.items.some((i) => getRemaining(i) > 0)} onChange={(e) => setOrderFullChecks(order, e.target.checked)} className="cursor-pointer rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50" />
                  <span>Full</span>
                </label>
              </th>
              <th className="py-2 text-center font-medium">Partial</th>
            </tr>
          </thead>
          <tbody>
            {order.items.filter((item) => item.fulfilledQuantity < item.qty).map((item, itemIndex) => {
              const key = rowItemKey(order.id, itemIndex);
              const remaining = getRemaining(item);
              const isFull = Boolean(fullChecks[key]);
              const partialVal = partialValues[key] ?? 0;
              const itemClass = (() => {
                if (item.packedQuantity >= item.qty && item.qty > 0) return 'border-b border-emerald-200 bg-emerald-100';
                if ((isFull || partialVal >= remaining) && remaining > 0) return 'border-b border-blue-200 bg-blue-100';
                if (partialVal > 0) return 'border-b border-pink-200 bg-pink-100';
                if (item.packedQuantity > 0) return 'border-b border-purple-200 bg-purple-100';
                return 'border-b border-gray-300';
              })();
              return (
                <tr key={`${order.id}-item-${item.id}-${itemIndex}`} className={`${itemClass} transition-colors duration-100`}>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 overflow-hidden rounded border border-gray-200 bg-gray-100">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : null}</div>
                      <div className="min-w-0"><div className="break-words font-medium text-gray-800">{item.name}</div>{getVariantText(item) && <div className="break-words text-gray-400">{getVariantText(item)}</div>}</div>
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-gray-500">{item.sku || '-'}</td>
                  <td className="py-2 text-center text-gray-700">{item.qty}</td>
                  <td className="py-2 text-center text-gray-700">{item.packedQuantity}/{item.qty}</td>
                  <td className="py-2 text-gray-600">{item.packedDate ? formatDateTime(item.packedDate) : '-'}</td>
                  {isAdmin && <td className="py-2 text-center"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.fulfilledQuantity >= item.qty ? 'bg-green-100 text-green-700' : item.fulfilledQuantity > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{item.fulfilledQuantity}/{item.qty}</span></td>}
                  <td className="py-2 text-left"><input type="checkbox" checked={Boolean(fullChecks[key])} disabled={remaining === 0} onChange={(e) => { setFullChecks((p) => ({ ...p, [key]: e.target.checked })); setPartialValues((p) => ({ ...p, [key]: e.target.checked ? remaining : 0 })); }} className="cursor-pointer rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed disabled:opacity-50" /></td>
                  <td className="py-2 text-center"><input type="number" min={0} max={remaining} value={Math.min(remaining, partialValues[key] ?? 0)} disabled={remaining === 0 || Boolean(fullChecks[key])} onChange={(e) => setPartialValues((p) => ({ ...p, [key]: clampNumber(e.target.value, remaining) }))} className="w-16 rounded border border-gray-300 px-2 py-1 text-center disabled:bg-gray-100" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionsSection({ order, canConfirmPacked, onConfirmPacked, onCancelPacked }: { order: PickingOrder; canConfirmPacked: boolean; onConfirmPacked: (order: PickingOrder) => void; onCancelPacked: (order: PickingOrder, id?: string) => void }) {
  return (
    <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase text-gray-500">Actions</h3>
      <button onClick={() => onConfirmPacked(order)} disabled={!canConfirmPacked} className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400">Confirm packed</button>
      <div className="mt-4 space-y-2 text-xs text-gray-500">
        {order.packingConfirmations.filter((c) => !c.canceledAt).length === 0 ? <p>No packing history.</p> : order.packingConfirmations.filter((c) => !c.canceledAt).slice(0, 5).map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 rounded border border-gray-200 p-2">
            <div><div className="font-medium text-gray-700">Packed {formatDateTime(c.confirmedAt)}</div><div>{c.lines.reduce((s, l) => s + l.quantity, 0)} item(s)</div></div>
            <button type="button" onClick={() => onCancelPacked(order, c.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700" aria-label={`Cancel packed confirmation from ${formatDateTime(c.confirmedAt)}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 4v6m4-6v6m5-10l-1 13a1 1 0 01-1 .9H8a1 1 0 01-1-.9L6 7" /></svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusChips({ order, isAdmin }: { order: PickingOrder; isAdmin: boolean }) {
  const packClass = order.packingStatus === 'packed' ? 'bg-green-100 text-green-700 border-green-200' : order.packingStatus === 'partially_packed' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200';
  const packLabel = order.packingStatus === 'packed' ? 'Packed' : order.packingStatus === 'partially_packed' ? 'Partial Packed' : 'Pending';
  const fulfillmentClass = order.fulfillmentStatus === 'fulfilled' ? 'bg-green-100 text-green-700 border-green-200' : order.fulfillmentStatus === 'partial' ? 'bg-amber-100 text-amber-800 border-amber-200' : '';
  const fulfillmentLabel = order.fulfillmentStatus === 'fulfilled' ? 'Fulfilled' : order.fulfillmentStatus === 'partial' ? 'Partial Fulfilled' : '';
  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${packClass}`}>{packLabel}</span>
      {isAdmin && fulfillmentLabel && <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${fulfillmentClass}`}>{fulfillmentLabel}</span>}
      {order.printed && <span className="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Slip Printed</span>}
      {(order.canceled || order.closed) && <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${order.canceled ? 'border-red-200 bg-red-100 text-red-700' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>{order.canceled ? 'Canceled' : 'Closed'}</span>}
    </div>
  );
}
