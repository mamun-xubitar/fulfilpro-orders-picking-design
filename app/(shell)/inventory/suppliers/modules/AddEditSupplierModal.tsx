'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import type { SupplierForm, SupplierRow } from './types';

type Props = {
  open: boolean;
  editSupplier: SupplierRow | null;
  form: SupplierForm;
  set: (field: keyof SupplierForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: Record<string, string>;
  loading: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

export default function AddEditSupplierModal({ open, editSupplier, form, set, errors, loading, onSubmit, onClose }: Props) {
  if (!open) return null;

  return (
    <ModalShell title={editSupplier ? 'Edit supplier' : 'Add supplier'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Name" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Supplier name"
          />
        </Field>

        <Field label="PO email" error={errors.poEmail}>
          <input
            type="email"
            value={form.poEmail}
            onChange={set('poEmail')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="orders@supplier.com"
          />
        </Field>

        <Field label="Contact email" error={errors.contactEmail}>
          <input
            type="email"
            value={form.contactEmail}
            onChange={set('contactEmail')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Optional"
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            rows={3}
            value={form.description}
            onChange={set('description')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="Optional notes"
          />
        </Field>

        {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
      </div>

      <div className="mt-4">
        <ModalActions
          onCancel={onClose}
          onConfirm={onSubmit}
          confirmLabel={loading ? 'Saving...' : editSupplier ? 'Save changes' : 'Add supplier'}
          disabled={loading}
        />
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
