'use client';

import type { MouseEvent } from 'react';
import type { OrderRow } from '../types';
import type { OrdersPageBundle } from '../ordersPageContext';
import { isOrderFullyFulfilled } from '../utils';
import { Icon, type IconName } from './icons';

type IconButtonProps = {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Green ring and tick once the document has been printed. */
  printed?: boolean;
  spinning?: boolean;
  count?: number;
  tone?: string;
  amber?: boolean;
};

/** The table's `.ib`: a 24px icon button with a 14px glyph, optional count badge and green "printed" state. */
export function IconButton({ icon, label, onClick, disabled, printed, spinning, count, tone, amber }: IconButtonProps) {
  const color = disabled ? 'text-orders-border-strong' : printed ? 'text-orders-success-ink' : tone ?? 'text-orders-text-subtle hover:text-orders-text';
  const handle = (e: MouseEvent) => { e.stopPropagation(); onClick(); };
  return (
    <button type="button" title={label} aria-label={label} onClick={handle} disabled={disabled} className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed cursor-pointer ${printed && !disabled ? 'bg-orders-success-soft shadow-[inset_0_0_0_1px_var(--orders-success-border)]' : 'hover:bg-orders-divider'} ${color}`}>
      <Icon name={icon} className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
      {printed && !disabled && <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2 items-center justify-center rounded-full bg-orders-success text-white"><Icon name="check" className="h-[6px] w-[6px]" /></span>}
      {!!count && count > 0 && <span className={`absolute -right-[3px] -top-0.5 rounded-full px-[3.5px] text-[8px] font-bold not-italic leading-3 text-white ${amber ? 'bg-orders-warning-ink' : 'bg-orders-primary'}`}>{count > 99 ? '99+' : count}</span>}
    </button>
  );
}

function trackingState(order: OrderRow) {
  const t = order.trackings?.[0];
  const hasNumber = order.fulfillmentItems.confirmations.some((c) => c.trackingInfo?.number?.trim());
  if (!t && !hasNumber) return { disabled: true, label: 'No tracking number yet', tone: undefined };
  if (!t) return { disabled: false, label: 'Register tracking', tone: 'text-orders-text-subtle' };
  if (t.status === 'Delivered') return { disabled: true, label: 'Tracking: Delivered, nothing to do', tone: undefined };
  if (t.registrationStatus === 'paused') return { disabled: false, label: 'Restart tracking (paused)', tone: 'text-orders-warning-ink' };
  return { disabled: false, label: `Pause tracking (${t.status ?? 'registered'})`, tone: 'text-orders-success-ink' };
}

/** Opens the Message tab of the "Notes and messages" dialog; the recipient is chosen inside it. */
function MessagesButton({ p, order, disabled }: { p: OrdersPageBundle; order: OrderRow; disabled: boolean }) {
  if (p.caps.role === 'picker') return <IconButton icon="chat" label="Message to admin" count={order.messageCount} disabled={disabled} onClick={() => void p.pickerMessages.openMessageModal(order)} />;
  return <IconButton icon="chat" label={p.caps.admin ? 'Messages' : 'Message the admins'} count={order.messageCount} disabled={disabled} onClick={() => void p.openMessageModal(order)} />;
}

export default function RowActions({ p, order, isExpanded }: { p: OrdersPageBundle; order: OrderRow; isExpanded: boolean }) {
  const { caps } = p;
  const fulfilled = isOrderFullyFulfilled(order);
  const allPacked = order.totalQuantity > 0 && order.packedQuantity >= order.totalQuantity;
  const refreshing = Boolean(p.refreshingOrderIds[order.id]);
  const slipPrinted = caps.slip && order.slipPrinted;
  const slipLabel = allPacked ? 'Everything is packed' : slipPrinted ? 'Picking slip printed: print again' : 'Print picking slip';
  const messageDisabled = caps.role === 'picker' ? allPacked : !caps.admin && fulfilled;
  const trk = trackingState(order);
  return (
    <span className="flex items-center justify-end">
      {caps.slip && <IconButton icon="printer" label={slipLabel} printed={slipPrinted} disabled={allPacked} onClick={() => p.openPrintModal([order])} />}
      {caps.labels && <IconButton icon="tag" label={fulfilled ? 'Fulfilled: label locked' : order.labelPrintedAt ? 'Shipping label printed, print again' : 'Print label'} printed={Boolean(order.labelPrintedAt)} disabled={fulfilled || p.printingOrderId === order.id} spinning={p.printingOrderId === order.id} onClick={() => void p.printPackingSlipLabel(order)} />}
      {caps.invoice && <IconButton icon="receipt" label="Print tax invoice" disabled={p.printingInvoiceOrderId === order.id} spinning={p.printingInvoiceOrderId === order.id} onClick={() => void p.printTaxInvoice(order)} />}
      <MessagesButton p={p} order={order} disabled={messageDisabled} />
      {caps.admin && <IconButton icon="tracking" label={trk.label} disabled={trk.disabled} tone={trk.tone} onClick={() => p.openTrackingModal(order)} />}
      <IconButton icon="refresh" label="Refresh order from Shopify" disabled={refreshing || (caps.role === 'picker' && allPacked)} spinning={refreshing} onClick={() => void p.refreshSingleOrder(order)} />
      <IconButton icon={isExpanded ? 'chevronUp' : 'chevronDown'} label={isExpanded ? 'Collapse' : 'View details'} onClick={() => p.toggleExpanded(order.id)} />
    </span>
  );
}
