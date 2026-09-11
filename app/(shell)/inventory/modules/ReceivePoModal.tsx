'use client';

import { formatColourName } from '@/lib/inventory/colour';
import { ModalShell } from '@/components/ModalShell';
import { STATUS_BADGES } from './PurchaseOrdersPanel';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import { formatDate, formatPoNumber } from './utils';

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem_5rem_6.5rem_6rem]';

export default function ReceivePoModal({ po }: { po: ReturnType<typeof usePurchaseOrder> }) {
  const target = po.receiveTarget!;

  return (
    <ModalShell
      title={`Receive — ${target.productTitle}`}
      onClose={po.closeReceive}
      extraWide
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={po.closeReceive}
            className="h-[22px] flex-1 rounded-[6px] border border-gray-300 bg-white px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={po.submitReceive}
            disabled={po.receiving}
            className="h-[22px] flex-1 rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {po.receiving ? 'Receiving...' : 'Receive'}
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="rounded-[7px] border border-gray-200 bg-gray-50 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-900">{formatPoNumber(target.number)}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[target.status]}`}>
              {target.status.replace('_', ' ')}
            </span>
          </div>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 sm:grid-cols-3">
            <div>
              <dt className="inline text-gray-400">Reference: </dt>
              <dd className="inline">{target.referenceNumber || '—'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Supplier: </dt>
              <dd className="inline">{target.supplierName}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">PO email: </dt>
              <dd className="inline">{target.poEmail}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Delivery date: </dt>
              <dd className="inline">{target.deliveryDate ? formatDate(target.deliveryDate) : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Created: </dt>
              <dd className="inline">{formatDate(target.createdAt)}</dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="inline text-gray-400">Remark: </dt>
              <dd className="inline">{target.remark || '—'}</dd>
            </div>
          </dl>
        </div>

        <p className="text-[12px] text-gray-600">Enter the quantity received for each item. Leave 0 for items not yet shipped — receive again later for partial deliveries.</p>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
          <div className={`grid ${GRID_COLS} gap-2 border-b border-gray-100 bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500`}>
            <span>Variant</span>
            <span>Supplier SKU</span>
            <span>Colour</span>
            <span>Size</span>
            <span className="text-right">Ordered</span>
            <span className="text-right">Received</span>
            <span className="text-right">Outstanding</span>
            <span className="text-right">Unit cost</span>
            <span className="text-right">Receive qty</span>
          </div>
          <div className="divide-y divide-gray-100">
            {target.items.map((item) => {
              const remaining = Math.max(0, item.quantity - item.receivedQuantity);
              return (
                <div key={item.id} className={`grid ${GRID_COLS} items-center gap-2 px-2 py-1 text-[11px] leading-none`}>
                  <span className="min-w-0 truncate text-gray-700">{item.variantTitle}</span>
                  <span className="truncate text-gray-500">{item.sku ?? '—'}</span>
                  <span className="truncate text-gray-500">{item.colour ? formatColourName(item.colour) : '—'}</span>
                  <span className="truncate text-gray-500">{item.size || '—'}</span>
                  <span className="text-right tabular-nums text-gray-500">{item.quantity}</span>
                  <span className="text-right tabular-nums text-gray-500">{item.receivedQuantity}</span>
                  <span className="text-right tabular-nums font-medium text-gray-700">{remaining}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={po.receiveCost[item.id] ?? ''}
                    onChange={(e) => po.setReceiveItemCost(item.id, e.target.value)}
                    aria-label={`Unit cost for ${item.variantTitle}`}
                    className="h-[22px] w-full rounded-[6px] border border-gray-300 px-[6px] text-right text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    type="number"
                    min={0}
                    max={remaining}
                    value={po.receiveQty[item.id] ?? ''}
                    onChange={(e) => po.setReceiveItemQty(item.id, e.target.value, remaining)}
                    aria-label={`Receive quantity for ${item.variantTitle}`}
                    className="h-[22px] w-full rounded-[6px] border border-gray-300 px-[6px] text-right text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
