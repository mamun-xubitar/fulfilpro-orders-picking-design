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

export const blankContact = (): ContactForm => ({
  key: nextKey(),
  name: '',
  email: '',
  phone: '',
  jobTitle: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
});

export const blankAddress = (): AddressForm => ({
  key: nextKey(),
  label: '',
  name: '',
  email: '',
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

/** The blank cards a customer form always shows, so the inputs are there before anything is added. */
const blankChildren = () => ({ contacts: [blankContact()], addresses: [{ ...blankAddress(), isDefault: true }] });

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
  contacts: (row.contacts ?? []).map((contact) => ({
    key: nextKey(),
    name: contact.name,
    email: text(contact.email),
    phone: text(contact.phone),
    jobTitle: text(contact.jobTitle),
    address: text(contact.address),
    city: text(contact.city),
    state: text(contact.state),
    zip: text(contact.zip),
    country: text(contact.country),
  })),
  addresses: (row.addresses ?? []).map((address) => ({
    ...blankAddress(),
    label: text(address.label),
    name: address.name,
    email: text(address.email),
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

/** A form for `row`; a customer with no contacts or no addresses gets a blank card to fill in. */
const toFormWithCards = (row: CustomerRow): CustomerFormValues => {
  const form = toForm(row);
  const blank = blankChildren();
  return {
    ...form,
    contacts: form.contacts.length ? form.contacts : blank.contacts,
    addresses: form.addresses.length ? form.addresses : blank.addresses,
  };
};

/** Drops the key and any card the user left untouched, so a blank placeholder is never saved or validated. */
const prune = <T extends { key: string; isDefault?: boolean }>(rows: T[]) =>
  rows
    .filter(({ key, isDefault, ...fields }) => (void key, void isDefault, Object.values(fields).some((value) => String(value).trim())))
    .map(({ key, ...row }) => (void key, row));

function validate(form: CustomerFormValues, source: CustomerSource, creating: boolean) {
  const contacts = prune(form.contacts);
  const addresses = prune(form.addresses);
  const next: Record<string, string> = {};
  if (!form.name.trim()) next.name = 'Name is required';
  if (source === 'shopify' && form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
  if (source === 'shopify' && creating && !form.storeId) next.storeId = 'Choose a store';
  if (form.creditLimit.trim() && !(Number(form.creditLimit) >= 0)) next.creditLimit = 'Credit limit must be 0 or more';
  if (contacts.some((contact) => !contact.name.trim())) next.contacts = 'Every contact needs a name';
  else if (contacts.some((contact) => contact.email.trim() && !EMAIL_RE.test(contact.email.trim()))) next.contacts = 'A contact has an invalid email';
  if (addresses.some((address) => !address.name.trim())) next.addresses = 'Every address needs a name';
  else if (addresses.some((address) => address.email.trim() && !EMAIL_RE.test(address.email.trim()))) next.addresses = 'An address has an invalid email';
  return next;
}

/** Create / edit form for one customer, on either tab. System customers also edit contacts and addresses. */
export function useCustomerForm(source: CustomerSource, onSaved: (saved: CustomerRow) => void) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_CUSTOMER_FORM);
  const { request, loading, errors, setErrors } = useRequest<CustomerRow>();
  const detailReq = useRequest<CustomerRow>();

  const show = (row: CustomerRow | null, values: CustomerFormValues) => {
    setEditing(row);
    setForm(values);
    setErrors({});
    setOpen(true);
  };

  const openCreate = (defaultStoreId = '') => show(null, { ...EMPTY_CUSTOMER_FORM, ...blankChildren(), storeId: defaultStoreId });

  /** List rows already carry contacts and addresses; the fetch makes sure the form edits the latest copy. */
  const openEdit = (row: CustomerRow) => {
    show(row, toFormWithCards(row));
    void detailReq.request({
      url: `/api/customers/${row.id}?source=${source}`,
      method: 'GET',
      showToast: false,
      onSuccess: ({ data }) => show(data, toFormWithCards(data)),
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
      data: { ...form, contacts: prune(form.contacts), addresses: prune(form.addresses) },
      validation: async () => validate(form, source, !editing),
      onSuccess: ({ data }) => {
        close();
        onSaved(data);
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
