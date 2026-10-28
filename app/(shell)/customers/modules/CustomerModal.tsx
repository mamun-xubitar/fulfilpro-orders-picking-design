'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import type { BillingStore } from '@/hooks/useStoreOptions';
import type { CustomerFormValues, CustomerSource } from './types';

type CustomerModalProps = {
  source: CustomerSource;
  editing: boolean;
  form: CustomerFormValues;
  errors: Record<string, string>;
  saving: boolean;
  stores: BillingStore[];
  onChange: (field: keyof CustomerFormValues) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSave: () => void;
  onClose: () => void;
};

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL = 'mb-1 block text-xs font-medium uppercase text-gray-500';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function CustomerModal({ source, editing, form, errors, saving, stores, onChange, onSave, onClose }: CustomerModalProps) {
  const text = (field: keyof CustomerFormValues, placeholder = '') => (
    <input type="text" className={INPUT} value={form[field]} onChange={onChange(field)} placeholder={placeholder} />
  );

  return (
    <ModalShell
      title={editing ? 'Edit customer' : 'New customer'}
      onClose={onClose}
      wide
      disableBackdropClose
      footer={<ModalActions onCancel={onClose} onConfirm={onSave} confirmLabel={saving ? 'Saving...' : 'Save'} disabled={saving} />}
    >
      <div className="space-y-4">
        {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
        {source === 'shopify' && !editing && (
          <Field label="Store" error={errors.storeId}>
            <select className={INPUT} value={form.storeId} onChange={onChange('storeId')}>
              <option value="">Choose a store…</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name}>{text('name', 'Contact name')}</Field>
          <Field label="Company" error={errors.company}>{text('company')}</Field>
          <Field label="Email" error={errors.email}>{text('email', 'name@example.com')}</Field>
          <Field label="Phone" error={errors.phone}>{text('phone')}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address">{text('address')}</Field>
          <Field label="Address 2">{text('address2')}</Field>
          <Field label="City">{text('city')}</Field>
          <Field label="State">{text('state')}</Field>
          <Field label="Postcode">{text('zip')}</Field>
          <Field label="Country">{text('country', 'e.g. Australia')}</Field>
        </div>
        <Field label="Notes" error={errors.notes}>
          <textarea className={`${INPUT} min-h-20`} value={form.notes} onChange={onChange('notes')} />
        </Field>
      </div>
    </ModalShell>
  );
}
