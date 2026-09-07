'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import PoItemsTable from './PoItemsTable';
import ReceivePoModal from './ReceivePoModal';
import type { usePurchaseOrder } from './hooks/usePurchaseOrder';
import type { VariantRow } from './types';

type PoModalsProps = { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[] };

export default function PoModals({ po, variants }: PoModalsProps) {
  return (
    <>
      {po.createOpen && <CreatePoModal po={po} variants={variants} />}
      {po.receiveTarget && <ReceivePoModal po={po} />}
    </>
  );
}

function CreatePoModal({ po, variants }: { po: ReturnType<typeof usePurchaseOrder>; variants: VariantRow[] }) {
  const rows = variants.filter((v) => v.id in po.quantities);
  const selectedSupplier = po.supplierOptions.find((s) => s.id === po.supplierId) ?? null;

  return (
    <ModalShell
      title="Create purchase order"
      onClose={po.closeCreate}
      extraWide
      footer={<ModalActions onCancel={po.closeCreate} onConfirm={po.saveAndSend} confirmLabel={po.saving ? 'Saving...' : 'Save and send'} disabled={po.saving} />}
    >
      <div className="space-y-4">
        <Field label="Supplier" error={po.createErrors.supplierId}>
          <select
            value={po.supplierId}
            onChange={(e) => po.setSupplierId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Select a supplier</option>
            {po.supplierOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {selectedSupplier && <p className="mt-1 text-xs text-gray-400">{selectedSupplier.poEmail}</p>}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reference number">
            <input
              type="text"
              value={po.referenceNumber}
              onChange={(e) => po.setReferenceNumber(e.target.value)}
              placeholder="Supplier or internal reference"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
          </Field>

          <Field label="Delivery date">
            <input
              type="date"
              value={po.deliveryDate}
              onChange={(e) => po.setDeliveryDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            />
          </Field>
        </div>

        <Field label="Remark">
          <textarea
            rows={2}
            value={po.remark}
            onChange={(e) => po.setRemark(e.target.value)}
            placeholder="Optional notes"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
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

        {po.createErrors.general && <p className="text-sm text-red-600">{po.createErrors.general}</p>}
      </div>
    </ModalShell>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
