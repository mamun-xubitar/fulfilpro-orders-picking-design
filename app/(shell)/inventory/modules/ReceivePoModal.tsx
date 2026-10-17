'use client';

import { ModalShell } from '@/components/ModalShell';
import ColumnFillInput from './ColumnFillInput';
import { STATUS_BADGES } from './PurchaseOrdersPanel';
import ReceivePoItemRow, { RECEIVE_GRID_COLS, RECEIVE_SELECT_CLASS } from './ReceivePoItemRow';
import type { LocationOption } from './hooks/useLocations';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import { formatDate, formatMoney, formatPoNumber, poAveragePrice } from './utils';

export default function ReceivePoModal({ po, locations }: { po: ReturnType<typeof usePurchaseOrder>; locations: LocationOption[] }) {
  const target = po.receiveTarget!;
  const avgPrice = poAveragePrice(target.items);
  const hasQtyError = target.items.some((item) => po.getReceiveQtyError(po.receiveQty[item.id], Math.max(0, item.quantity - item.receivedQuantity)) !== null);
  const receivable = target.items.filter((item) => item.quantity > item.receivedQuantity);
  const selected = target.items.filter((item) => po.receiveSelected[item.id]);
  const allSelected = receivable.length > 0 && receivable.every((item) => po.receiveSelected[item.id]);
  // Every ticked line needs a location, and at least one of them a quantity, before Receive enables.
  const canReceive = selected.some((item) => Number(po.receiveQty[item.id]) > 0) && selected.every((item) => po.receiveLocations[item.id]);

  return (
    <ModalShell disableBackdropClose
      title={`Receive — ${target.productTitle}`}
      compact
      onClose={po.closeReceive}
      maxWidthClass="max-w-6xl"
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
            disabled={po.receiving || hasQtyError || !canReceive}
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
              <dd className="inline">{avgPrice !== null ? `$${formatMoney(avgPrice)} AUD` : '—'}</dd>
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

        {/* The bulk-location controls share the always-present hint row (fixed min-height) so
            appearing/disappearing as rows get ticked never shifts the table below. */}
        <div className="flex min-h-[22px] flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-inventory-text-muted"><span className="font-bold">Check the variants to receive</span>, choose a location for each, and enter the quantity received. Receive again later for partial deliveries.</p>
          {selected.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-inventory-text-muted">{selected.length} selected</span>
              <label htmlFor="receive-bulk-location" className="text-[11px] font-semibold text-inventory-text-muted">
                Location
              </label>
              <select
                id="receive-bulk-location"
                value=""
                onChange={(e) => e.target.value && po.setSelectedReceiveLocation(e.target.value)}
                className={`w-44 ${RECEIVE_SELECT_CLASS}`}
              >
                <option value="">Set for selected…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="thin-scroll max-h-[calc(60dvh/var(--page-zoom,1))] overflow-auto rounded-lg border border-inventory-border">
          <div className="min-w-[64.5rem]">
          <div className={`sticky top-0 z-10 grid ${RECEIVE_GRID_COLS} items-center gap-2 border-b border-inventory-border bg-inventory-surface-muted px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>
            <input
              type="checkbox"
              checked={allSelected}
              disabled={receivable.length === 0}
              ref={(el) => {
                if (el) el.indeterminate = selected.length > 0 && !allSelected;
              }}
              onChange={po.toggleAllReceive}
              aria-label="Select all variants"
              className="h-3 w-3 cursor-pointer accent-inventory-primary disabled:cursor-not-allowed"
            />
            <span className="flex min-h-[16px] items-center">Variant</span>
            <span className="flex min-h-[16px] items-center">Supplier SKU</span>
            <span className="flex min-h-[16px] items-center">Colour</span>
            <span className="flex min-h-[16px] items-center">Size</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Ordered</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Received</span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Outstanding</span>
            <span className="flex flex-col justify-center gap-[2px]">
              <span className="flex min-h-[16px] items-center">Remark</span>
              <ColumnFillInput label="Remark" type="text" rowCount={target.items.length} onApplyText={po.setAllReceiveRemark} />
            </span>
            <span className="flex min-h-[16px] items-center justify-end text-right">Unit cost (AUD)</span>
            <span className="flex min-h-[16px] items-center">Location</span>
            <span className="flex flex-col justify-center gap-[2px]">
              <span className="flex min-h-[16px] items-center justify-end text-right">Receive qty</span>
              <span className="min-w-0">
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
            {target.items.map((item) => (
              <ReceivePoItemRow
                key={item.id}
                item={item}
                locations={locations}
                selected={!!po.receiveSelected[item.id]}
                locationId={po.receiveLocations[item.id] ?? ''}
                qty={po.receiveQty[item.id] ?? ''}
                cost={po.receiveCost[item.id] ?? ''}
                remark={po.receiveRemark[item.id] ?? ''}
                qtyError={po.getReceiveQtyError(po.receiveQty[item.id], Math.max(0, item.quantity - item.receivedQuantity))}
                onToggle={() => po.toggleReceiveItem(item.id)}
                onLocationChange={(locationId) => po.setReceiveItemLocation(item.id, locationId)}
                onQtyChange={(value) => po.setReceiveItemQty(item.id, value)}
                onCostChange={(value) => po.setReceiveItemCost(item.id, value)}
                onRemarkChange={(value) => po.setReceiveItemRemark(item.id, value)}
              />
            ))}
          </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
