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
      <div className="mt-3 flex items-center gap-2 pt-2 border-t border-blue-50">
        <button
          onClick={() => p.openEditFulModal(order, conf, confId)}
          className="flex-1 text-xs font-medium text-blue-700 bg-white border border-blue-300 rounded-lg py-1.5 hover:bg-blue-50 cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={() => p.openCancelFulModal(order, conf, confId)}
          className="flex-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-lg py-1.5 hover:bg-red-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }
  const editReq = p.getActiveFulfillmentRequest(order.id, confId, 'edit');
  const cancelReq = p.getActiveFulfillmentRequest(order.id, confId, 'cancel');
  return (
    <div className="mt-3 flex items-center gap-2 pt-2 border-t border-blue-50">
      {editReq?.status === 'approved' ? (
        <button onClick={() => p.openEditFulModal(order, conf, confId)} className="flex-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-300 rounded-lg py-1.5 hover:bg-green-100 cursor-pointer">
          ✓ Edit Now
        </button>
      ) : editReq?.status === 'pending' ? (
        <div className="flex-1 text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-1.5">Edit Pending…</div>
      ) : (
        <button onClick={() => void p.openRequestPermModal(order, conf, confId, 'edit')} className="flex-1 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 cursor-pointer">
          Request Edit
        </button>
      )}
      {cancelReq?.status === 'approved' ? (
        <button onClick={() => p.openCancelFulModal(order, conf, confId)} className="flex-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg py-1.5 hover:bg-red-100 cursor-pointer">
          ✓ Cancel Now
        </button>
      ) : cancelReq?.status === 'pending' ? (
        <div className="flex-1 text-xs text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-1.5">Cancel Pending…</div>
      ) : (
        <button onClick={() => void p.openRequestPermModal(order, conf, confId, 'cancel')} className="flex-1 text-xs font-medium text-red-600 bg-white border border-red-300 rounded-lg py-1.5 hover:bg-red-50 cursor-pointer">
          Request Cancel
        </button>
      )}
    </div>
  );
}
