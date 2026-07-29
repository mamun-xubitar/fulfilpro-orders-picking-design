'use client';

import { formatPoNumber, getPoStatusChipClass } from './utils';
import type { PurchaseOrderRow } from './types';

type PoHistoryRowProps = {
  po: PurchaseOrderRow;
  onSendEmail: (po: PurchaseOrderRow) => void;
  onOpen: (id: string) => void;
};

export default function PoHistoryRow({ po, onSendEmail, onOpen }: PoHistoryRowProps) {
  return (
    <div className="border border-gray-200 rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-900">{formatPoNumber(po.number)}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getPoStatusChipClass(po.status)}`}>{po.status.replace(/_/g, ' ')}</span>
      </div>
      <p className="text-xs text-gray-500">Created {new Date(po.createdAt).toLocaleDateString()}</p>
      {po.deliveryDate && <p className="text-xs text-gray-500">Delivery {new Date(po.deliveryDate).toLocaleDateString()}</p>}
      <div className="flex items-center gap-1.5 mt-1">
        <button
          type="button"
          onClick={() => onSendEmail(po)}
          className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700 cursor-pointer"
        >
          Send Email
        </button>
        <button
          type="button"
          onClick={() => onOpen(po.id)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Open PO
        </button>
      </div>
    </div>
  );
}
