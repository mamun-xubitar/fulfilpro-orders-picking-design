'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import useRequest from '@/hooks/useRequest';
import type { BillingStore } from '@/hooks/useStoreOptions';
import {
  blankLine,
  blankPayment,
  buildInvoicePayload,
  taxFor,
  totalsForForm,
  validateInvoiceForm,
  type InvoiceDetail,
  type InvoiceFormValues,
  type LineForm,
  type PaymentForm,
} from './invoiceForm';

type FieldEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

/** Form state, live totals and save for the create / edit invoice modal. */
export function useInvoiceForm(args: {
  initial: InvoiceFormValues;
  invoiceId: string | null;
  stores: BillingStore[];
  onSaved: (invoice: InvoiceDetail) => void;
}) {
  const { initial, invoiceId, stores, onSaved } = args;
  const [form, setForm] = useState<InvoiceFormValues>(initial);
  const { request, loading, errors, setErrors } = useRequest<InvoiceDetail>();
  const totals = useMemo(() => totalsForForm(form), [form]);

  const patch = (values: Partial<InvoiceFormValues>) => setForm((prev) => ({ ...prev, ...values }));
  const set = (field: keyof InvoiceFormValues) => (event: FieldEvent) => patch({ [field]: event.target.value });

  const changeStore = (storeId: string) => {
    const store = stores.find((candidate) => candidate.id === storeId);
    setForm((prev) => {
      const tax = taxFor(store, null);
      const termsUntouched = !prev.terms.trim() || prev.terms === stores.find((s) => s.id === prev.storeId)?.defaultTerms;
      return {
        ...prev,
        storeId,
        taxRegion: tax.region,
        taxRate: tax.rate,
        terms: termsUntouched ? (store?.defaultTerms ?? '') : prev.terms,
        customerId: '',
        shopifyCustomerId: '',
        customerLabel: '',
      };
    });
  };

  /** Picking a customer fills bill-to / ship-to and switches tax to that customer's country. */
  const applyCustomer = (customer: { id: string; source: 'system' | 'shopify'; name: string; company: string | null; address: string; country: string | null }) => {
    const store = stores.find((candidate) => candidate.id === form.storeId);
    const tax = taxFor(store, customer.country);
    const name = customer.company || customer.name;
    patch({
      customerId: customer.source === 'system' ? customer.id : '',
      shopifyCustomerId: customer.source === 'shopify' ? customer.id : '',
      customerLabel: name,
      billToName: name,
      billToAddress: customer.address,
      shipToName: name,
      shipToAddress: customer.address,
      taxRegion: tax.region,
      taxRate: tax.rate,
    });
  };

  const updateLine = (key: string, values: Partial<LineForm>) =>
    setForm((prev) => ({ ...prev, lines: prev.lines.map((line) => (line.key === key ? { ...line, ...values } : line)) }));
  const addLine = (values?: Partial<LineForm>) => setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...blankLine(), ...values }] }));
  const removeLine = (key: string) => setForm((prev) => ({ ...prev, lines: prev.lines.filter((line) => line.key !== key) }));

  const updatePayment = (key: string, values: Partial<PaymentForm>) =>
    setForm((prev) => ({ ...prev, payments: prev.payments.map((payment) => (payment.key === key ? { ...payment, ...values } : payment)) }));
  const addPayment = () =>
    setForm((prev) => {
      const owing = Math.max(0, totalsForForm(prev).balance);
      return { ...prev, payments: [...prev.payments, { ...blankPayment(), amount: owing ? String(owing) : '' }] };
    });
  const removePayment = (key: string) => setForm((prev) => ({ ...prev, payments: prev.payments.filter((payment) => payment.key !== key) }));

  const save = () => {
    void request({
      url: invoiceId ? `/api/invoices/${invoiceId}` : '/api/invoices',
      method: invoiceId ? 'PATCH' : 'POST',
      data: buildInvoicePayload(form),
      validation: async () => validateInvoiceForm(form),
      onSuccess: ({ data }) => onSaved(data),
    });
  };

  return {
    form,
    set,
    patch,
    totals,
    changeStore,
    applyCustomer,
    updateLine,
    addLine,
    removeLine,
    updatePayment,
    addPayment,
    removePayment,
    save,
    saving: loading,
    errors,
    clearErrors: () => setErrors({}),
  };
}
