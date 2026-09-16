'use client';

import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import { formatColourName } from '@/lib/inventory/colour';
import ColumnFillInput from './ColumnFillInput';
import { STATUS_BADGES } from './PurchaseOrdersPanel';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import { formatDate, formatMoney, formatPoNumber, poAveragePrice } from './utils';

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem_5rem_6.5rem_8.5rem]';

export default function ReceivePoModal({ po }: { po: ReturnType<typeof usePurchaseOrder> }) {
  const target = po.receiveTarget!;
  const avgPrice = poAveragePrice(target.items);
  const hasQtyError = target.items.some((item) => po.getReceiveQtyError(po.receiveQty[item.id], Math.max(0, item.quantity - item.receivedQuantity)) !== null);

  return (
    <ModalShell disableBackdropClose
      title={`Receive — ${target.productTitle}`}
      compact
      onClose={po.closeReceive}
      extraWide
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={po.closeReceive}
            className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={po.submitReceive}
            disabled={po.receiving || hasQtyError}
            className={`flex-1 ${MODAL_FOOTER_BTN_PRIMARY}`}
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
            <div>
              <dt className="inline text-gray-400">Avg unit cost: </dt>
              <dd className="inline">{avgPrice !== null ? `$${formatMoney(avgPrice)}` : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">PO Remark: </dt>
              <dd className="inline">{target.poRemark || '—'}</dd>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <dt className="inline text-gray-400">Shipping remark: </dt>
              <dd className="inline">{target.shippingRemark || '—'}</dd>
            </div>
          </dl>
        </div>

        <p className="text-[12px] text-gray-600">Enter the quantity received for each item. Leave 0 for items not yet shipped — receive again later for partial deliveries.</p>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
          <div className={`grid ${GRID_COLS} items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500`}>
            <span className="flex min-h-[16px] items-center">Variant</span>
            <span className="flex min-h-[16px] items-center">Supplier SKU</span>
            <span className="flex min-h-[16px] items-center">Colour</span>
            <span className="flex min-h-[16px] items-center">Size</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Ordered</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Received</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Outstanding</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Unit cost</span>
            <span className="flex items-center justify-end gap-[4px] whitespace-nowrap">
              <span>Receive qty</span>
              <span className="w-[64px] min-w-0">
                <ColumnFillInput
                  label="Receive qty"
                  rowCount={target.items.length}
                  step="1"
                  min={0}
                  integerOnly
                  disabled={hasQtyError}
                  getConfirmWarning={(pending) => {
                    const over = target.items.filter((item) => pending > Math.max(0, item.quantity - item.receivedQuantity));
                    if (over.length === 0) return null;
                    const lowest = Math.min(...target.items.map((item) => Math.max(0, item.quantity - item.receivedQuantity)));
                    return `Exceeds outstanding for ${over.length} of ${target.items.length} row(s) — those will be capped at their outstanding (lowest is ${lowest}).`;
                  }}
                  onApply={po.setAllReceiveQty}
                />
              </span>
            </span>
          </div>
          <div className="divide-y divide-gray-200">
            {target.items.map((item) => {
              const remaining = Math.max(0, item.quantity - item.receivedQuantity);
              const qtyError = po.getReceiveQtyError(po.receiveQty[item.id], remaining);
              return (
                <div key={item.id} className="px-2 py-1">
                  <div className={`grid ${GRID_COLS} items-center gap-2 text-[11px] leading-none`}>
                    <span title={item.variantTitle} className="min-w-0 truncate whitespace-nowrap text-gray-700">{item.variantTitle}</span>
                    <span className="truncate text-gray-500">{item.sku ?? '—'}</span>
                    <span className="truncate text-gray-500">{item.colour ? formatColourName(item.colour) : '—'}</span>
                    <span className="truncate text-gray-500">{item.size || '—'}</span>
                    <span className="text-right tabular-nums text-gray-500">{item.quantity}</span>
                    <span className="text-right tabular-nums text-gray-500">{item.receivedQuantity}</span>
                    <span className="text-right tabular-nums font-medium text-gray-700">{remaining}</span>
                    <div className="relative w-full min-w-0">
                      <span className="pointer-events-none absolute inset-y-0 left-[6px] flex items-center text-[11px] text-gray-400">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={po.receiveCost[item.id] ?? ''}
                        onChange={(e) => po.setReceiveItemCost(item.id, e.target.value)}
                        aria-label={`Unit cost for ${item.variantTitle}`}
                        className="h-[22px] w-full rounded-[6px] border border-gray-300 pl-[14px] pr-[6px] text-right text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div className="w-full min-w-0">
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        step={1}
                        value={po.receiveQty[item.id] ?? ''}
                        onChange={(e) => po.setReceiveItemQty(item.id, e.target.value, remaining)}
                        aria-label={`Receive quantity for ${item.variantTitle}`}
                        aria-invalid={qtyError !== null}
                        title={qtyError ?? `0 to ${remaining}`}
                        className={`h-[22px] w-full rounded-[6px] border px-[6px] text-right text-[11px] leading-none outline-none focus:ring-2 ${qtyError ? 'border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'}`}
                      />
                    </div>
                  </div>
                  {qtyError && <p className="mt-1 text-right text-[10px] leading-tight text-red-600">{qtyError}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
