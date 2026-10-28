'use client';

import { useState, type ChangeEvent } from 'react';
import useRequest from '@/hooks/useRequest';
import { EMPTY_CUSTOMER_FORM, type CustomerFormValues, type CustomerRow, type CustomerSource } from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toForm = (row: CustomerRow): CustomerFormValues => ({
  name: row.name,
  company: row.company ?? '',
  email: row.email ?? '',
  phone: row.phone ?? '',
  address: row.address ?? '',
  address2: row.address2 ?? '',
  city: row.city ?? '',
  state: row.state ?? '',
  zip: row.zip ?? '',
  country: row.country ?? '',
  notes: row.notes ?? '',
  storeId: row.storeId ?? '',
});

/** Create / edit form for one customer, on either tab. */
export function useCustomerForm(source: CustomerSource, onSaved: () => void) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_CUSTOMER_FORM);
  const { request, loading, errors, setErrors } = useRequest();

  const openCreate = (defaultStoreId = '') => {
    setEditing(null);
    setForm({ ...EMPTY_CUSTOMER_FORM, storeId: defaultStoreId });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (row: CustomerRow) => {
    setEditing(row);
    setForm(toForm(row));
    setErrors({});
    setOpen(true);
  };

  const close = () => setOpen(false);

  const set = (field: keyof CustomerFormValues) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const save = () => {
    void request({
      url: editing ? `/api/customers/${editing.id}?source=${source}` : `/api/customers?source=${source}`,
      method: editing ? 'PATCH' : 'POST',
      data: { ...form },
      validation: async () => {
        const next: Record<string, string> = {};
        if (!form.name.trim()) next.name = 'Name is required';
        if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
        if (source === 'shopify' && !editing && !form.storeId) next.storeId = 'Choose a store';
        return next;
      },
      onSuccess: () => {
        close();
        onSaved();
      },
    });
  };

  return { open, editing, form, set, save, close, openCreate, openEdit, saving: loading, errors };
}
