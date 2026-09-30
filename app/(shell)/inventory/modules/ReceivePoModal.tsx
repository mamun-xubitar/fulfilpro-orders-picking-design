'use client';

import { ModalShell } from '@/components/ModalShell';
import { formatColourName } from '@/lib/inventory/colour';
import ColumnFillInput from './ColumnFillInput';
import { STATUS_BADGES } from './PurchaseOrdersPanel';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import { formatDate, formatMoney, formatPoNumber, poAveragePrice } from './utils';

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_6rem_4.5rem_4rem_4rem_4rem_4.5rem_5.5rem_7rem]';

export default function ReceivePoModal({ po }: { po: ReturnType<typeof usePurchaseOrder> }) {
  const target = po.receiveTarget!;
  const avgPrice = poAveragePrice(target.items);
  const hasQtyError = target.items.some((item) => po.getReceiveQtyError(po.receiveQty[item.id], Math.max(0, item.quantity - item.receivedQuantity)) !== null);

  return (
    <ModalShell disableBackdropClose
      title={`Receive — ${target.productTitle}`}
      compact
      onClose={po.closeReceive}
      maxWidthClass="max-w-4xl"
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={po.closeReceive}
            className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={po.submitReceive}
            disabled={po.receiving || hasQtyError}
            className={`flex-1 ${WIZARD_BTN_FINISH}`}
          >
            {po.receiving && SPINNER}
            {po.receiving ? 'Receiving...' : 'Receive'}
          </button>
        </div>
      }
    >
      <div className={`${WIZARD_CARD_CLASS} space-y-2`}>
        <div className="rounded-[7px] border border-inventory-border bg-inventory-surface-muted p-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-inventory-text">{formatPoNumber(target.number)}</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGES[target.status]}`}>
              {target.status.replace('_', ' ')}
            </span>
          </div>
          <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-inventory-text-muted sm:grid-cols-3">
            <div>
              <dt className="inline text-inventory-text-subtle">Reference: </dt>
              <dd className="inline">{target.referenceNumber || '—'}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Supplier: </dt>
              <dd className="inline">{target.supplierName}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">PO email: </dt>
              <dd className="inline">{target.poEmail}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Delivery date: </dt>
              <dd className="inline">{target.deliveryDate ? formatDate(target.deliveryDate) : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Created: </dt>
              <dd className="inline">{formatDate(target.createdAt)}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">Avg unit cost: </dt>
              <dd className="inline">{avgPrice !== null ? `$${formatMoney(avgPrice)}` : '—'}</dd>
            </div>
            <div>
              <dt className="inline text-inventory-text-subtle">PO Remark: </dt>
              <dd className="inline">{target.poRemark || '—'}</dd>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <dt className="inline text-inventory-text-subtle">Shipping remark: </dt>
              <dd className="inline">{target.shippingRemark || '—'}</dd>
            </div>
          </dl>
        </div>

        <p className="text-[12px] text-inventory-text-muted">Enter the quantity received for each item. Leave 0 for items not yet shipped — receive again later for partial deliveries.</p>

        <div className="max-h-80 overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
          <div className={`grid ${GRID_COLS} items-center gap-2 border-b border-inventory-border bg-inventory-surface-muted px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>
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
          <div className="divide-y divide-inventory-border">
            {target.items.map((item) => {
              const remaining = Math.max(0, item.quantity - item.receivedQuantity);
              const qtyError = po.getReceiveQtyError(po.receiveQty[item.id], remaining);
              return (
                <div key={item.id} className="px-2 py-1 transition-colors duration-150 hover:bg-inventory-surface-hover">
                  <div className={`grid ${GRID_COLS} items-center gap-2 text-[11px] leading-none`}>
                    <span title={item.variantTitle} className="min-w-0 truncate whitespace-nowrap text-inventory-text-muted">{item.variantTitle}</span>
                    <span className="truncate text-inventory-text-subtle">{item.sku ?? '—'}</span>
                    <span className="truncate text-inventory-text-subtle">{item.colour ? formatColourName(item.colour) : '—'}</span>
                    <span className="truncate text-inventory-text-subtle">{item.size || '—'}</span>
                    <span className="text-right tabular-nums text-inventory-text-subtle">{item.quantity}</span>
                    <span className="text-right tabular-nums text-inventory-text-subtle">{item.receivedQuantity}</span>
                    <span className="text-right tabular-nums font-medium text-inventory-text-muted">{remaining}</span>
                    <div className="relative w-full min-w-0">
                      <span className="pointer-events-none absolute inset-y-0 left-[6px] flex items-center text-[11px] text-inventory-text-subtle">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={po.receiveCost[item.id] ?? ''}
                        onChange={(e) => po.setReceiveItemCost(item.id, e.target.value)}
                        aria-label={`Unit cost for ${item.variantTitle}`}
                        className="h-[22px] w-full rounded-[7px] border border-inventory-border-strong pl-[14px] pr-[6px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
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
                        className={`h-[22px] w-full rounded-[7px] border px-[6px] text-right text-[11px] leading-none outline-none focus:ring-2 ${qtyError ? 'border-inventory-danger/45 bg-inventory-danger/8 focus:border-inventory-danger focus:ring-inventory-danger/20' : 'border-inventory-border-strong focus:border-inventory-primary focus:ring-inventory-primary-ring'}`}
                      />
                    </div>
                  </div>
                  {qtyError && <p className="mt-1 text-right text-[10px] leading-tight text-inventory-danger">{qtyError}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
