'use client';

import type { ReceiveDraft } from './hooks/usePoReceive';
import type { LocationOption } from './types';

type PoReceiveItemRowProps = {
  draft: ReceiveDraft;
  qty: string;
  onQtyChange: (value: string) => void;
  checkedLocations: LocationOption[];
  allocations: Record<string, string>;
  onAllocationChange: (locationId: string, value: string) => void;
  allocatedTotal: number;
};

export default function PoReceiveItemRow({
  draft,
  qty,
  onQtyChange,
  checkedLocations,
  allocations,
  onAllocationChange,
  allocatedTotal,
}: PoReceiveItemRowProps) {
  const remaining = Math.max(0, draft.ordered - draft.alreadyReceived);
  const qtyNumber = Number(qty) || 0;
  const isOverReceipt = qtyNumber > remaining;
  const balanced = allocatedTotal === qtyNumber;

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">{draft.variantTitle}</p>
          <p className="text-xs text-gray-500">SKU: {draft.sku ?? '-'}</p>
        </div>
        <input
          type="number"
          min={0}
          value={qty}
          onChange={(e) => onQtyChange(e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right outline-none"
        />
      </div>

      <p className="text-xs text-gray-500">
        Ordered {draft.ordered} · Already received {draft.alreadyReceived} · Remaining {remaining}
      </p>

      {isOverReceipt && <p className="text-xs font-medium text-amber-600">⚠ {qtyNumber - remaining} units over the ordered quantity</p>}

      {checkedLocations.length >= 1 && (
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <div className={`flex items-center justify-between text-xs ${balanced ? 'text-gray-500' : 'font-medium text-red-600'}`}>
            <span>Allocated</span>
            <span>
              {allocatedTotal} / {qtyNumber}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {checkedLocations.map((location) => (
              <label key={location.id} className="flex items-center justify-between gap-2 text-xs text-gray-600">
                {location.name}
                <input
                  type="number"
                  min={0}
                  value={allocations[location.id] ?? '0'}
                  onChange={(e) => onAllocationChange(location.id, e.target.value)}
                  className="w-16 border border-gray-300 rounded px-1.5 py-1 text-right outline-none"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
