'use client';

import PoItemsTable from './PoItemsTable';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import type { VariantRow } from './types';

type PoFormBodyProps = { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[]; compact?: boolean };

/** The Create purchase order form's fields — shared by the standalone Create PO modal
 * (PoModals.tsx) and the New Product wizard's Purchase order step. Pass `compact` in the
 * narrow wizard (max-w-2xl) so the items table tightens its fixed columns; the wide Create
 * PO modal (max-w-5xl) uses the comfortable density by default. */
export default function PoFormBody({ po, variants, compact }: PoFormBodyProps) {
  const rows = variants.filter((v) => v.id in po.quantities);
  const selectedSupplier = po.supplierOptions.find((s) => s.id === po.supplierId) ?? null;

  return (
    <div className="space-y-3">
      <Field label="Supplier" error={po.createErrors.supplierId}>
        <select
          value={po.supplierId}
          onChange={(e) => po.setSupplierId(e.target.value)}
          className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer"
        >
          <option value="">Select a supplier</option>
          {po.supplierOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {selectedSupplier && <p className="mt-1 text-[10px] leading-tight text-inventory-text-subtle">{selectedSupplier.poEmail}</p>}
      </Field>

      <div className="grid gap-x-[7px] gap-y-[8px] sm:grid-cols-2">
        <Field label="Reference number">
          <input
            type="text"
            value={po.referenceNumber}
            onChange={(e) => po.setReferenceNumber(e.target.value)}
            placeholder="Supplier or internal reference"
            className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] uppercase leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:normal-case"
          />
        </Field>

        <Field label="Delivery date">
          <input
            type="date"
            value={po.deliveryDate}
            onChange={(e) => po.setDeliveryDate(e.target.value)}
            className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
        </Field>
      </div>

      <Field label="PO Remark">
        <textarea
          rows={2}
          value={po.poRemark}
          onChange={(e) => po.setPoRemark(e.target.value)}
          placeholder="Optional notes"
          className="w-full resize-none rounded-[7px] border border-inventory-border-strong px-[6px] py-[4px] text-[11px] uppercase leading-tight outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:normal-case"
        />
      </Field>

      <Field label="Shipping Remark">
        <textarea
          rows={2}
          value={po.shippingRemark}
          onChange={(e) => po.setShippingRemark(e.target.value)}
          placeholder="NF.{ORDERNUMBER}, color: , size: , quantity: , made in china."
          className="w-full resize-none rounded-[7px] border border-inventory-border-strong px-[6px] py-[4px] text-[11px] uppercase leading-tight outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring placeholder:normal-case"
        />
        <p className="mt-1 text-[10px] leading-tight text-inventory-text-subtle">
          <button
            type="button"
            onClick={() => po.setShippingRemark('NF.{orderNumber}')}
            className="mr-1 rounded-[5px] border border-inventory-secondary/30 bg-inventory-secondary/10 px-[5px] py-[1px] text-[10px] font-bold leading-none text-inventory-secondary transition-colors duration-150 hover:bg-inventory-secondary/15 cursor-pointer"
          >
            Use
          </button>
          {'NF.{ORDERNUMBER}'} — replaced with the PO number when the order is created.
        </p>
      </Field>

      <Field label="Items" error={po.createErrors.items}>
        <PoItemsTable
          rows={rows}
          quantities={po.quantities}
          skus={po.skus}
          costs={po.costs}
          onQuantityChange={po.setQuantity}
          onSkuChange={po.setSku}
          onCostChange={po.setCost}
          onFillQuantities={po.setAllQuantities}
          compact={compact}
        />
      </Field>

      {po.createErrors.general && <p className="text-[11px] text-inventory-danger">{po.createErrors.general}</p>}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">{label}</label>
      {children}
      {error && <p className="mt-1 text-[10px] leading-tight text-inventory-danger">{error}</p>}
    </div>
  );
}
