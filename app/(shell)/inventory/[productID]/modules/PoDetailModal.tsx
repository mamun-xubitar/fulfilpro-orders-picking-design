'use client';

import { ModalShell } from '@/components/ModalShell';
import PoDetailItemsTable from './PoDetailItemsTable';
import { formatPoNumber, getPoStatusChipClass } from './utils';
import type { usePurchaseOrders } from './hooks/usePurchaseOrders';
import type { PurchaseOrderStatus } from './types';

const STATUS_OPTIONS: PurchaseOrderStatus[] = ['REQUESTED', 'RECEIVED', 'CANCELLED'];

type PoDetailModalProps = {
  po: ReturnType<typeof usePurchaseOrders>;
};

export default function PoDetailModal({ po }: PoDetailModalProps) {
  const purchaseOrder = po.openPo;
  if (!purchaseOrder) return null;

  return (
    <ModalShell
      title={formatPoNumber(purchaseOrder.number)}
      onClose={po.closePo}
      wide
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => po.sendEmailForPo(purchaseOrder)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Send Email
          </button>
          <button
            type="button"
            onClick={() => po.copyEmailBodyForPo(purchaseOrder)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Copy email body
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Supplier</p>
            <p className="text-gray-900">{purchaseOrder.supplierName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">PO email</p>
            <p className="text-gray-900">{purchaseOrder.poEmail}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Created by</p>
            <p className="text-gray-900">
              {purchaseOrder.createdByName} on {new Date(purchaseOrder.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Delivery date</p>
            <p className="text-gray-900">{purchaseOrder.deliveryDate ? new Date(purchaseOrder.deliveryDate).toLocaleDateString() : '-'}</p>
          </div>
        </div>

        {purchaseOrder.remark && (
          <div>
            <p className="text-xs text-gray-400">Remark</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{purchaseOrder.remark}</p>
          </div>
        )}

        <PoDetailItemsTable items={purchaseOrder.items} po={po} />

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Status</label>
          <select
            value={purchaseOrder.status}
            onChange={(e) => po.handleStatusChange(e.target.value as PurchaseOrderStatus)}
            disabled={po.updatingStatus}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none"
          >
            {!STATUS_OPTIONS.includes(purchaseOrder.status) && (
              <option value={purchaseOrder.status} disabled>
                {purchaseOrder.status.replace(/_/g, ' ')}
              </option>
            )}
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getPoStatusChipClass(purchaseOrder.status)}`}>
            {purchaseOrder.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
    </ModalShell>
  );
}
