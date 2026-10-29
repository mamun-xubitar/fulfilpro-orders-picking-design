'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import type { BillingStore } from '@/hooks/useStoreOptions';
import { Field, INPUT, type FieldChange, type TextField } from './CustomerField';
import SystemCustomerFields from './SystemCustomerFields';
import type { AddressForm, ContactForm, CustomerFormValues, CustomerSource } from './types';

type CustomerModalProps = {
  source: CustomerSource;
  editing: boolean;
  form: CustomerFormValues;
  errors: Record<string, string>;
  saving: boolean;
  stores: BillingStore[];
  onChange: FieldChange;
  onContactsChange: (contacts: ContactForm[]) => void;
  onAddressesChange: (addresses: AddressForm[]) => void;
  onSave: () => void;
  onClose: () => void;
};

/** Browser autofill tokens, so a saved address fills the matching fields. */
const AUTOCOMPLETE: Partial<Record<TextField, string>> = {
  name: 'name',
  company: 'organization',
  email: 'email',
  phone: 'tel',
  address: 'address-line1',
  address2: 'address-line2',
  city: 'address-level2',
  state: 'address-level1',
  zip: 'postal-code',
  country: 'country-name',
};

export default function CustomerModal(props: CustomerModalProps) {
  const { source, editing, form, errors, saving, stores, onChange } = props;
  const system = source === 'system';
  const text = (field: TextField, placeholder = '') => (
    <input
      type="text"
      name={field}
      autoComplete={AUTOCOMPLETE[field] ?? 'off'}
      className={INPUT}
      value={form[field]}
      onChange={onChange(field)}
      placeholder={placeholder}
    />
  );

  return (
    <ModalShell
      title={editing ? 'Edit customer' : 'New customer'}
      onClose={props.onClose}
      wide={!system}
      extraWide={system}
      elevated
      disableBackdropClose
      footer={<ModalActions onCancel={props.onClose} onConfirm={props.onSave} confirmLabel={saving ? 'Saving...' : 'Save'} disabled={saving} />}
    >
      {/* A form of its own keeps browser autofill inside the modal, away from the page's search box. */}
      <form autoComplete="on" onSubmit={(event) => event.preventDefault()} className="space-y-4">
        {errors.general && <p className="text-sm text-red-600">{errors.general}</p>}
        {system ? (
          <SystemCustomerFields form={form} errors={errors} onChange={onChange} onContactsChange={props.onContactsChange} onAddressesChange={props.onAddressesChange} />
        ) : (
          <>
            {!editing && (
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
            <h4 className="border-b border-gray-100 pb-1 text-sm font-semibold text-gray-900">Address</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address">{text('address')}</Field>
              <Field label="Address 2">{text('address2')}</Field>
              <Field label="City">{text('city')}</Field>
              <Field label="State">{text('state')}</Field>
              <Field label="Postcode">{text('zip')}</Field>
              <Field label="Country">{text('country', 'e.g. Australia')}</Field>
            </div>
          </>
        )}
        <Field label="Notes" error={errors.notes}>
          <textarea className={`${INPUT} min-h-20`} value={form.notes} onChange={onChange('notes')} />
        </Field>
      </form>
    </ModalShell>
  );
}
