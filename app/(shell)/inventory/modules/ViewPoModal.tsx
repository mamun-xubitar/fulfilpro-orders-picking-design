'use client';

import { MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import { formatColourName } from '@/lib/inventory/colour';
import { STATUS_BADGES } from './PurchaseOrdersPanel';
import type { PurchaseOrderRecord } from './types';
import { formatDate, formatMoney, formatPoNumber, poAveragePrice } from './utils';

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem_5rem_6.5rem]';

type ViewPoModalProps = { po: PurchaseOrderRecord; onClose: () => void };

/** Read-only rendition of a purchase order — same header info and item columns as
 * `ReceivePoModal`, minus the Receive qty column and every editable input, for the Buying
 * history modal's "View" action. Takes the record directly rather than the `usePurchaseOrder`
 * hook, since it never mutates anything. */
export default function ViewPoModal({ po, onClose }: ViewPoModalProps) {
  const avgPrice = poAveragePrice(po.items);

  return (
    <ModalShell
      disableBackdropClose
      elevated
      title={`Purchase order — ${po.productTitle}`}
      compact
      onClose={onClose}
      extraWide
      footer={
        <button type="button" onClick={onClose} className={`w-full ${MODAL_FOOTER_BTN_SECONDARY}`}>
          Close
        </button>
      }
    >
      <div className="space-y-2">
        <div className="rounded-[7px] border border-gray-200 bg-gray-50 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-900">{formatPoNumber(po.number)}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[po.status]}`}>
              {po.status.replace('_', ' ')}
            </span>
          </div>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-600 sm:grid-cols-3">
            <div>
              <dt className="inline text-gray-400">Reference: </dt>
              <dd className="inline">{po.referenceNumber || '—'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Supplier: </dt>
              <dd className="inline">{po.supplierName}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">PO email: </dt>
              <dd className="inline">{po.poEmail}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Delivery date: </dt>
              <dd className="inline">{po.deliveryDate ? formatDate(po.deliveryDate) : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Created: </dt>
              <dd className="inline">{formatDate(po.createdAt)}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">Avg unit cost: </dt>
              <dd className="inline">{avgPrice !== null ? `$${formatMoney(avgPrice)}` : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-gray-400">PO Remark: </dt>
              <dd className="inline">{po.poRemark || '—'}</dd>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <dt className="inline text-gray-400">Shipping remark: </dt>
              <dd className="inline">{po.shippingRemark || '—'}</dd>
            </div>
          </dl>
        </div>

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
          </div>
          <div className="divide-y divide-gray-200">
            {po.items.map((item) => {
              const remaining = Math.max(0, item.quantity - item.receivedQuantity);
              return (
                <div key={item.id} className={`grid ${GRID_COLS} items-center gap-2 px-2 py-1 text-[11px] leading-none`}>
                  <span title={item.variantTitle} className="min-w-0 truncate whitespace-nowrap text-gray-700">{item.variantTitle}</span>
                  <span className="truncate text-gray-500">{item.sku ?? '—'}</span>
                  <span className="truncate text-gray-500">{item.colour ? formatColourName(item.colour) : '—'}</span>
                  <span className="truncate text-gray-500">{item.size || '—'}</span>
                  <span className="text-right tabular-nums text-gray-500">{item.quantity}</span>
                  <span className="text-right tabular-nums text-gray-500">{item.receivedQuantity}</span>
                  <span className="text-right tabular-nums font-medium text-gray-700">{remaining}</span>
                  <span className="text-right tabular-nums text-gray-700">{item.unitCost !== null ? `$${formatMoney(item.unitCost)}` : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
