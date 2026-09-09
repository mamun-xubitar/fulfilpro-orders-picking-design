'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import type { useSuppliers } from './hooks/useSuppliers';

type SupplierModalProps = { suppliers: ReturnType<typeof useSuppliers> };

/** Create/edit supplier — the field set is exactly the Supplier model's columns (Shopify has no
 * supplier resource of its own; `vendor` there is a plain product string). */
export default function SupplierModal({ suppliers: s }: SupplierModalProps) {
  if (!s.modalOpen) return null;

  const disabled = s.form.name.trim() === '' || s.form.poEmail.trim() === '';

  return (
    <ModalShell
      title={s.editingId ? 'Edit supplier' : 'Add supplier'}
      onClose={s.closeModal}
      elevated
      footer={<ModalActions onCancel={s.closeModal} onConfirm={s.save} confirmLabel={s.saving ? 'Saving...' : 'Save'} disabled={disabled || s.saving} />}
    >
      <div className="space-y-3">
        <TextField label="Name" value={s.form.name} onChange={s.set('name')} placeholder="Acme Apparel Co." error={s.saveErrors.name} />
        <TextField label="PO email" value={s.form.poEmail} onChange={s.set('poEmail')} placeholder="orders@acme.example" error={s.saveErrors.poEmail} />
        <TextField label="Contact email" value={s.form.contactEmail} onChange={s.set('contactEmail')} placeholder="Optional" error={s.saveErrors.contactEmail} />
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Description</label>
          <textarea
            rows={3}
            value={s.form.description}
            onChange={s.set('description')}
            placeholder="Optional notes"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {s.saveErrors.general && <p className="text-sm text-red-600">{s.saveErrors.general}</p>}
      </div>
    </ModalShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
