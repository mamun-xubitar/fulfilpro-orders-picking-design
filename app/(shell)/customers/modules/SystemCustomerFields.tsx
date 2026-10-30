'use client';

import AddressesEditor from './AddressesEditor';
import ContactsEditor from './ContactsEditor';
import { COUNTRY_LIST_ID, HIDE_LIST_ARROW } from './EditableRows';
import { Field, INPUT, type FieldChange, type TextField } from './CustomerField';
import type { AddressForm, ContactForm, CustomerFormValues } from './types';

type SystemCustomerFieldsProps = {
  form: CustomerFormValues;
  errors: Record<string, string>;
  onChange: FieldChange;
  onContactsChange: (contacts: ContactForm[]) => void;
  onAddressesChange: (addresses: AddressForm[]) => void;
};

const COUNTRIES = ['Australia', 'New Zealand'];

/** A system customer, laid out like the old system: details on top, contacts beside shipping addresses. */
export default function SystemCustomerFields({ form, errors, onChange, onContactsChange, onAddressesChange }: SystemCustomerFieldsProps) {
  const text = (field: TextField, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input type="text" name={field} className={INPUT} value={form[field]} onChange={onChange(field)} {...props} />
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name" error={errors.name}>{text('name', { autoComplete: 'name' })}</Field>
        <Field label="Company" error={errors.company}>{text('company', { autoComplete: 'organization' })}</Field>
        <Field label="Type" error={errors.type}>{text('type', { placeholder: 'e.g. Club, School', autoComplete: 'off' })}</Field>
        <Field label="Credit limit" error={errors.creditLimit}>
          <input type="number" min="0" step="0.01" className={INPUT} value={form.creditLimit} onChange={onChange('creditLimit')} placeholder="No limit" />
        </Field>
        <Field label="Currency" error={errors.currencyCode}>
          <select className={INPUT} value={form.currencyCode} onChange={onChange('currencyCode')}>
            <option value="AUD">AUD</option>
            <option value="NZD">NZD</option>
          </select>
        </Field>
        <Field label="Country" error={errors.country}>
          {text('country', { list: COUNTRY_LIST_ID, className: `${INPUT} ${HIDE_LIST_ARROW}`, placeholder: 'e.g. Australia', autoComplete: 'off' })}
        </Field>
      </div>
      <datalist id={COUNTRY_LIST_ID}>{COUNTRIES.map((country) => <option key={country} value={country} />)}</datalist>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ContactsEditor contacts={form.contacts} error={errors.contacts} onChange={onContactsChange} />
        <AddressesEditor addresses={form.addresses} error={errors.addresses} onChange={onAddressesChange} />
      </div>
    </>
  );
}
