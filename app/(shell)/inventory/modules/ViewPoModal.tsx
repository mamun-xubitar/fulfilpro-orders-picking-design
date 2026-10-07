'use client';

import { toast } from 'react-toastify';
import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import { formatColourName } from '@/lib/inventory/colour';
import { STATUS_BADGES } from './PurchaseOrdersPanel';
import { Printer } from './icons';
import { paidLabel, printPurchaseOrders, receivedLabel } from './poPrint';
import type { PurchaseOrderRecord } from './types';
import { formatDate, formatMoney, formatPoNumber, poAveragePrice } from './utils';

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_7rem_5.5rem_4.5rem_4.5rem_4.5rem_5rem_8rem]';

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
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onClose} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
            Close
          </button>
          <button
            type="button"
            onClick={() => printPurchaseOrders([po]).catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Unable to print'))}
            className={`flex flex-1 items-center justify-center gap-1.5 ${MODAL_FOOTER_BTN_PRIMARY}`}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      }
    >
      <div className="space-y-2">
        <div className="rounded-[7px] border border-inventory-border bg-inventory-surface-muted p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-inventory-text">{formatPoNumber(po.number)}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[po.status]}`}>
              {po.status.replace('_', ' ')}
            </span>
          </div>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-inventory-text-muted sm:grid-cols-3">
            <div>
              <dt className="inline text-inventory-text-subtle">Reference: </dt>
              <dd className="inline">{po.referenceNumber || '—'}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Supplier: </dt>
              <dd className="inline">{po.supplierName}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">PO email: </dt>
              <dd className="inline">{po.poEmail}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Delivery date: </dt>
              <dd className="inline">{po.deliveryDate ? formatDate(po.deliveryDate) : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Created: </dt>
              <dd className="inline">{formatDate(po.createdAt)}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Received: </dt>
              <dd className="inline">{receivedLabel(po)}</dd>
            </div>
            {po.receivedLocations.length > 0 && (
              <div>
                <dt className="inline text-inventory-text-subtle">Received at: </dt>
                <dd className="inline">{po.receivedLocations.map((l) => `${l.name} (${l.quantity})`).join(', ')}</dd>
              </div>
            )}
            <div>
              <dt className="inline text-inventory-text-subtle">Paid: </dt>
              <dd className="inline">{paidLabel(po)}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Avg unit cost: </dt>
              <dd className="inline">{avgPrice !== null ? `$${formatMoney(avgPrice)} AUD` : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">PO Remark: </dt>
              <dd className="inline">{po.poRemark || '—'}</dd>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <dt className="inline text-inventory-text-subtle">Shipping remark: </dt>
              <dd className="inline">{po.shippingRemark || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="max-h-80 overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
          <div className={`grid ${GRID_COLS} items-center gap-2 border-b border-inventory-border bg-inventory-surface-muted px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>
            <span className="flex min-h-[16px] items-center">Variant</span>
            <span className="flex min-h-[16px] items-center">Supplier SKU</span>
            <span className="flex min-h-[16px] items-center">Colour</span>
            <span className="flex min-h-[16px] items-center">Size</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Ordered</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Received</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Outstanding</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Unit cost (AUD)</span>
          </div>
          <div className="divide-y divide-inventory-border">
            {po.items.map((item) => {
              const remaining = Math.max(0, item.quantity - item.receivedQuantity);
              return (
                <div key={item.id} className={`grid ${GRID_COLS} items-center gap-2 px-2 py-1 text-[11px] leading-none transition-colors duration-150 hover:bg-inventory-surface-hover`}>
                  <span title={item.variantTitle} className="min-w-0 truncate whitespace-nowrap text-inventory-text-muted">{item.variantTitle}</span>
                  <span className="truncate text-inventory-text-subtle">{item.sku ?? '—'}</span>
                  <span className="truncate text-inventory-text-subtle">{item.colour ? formatColourName(item.colour) : '—'}</span>
                  <span className="truncate text-inventory-text-subtle">{item.size || '—'}</span>
                  <span className="text-right tabular-nums text-inventory-text-subtle">{item.quantity}</span>
                  <span className="text-right tabular-nums text-inventory-text-subtle">{item.receivedQuantity}</span>
                  <span className="text-right tabular-nums font-medium text-inventory-text-muted">{remaining}</span>
                  <span className="text-right tabular-nums text-inventory-text-muted">{item.unitCost !== null ? `$${formatMoney(item.unitCost)}` : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
