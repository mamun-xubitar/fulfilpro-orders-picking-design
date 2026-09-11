'use client';

import PoItemsTable from './PoItemsTable';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import type { VariantRow } from './types';

type PoFormBodyProps = { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[] };

/** The Create purchase order form's fields — shared by the standalone Create PO modal
 * (PoModals.tsx) and the New Product wizard's Purchase order step. */
export default function PoFormBody({ po, variants }: PoFormBodyProps) {
  const rows = variants.filter((v) => v.id in po.quantities);
  const selectedSupplier = po.supplierOptions.find((s) => s.id === po.supplierId) ?? null;

  return (
    <div className="space-y-3">
      <Field label="Supplier" error={po.createErrors.supplierId}>
        <select
          value={po.supplierId}
          onChange={(e) => po.setSupplierId(e.target.value)}
          className="h-[24px] w-full rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
        >
          <option value="">Select a supplier</option>
          {po.supplierOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {selectedSupplier && <p className="mt-1 text-[10px] leading-tight text-gray-400">{selectedSupplier.poEmail}</p>}
      </Field>

      <div className="grid gap-x-[7px] gap-y-[8px] sm:grid-cols-2">
        <Field label="Reference number">
          <input
            type="text"
            value={po.referenceNumber}
            onChange={(e) => po.setReferenceNumber(e.target.value)}
            placeholder="Supplier or internal reference"
            className="h-[24px] w-full rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </Field>

        <Field label="Delivery date">
          <input
            type="date"
            value={po.deliveryDate}
            onChange={(e) => po.setDeliveryDate(e.target.value)}
            className="h-[24px] w-full rounded-[7px] border border-gray-300 px-[6px] text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </Field>
      </div>

      <Field label="Remark">
        <textarea
          rows={2}
          value={po.remark}
          onChange={(e) => po.setRemark(e.target.value)}
          placeholder="Optional notes"
          className="w-full resize-none rounded-[7px] border border-gray-300 px-[6px] py-[4px] text-[11px] leading-tight outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
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
        />
      </Field>

      {po.createErrors.general && <p className="text-[11px] text-red-600">{po.createErrors.general}</p>}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-gray-500">{label}</label>
      {children}
      {error && <p className="mt-1 text-[10px] leading-tight text-red-600">{error}</p>}
    </div>
  );
}
