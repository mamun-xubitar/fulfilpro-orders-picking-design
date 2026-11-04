'use client';

import type { FulfillmentConfirmation, OrderRow } from './types';
import type { OrdersPageBundle } from './ordersPageContext';

type FulfillmentConfActionsProps = {
  p: OrdersPageBundle;
  order: OrderRow;
  conf: FulfillmentConfirmation;
  confId: string;
};

export default function FulfillmentConfActions({ p, order, conf, confId }: FulfillmentConfActionsProps) {
  if (p.userIsAdmin) {
    return (
      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-orders-divider">
        <button
          onClick={() => p.openEditFulModal(order, conf, confId)}
          className="flex-1 text-xs font-medium text-orders-primary-ink bg-orders-surface border border-orders-primary-ring rounded-lg py-1.5 hover:bg-orders-primary-soft cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={() => p.openCancelFulModal(order, conf, confId)}
          className="flex-1 text-xs font-medium text-orders-danger bg-orders-surface border border-orders-danger-border rounded-lg py-1.5 hover:bg-orders-danger-soft cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }
  const editReq = p.getActiveFulfillmentRequest(order.id, confId, 'edit');
  const cancelReq = p.getActiveFulfillmentRequest(order.id, confId, 'cancel');
  return (
    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-orders-divider">
      {editReq?.status === 'approved' ? (
        <button onClick={() => p.openEditFulModal(order, conf, confId)} className="flex-1 text-xs font-semibold text-orders-success-ink bg-orders-success-soft border border-orders-success-border rounded-lg py-1.5 hover:brightness-95 cursor-pointer">
          ✓ Edit Now
        </button>
      ) : editReq?.status === 'pending' ? (
        <div className="flex-1 text-xs text-center text-orders-warning-ink bg-orders-warning-soft border border-orders-warning-border rounded-lg py-1.5">Edit Pending…</div>
      ) : (
        <button onClick={() => void p.openRequestPermModal(order, conf, confId, 'edit')} className="flex-1 text-xs font-medium text-orders-text-muted bg-orders-surface border border-orders-border-strong rounded-lg py-1.5 hover:bg-orders-surface-muted cursor-pointer">
          Request Edit
        </button>
      )}
      {cancelReq?.status === 'approved' ? (
        <button onClick={() => p.openCancelFulModal(order, conf, confId)} className="flex-1 text-xs font-semibold text-orders-danger-ink bg-orders-danger-soft border border-orders-danger-border rounded-lg py-1.5 hover:brightness-95 cursor-pointer">
          ✓ Cancel Now
        </button>
      ) : cancelReq?.status === 'pending' ? (
        <div className="flex-1 text-xs text-center text-orders-warning-ink bg-orders-warning-soft border border-orders-warning-border rounded-lg py-1.5">Cancel Pending…</div>
      ) : (
        <button onClick={() => void p.openRequestPermModal(order, conf, confId, 'cancel')} className="flex-1 text-xs font-medium text-orders-danger bg-orders-surface border border-orders-danger-border rounded-lg py-1.5 hover:bg-orders-danger-soft cursor-pointer">
          Request Cancel
        </button>
      )}
    </div>
  );
}
