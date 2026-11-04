'use client';

import type { FulfillmentConfirmation, OrderRow } from './types';
import type { OrdersPageBundle } from './ordersPageContext';
import { Icon } from './queue/icons';

type FulfillmentConfActionsProps = {
  p: OrdersPageBundle;
  order: OrderRow;
  conf: FulfillmentConfirmation;
  confId: string;
  /** Small inline buttons for the Fulfilment card; the Fulfilments dialog uses the wide ones. */
  compact?: boolean;
};

export default function FulfillmentConfActions({ p, order, conf, confId, compact = false }: FulfillmentConfActionsProps) {
  const wrap = compact ? 'flex flex-wrap items-center gap-[5px]' : 'mt-3 flex items-center gap-2 border-t border-orders-divider pt-2';
  const size = compact ? 'inline-flex h-5 items-center justify-center gap-[3px] rounded-[5px] border px-1.5 text-[9.5px] font-bold cursor-pointer' : 'flex-1 rounded-lg border py-1.5 text-xs cursor-pointer';
  const weight = compact ? '' : 'font-medium';
  const ghost = `${size} ${weight} border-orders-border-strong bg-orders-surface text-orders-text-body hover:bg-orders-surface-muted`;
  const danger = `${size} ${weight} border-orders-danger-border bg-orders-danger-soft text-orders-danger-ink hover:brightness-95`;
  const pending = compact ? 'inline-flex h-4 items-center gap-0.5 rounded-full border border-orders-warning-border bg-orders-warning-soft px-1.5 text-[9.5px] font-bold text-orders-warning-ink' : 'flex-1 rounded-lg border border-orders-warning-border bg-orders-warning-soft py-1.5 text-center text-xs text-orders-warning-ink';
  if (p.userIsAdmin) {
    return (
      <div className={wrap}>
        <button type="button" onClick={() => p.openEditFulModal(order, conf, confId)} className={ghost}>{compact && <Icon name="pencil" className="h-[11px] w-[11px]" />}Edit</button>
        <button type="button" onClick={() => p.openCancelFulModal(order, conf, confId)} className={danger}>Cancel</button>
      </div>
    );
  }
  const editReq = p.getActiveFulfillmentRequest(order.id, confId, 'edit');
  const cancelReq = p.getActiveFulfillmentRequest(order.id, confId, 'cancel');
  const ok = `${size} ${weight} border-orders-success-border bg-orders-success-soft text-orders-success-ink hover:brightness-95`;
  return (
    <div className={wrap}>
      {editReq?.status === 'approved' ? (
        <button type="button" onClick={() => p.openEditFulModal(order, conf, confId)} className={ok}>✓ Edit now</button>
      ) : editReq?.status === 'pending' ? (
        <span className={pending}>{compact && <Icon name="clock" className="h-2.5 w-2.5" />}Edit request pending…</span>
      ) : (
        <button type="button" onClick={() => void p.openRequestPermModal(order, conf, confId, 'edit')} className={ghost}>{compact && <Icon name="user" className="h-[11px] w-[11px]" />}Request edit</button>
      )}
      {cancelReq?.status === 'approved' ? (
        <button type="button" onClick={() => p.openCancelFulModal(order, conf, confId)} className={danger}>✓ Cancel now</button>
      ) : cancelReq?.status === 'pending' ? (
        <span className={pending}>{compact && <Icon name="clock" className="h-2.5 w-2.5" />}Cancel request pending…</span>
      ) : (
        <button type="button" onClick={() => void p.openRequestPermModal(order, conf, confId, 'cancel')} className={danger}>Request cancel</button>
      )}
    </div>
  );
}
