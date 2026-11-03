'use client';

import type { MouseEvent, ReactNode } from 'react';
import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { isOrderFullyFulfilled } from '../utils';
import { Icon, type IconName } from './icons';

type IconButtonProps = {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Green once the document has been printed. */
  printed?: boolean;
  spinning?: boolean;
  count?: number;
  tone?: string;
  children?: ReactNode;
};

export function IconButton({ icon, label, onClick, disabled, printed, spinning, count, tone }: IconButtonProps) {
  const color = disabled ? 'text-orders-border-strong' : printed ? 'text-orders-success' : tone ?? 'text-orders-text-subtle hover:text-orders-primary';
  const handle = (e: MouseEvent) => { e.stopPropagation(); onClick(); };
  return (
    <button type="button" title={label} aria-label={label} onClick={handle} disabled={disabled} className={`relative flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed cursor-pointer ${printed && !disabled ? 'bg-orders-success-soft' : 'hover:bg-orders-canvas'} ${color}`}>
      <Icon name={icon} className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
      {printed && !disabled && <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-orders-success text-white"><Icon name="check" className="h-2 w-2" /></span>}
      {!!count && count > 0 && <span className="absolute -right-1 -top-1 min-w-3.5 rounded-full bg-orders-primary px-1 text-center text-[9px] font-bold leading-3.5 text-white">{count > 99 ? '99+' : count}</span>}
    </button>
  );
}

function trackingTone(order: OrderRow) {
  const t = order.trackings?.[0];
  if (!t) return 'text-orders-text-subtle';
  if (t.registrationStatus === 'paused') return 'text-orders-warning';
  if (t.status && t.status !== 'NotFound') return 'text-orders-success';
  return 'text-orders-primary';
}

function trackingLabel(order: OrderRow) {
  const t = order.trackings?.[0];
  if (!t) return 'Register tracking';
  if (t.registrationStatus === 'paused') return 'Tracking paused: click to restart';
  if (t.status && t.status !== 'NotFound') return `Tracking: ${t.status}`;
  return 'Tracking registered';
}

export default function RowActions({ p, order, isExpanded }: { p: OrdersPageBundle; order: OrderRow; isExpanded: boolean }) {
  const { caps } = p;
  const fulfilled = isOrderFullyFulfilled(order);
  const allPacked = order.totalQuantity > 0 && order.packedQuantity >= order.totalQuantity;
  const refreshing = Boolean(p.refreshingOrderIds[order.id]);
  const hasTracking = order.fulfillmentItems.confirmations.some((c) => c.trackingInfo?.number?.trim());
  const printingSlip = caps.slip && order.slipPrinted;
  const slipLabel = allPacked ? 'Everything is packed' : printingSlip ? 'Picking slip printed: print again' : 'Print picking slip';
  const messageOpen = caps.role === 'picker' ? () => void p.pickerMessages.openMessageModal(order) : () => void p.openMessageModal(order);
  const messageDisabled = caps.role === 'picker' ? allPacked : fulfilled;
  return (
    <span className="flex items-center justify-end gap-0.5">
      {caps.slip && <IconButton icon="printer" label={slipLabel} printed={printingSlip} disabled={allPacked} onClick={() => p.openPrintModal([order])} />}
      {caps.labels && <IconButton icon="tag" label={fulfilled ? 'Fulfilled: label locked' : order.labelPrintedAt ? 'Label printed: print again' : 'Print label'} printed={Boolean(order.labelPrintedAt)} disabled={fulfilled || p.printingOrderId === order.id} spinning={p.printingOrderId === order.id} onClick={() => void p.printPackingSlipLabel(order)} />}
      {caps.invoice && <IconButton icon="receipt" label="Print tax invoice" disabled={p.printingInvoiceOrderId === order.id} spinning={p.printingInvoiceOrderId === order.id} onClick={() => void p.printTaxInvoice(order)} />}
      <IconButton icon="chat" label={caps.role === 'picker' ? 'Messages to admin' : 'Admin messages'} count={order.messageCount} disabled={messageDisabled} onClick={messageOpen} />
      {caps.admin && <IconButton icon="tracking" label={hasTracking ? trackingLabel(order) : 'No tracking number yet'} disabled={!hasTracking} tone={trackingTone(order)} onClick={() => p.openTrackingModal(order)} />}
      <IconButton icon="refresh" label="Refresh order from Shopify" disabled={refreshing || (caps.role === 'picker' && allPacked)} spinning={refreshing} onClick={() => void p.refreshSingleOrder(order)} />
      <IconButton icon={isExpanded ? 'chevronUp' : 'chevronDown'} label={isExpanded ? 'Hide details' : 'View details'} onClick={() => p.toggleExpanded(order.id)} />
    </span>
  );
}
