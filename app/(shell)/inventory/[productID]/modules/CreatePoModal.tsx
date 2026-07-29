'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import PoVariantQtyRows from './PoVariantQtyRows';
import type { usePurchaseOrders } from './hooks/usePurchaseOrders';
import type { SupplierOption, VariantDetail } from './types';

type CreatePoModalProps = {
  po: ReturnType<typeof usePurchaseOrders>;
  supplierOptions: SupplierOption[];
  variants: VariantDetail[];
};

export default function CreatePoModal({ po, supplierOptions, variants }: CreatePoModalProps) {
  if (!po.createOpen) return null;

  const selectedSupplier = supplierOptions.find((s) => s.id === po.supplierId) ?? null;

  return (
    <ModalShell
      title="Create purchase order"
      onClose={po.closeCreate}
      wide
      footer={
        <ModalActions
          onCancel={po.closeCreate}
          onConfirm={po.saveAndSend}
          confirmLabel={po.saving ? 'Saving...' : 'Save and send'}
          disabled={po.saving}
        />
      }
    >
      <div className="space-y-4">
        <Field label="Supplier" error={po.createErrors.supplierId}>
          <select
            value={po.supplierId}
            onChange={(e) => po.setSupplierId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Select a supplier</option>
            {supplierOptions.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          {selectedSupplier && <p className="text-xs text-gray-400 mt-1">{selectedSupplier.poEmail}</p>}
        </Field>

        <Field label="Delivery date" error={po.createErrors.deliveryDate}>
          <input
            type="date"
            value={po.deliveryDate}
            onChange={(e) => po.setDeliveryDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </Field>

        <Field label="Remark" error={po.createErrors.remark}>
          <textarea
            rows={2}
            value={po.remark}
            onChange={(e) => po.setRemark(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="Optional notes"
          />
        </Field>

        <Field label="Items" error={po.createErrors.items}>
          <PoVariantQtyRows variants={variants} quantities={po.quantities} onQuantityChange={po.setQuantity} />
        </Field>

        {po.createErrors.general && <p className="text-sm text-red-600">{po.createErrors.general}</p>}
      </div>
    </ModalShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
