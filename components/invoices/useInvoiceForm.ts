'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import useRequest from '@/hooks/useRequest';
import type { BillingStore } from '@/hooks/useStoreOptions';
import { round2, taxRegionForCountry, type TaxRegion } from '@/lib/invoice-totals';
import { pickedFromRow, type CustomerApiRow, type PickedCustomer } from './CustomerPicker';
import {
  blankLine,
  buildInvoicePayload,
  rateFor,
  totalsForForm,
  validateInvoiceForm,
  type InvoiceDetail,
  type InvoiceFormValues,
  type LineForm,
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
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const { request, loading, errors, setErrors } = useRequest<InvoiceDetail>();
  const { request: requestCustomer } = useRequest<CustomerApiRow>();
  const totals = useMemo(() => totalsForForm(form), [form]);
  const savedBalance = useMemo(() => (invoiceId ? totalsForForm(initial).balance : 0), [invoiceId, initial]);
  const storeOf = (storeId: string) => stores.find((candidate) => candidate.id === storeId);

  // An existing invoice only stores the customer's id: load it for the picker label, ship-to choices and credit check.
  useEffect(() => {
    const source = initial.customerId ? 'system' : initial.shopifyCustomerId ? 'shopify' : null;
    if (!source) return;
    void requestCustomer({
      url: `/api/customers/${initial.customerId || initial.shopifyCustomerId}`,
      method: 'GET',
      showToast: false,
      data: { source },
      onSuccess: ({ data }) => {
        const picked = pickedFromRow(data, source);
        setCustomer(picked);
        setForm((prev) => ({ ...prev, customerLabel: picked.company || picked.name }));
      },
    });
  }, [initial.customerId, initial.shopifyCustomerId, requestCustomer]);

  const patch = (values: Partial<InvoiceFormValues>) => setForm((prev) => ({ ...prev, ...values }));
  const set = (field: keyof InvoiceFormValues) => (event: FieldEvent) => patch({ [field]: event.target.value });

  /** A new region takes the store's rate for it. */
  const changeTaxRegion = (region: TaxRegion) => setForm((prev) => ({ ...prev, taxRegion: region, taxRate: rateFor(storeOf(prev.storeId), region) }));

  /** A new store keeps the tax region but takes that store's rate and default terms. Shopify customers
   * belong to one store, so that link is dropped; a system customer stays linked. */
  const changeStore = (storeId: string) => {
    const store = storeOf(storeId);
    const dropShopify = Boolean(form.shopifyCustomerId);
    if (dropShopify) setCustomer(null);
    setForm((prev) => {
      const termsUntouched = !prev.terms.trim() || prev.terms === storeOf(prev.storeId)?.defaultTerms;
      return {
        ...prev,
        storeId,
        taxRate: rateFor(store, prev.taxRegion),
        terms: termsUntouched ? (store?.defaultTerms ?? '') : prev.terms,
        ...(dropShopify ? { shopifyCustomerId: '', customerLabel: '' } : {}),
      };
    });
  };

  /** Picking a customer fills bill-to and ship-to (its default shipping address) and the customer's
   * invoice defaults: currency and tax region for system customers, the country's region otherwise. */
  const applyCustomer = (picked: PickedCustomer) => {
    const region = (picked.taxRegion as TaxRegion | null) ?? taxRegionForCountry(picked.country);
    const name = picked.company || picked.name;
    const shipTo = picked.shipTo[0];
    setCustomer(picked);
    patch({
      customerId: picked.source === 'system' ? picked.id : '',
      shopifyCustomerId: picked.source === 'shopify' ? picked.id : '',
      customerLabel: name,
      billToName: name,
      billToAddress: picked.address,
      shipToName: shipTo?.name ?? name,
      shipToAddress: shipTo?.address ?? picked.address,
      ...(picked.currencyCode ? { currencyCode: picked.currencyCode } : {}),
      taxRegion: region,
      taxRate: rateFor(storeOf(form.storeId), region),
    });
  };

  const chooseShipTo = (index: number) => {
    const option = customer?.shipTo[index];
    if (option) patch({ shipToName: option.name, shipToAddress: option.address });
  };

  // Non-blocking: the customer's other open invoices plus what this one leaves owing, against the limit.
  const creditWarning = useMemo(() => {
    if (!customer || customer.creditLimit == null) return null;
    const owing = round2(customer.balance - savedBalance + totals.balance);
    return owing > customer.creditLimit ? { owing, limit: customer.creditLimit } : null;
  }, [customer, savedBalance, totals.balance]);

  const updateLine = (key: string, values: Partial<LineForm>) =>
    setForm((prev) => ({ ...prev, lines: prev.lines.map((line) => (line.key === key ? { ...line, ...values } : line)) }));
  const addLine = (values?: Partial<LineForm>) => setForm((prev) => ({ ...prev, lines: [...prev.lines, { ...blankLine(), ...values }] }));
  const removeLine = (key: string) => setForm((prev) => ({ ...prev, lines: prev.lines.filter((line) => line.key !== key) }));

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
    changeTaxRegion,
    applyCustomer,
    customer,
    chooseShipTo,
    creditWarning,
    updateLine,
    addLine,
    removeLine,
    save,
    saving: loading,
    errors,
    clearErrors: () => setErrors({}),
  };
}
