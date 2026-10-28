'use client';

import { useState, type ChangeEvent } from 'react';
import useRequest from '@/hooks/useRequest';
import {
  EMPTY_CUSTOMER_FORM,
  type AddressForm,
  type ContactForm,
  type CustomerFormValues,
  type CustomerRow,
  type CustomerSource,
} from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let keyCounter = 0;
const nextKey = () => `c${(keyCounter += 1)}`;

export const blankContact = (): ContactForm => ({ key: nextKey(), name: '', email: '', phone: '', jobTitle: '' });

export const blankAddress = (): AddressForm => ({
  key: nextKey(),
  label: '',
  name: '',
  phone: '',
  address: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  isDefault: false,
});

const text = (value: string | null | undefined) => value ?? '';

const toForm = (row: CustomerRow): CustomerFormValues => ({
  name: row.name,
  company: text(row.company),
  email: text(row.email),
  phone: text(row.phone),
  address: text(row.address),
  address2: text(row.address2),
  city: text(row.city),
  state: text(row.state),
  zip: text(row.zip),
  country: text(row.country),
  notes: text(row.notes),
  storeId: text(row.storeId),
  type: text(row.type),
  creditLimit: row.creditLimit == null ? '' : String(row.creditLimit),
  currencyCode: row.currencyCode ?? 'AUD',
  taxRegion: row.taxRegion ?? 'AU',
  contacts: (row.contacts ?? []).map((contact) => ({
    key: nextKey(),
    name: contact.name,
    email: text(contact.email),
    phone: text(contact.phone),
    jobTitle: text(contact.jobTitle),
  })),
  addresses: (row.addresses ?? []).map((address) => ({
    ...blankAddress(),
    label: text(address.label),
    name: address.name,
    phone: text(address.phone),
    address: text(address.address),
    address2: text(address.address2),
    city: text(address.city),
    state: text(address.state),
    zip: text(address.zip),
    country: text(address.country),
    isDefault: address.isDefault,
  })),
});

const stripKeys = <T extends { key: string }>(rows: T[]) => rows.map(({ key, ...row }) => (void key, row));

function validate(form: CustomerFormValues, source: CustomerSource, creating: boolean) {
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = 'Name is required';
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
  if (source === 'shopify' && creating && !form.storeId) next.storeId = 'Choose a store';
  if (form.creditLimit.trim() && !(Number(form.creditLimit) >= 0)) next.creditLimit = 'Credit limit must be 0 or more';
  if (form.contacts.some((contact) => !contact.name.trim())) next.contacts = 'Every contact needs a name';
  else if (form.contacts.some((contact) => contact.email.trim() && !EMAIL_RE.test(contact.email.trim()))) next.contacts = 'A contact has an invalid email';
  if (form.addresses.some((address) => !address.name.trim())) next.addresses = 'Every address needs a name';
  return next;
}

/** Create / edit form for one customer, on either tab. System customers also edit contacts and addresses. */
export function useCustomerForm(source: CustomerSource, onSaved: () => void) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_CUSTOMER_FORM);
  const { request, loading, errors, setErrors } = useRequest();
  const detailReq = useRequest<CustomerRow>();

  const show = (row: CustomerRow | null, values: CustomerFormValues) => {
    setEditing(row);
    setForm(values);
    setErrors({});
    setOpen(true);
  };

  const openCreate = (defaultStoreId = '') => show(null, { ...EMPTY_CUSTOMER_FORM, storeId: defaultStoreId });

  /** List rows already carry contacts and addresses; the fetch makes sure the form edits the latest copy. */
  const openEdit = (row: CustomerRow) => {
    show(row, toForm(row));
    void detailReq.request({
      url: `/api/customers/${row.id}?source=${source}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => show(data, toForm(data)),
    });
  };

  const close = () => setOpen(false);

  const set = (field: keyof CustomerFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const setContacts = (contacts: ContactForm[]) => setForm((prev) => ({ ...prev, contacts }));
  const setAddresses = (addresses: AddressForm[]) => setForm((prev) => ({ ...prev, addresses }));

  const save = () => {
    void request({
      url: editing ? `/api/customers/${editing.id}?source=${source}` : `/api/customers?source=${source}`,
      method: editing ? 'PATCH' : 'POST',
      data: { ...form, contacts: stripKeys(form.contacts), addresses: stripKeys(form.addresses) },
      validation: async () => validate(form, source, !editing),
      onSuccess: () => {
        close();
        onSaved();
      },
    });
  };

  return {
    open,
    editing,
    form,
    set,
    setContacts,
    setAddresses,
    save,
    close,
    openCreate,
    openEdit,
    loadingDetail: detailReq.loading,
    saving: loading,
    errors,
  };
}
