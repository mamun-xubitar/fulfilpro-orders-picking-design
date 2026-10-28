import { computeInvoiceTotals, taxRateForRegion, taxRegionForCountry, type PaymentStatus, type TaxRegion } from '@/lib/invoice-totals';
import type { BillingStore } from '@/hooks/useStoreOptions';

export const PAYMENT_TYPES = ['Cash', 'Bank deposit', 'Card', 'Other'] as const;

export type InvoiceListRow = {
  id: string;
  invoiceNumber: string;
  storeId: string;
  storeName: string;
  billToName: string;
  issueDate: string;
  currencyCode: string;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
};

export type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  storeId: string;
  customerId: string | null;
  shopifyCustomerId: string | null;
  billToName: string;
  billToAddress: string | null;
  shipToName: string;
  shipToAddress: string | null;
  issueDate: string;
  dueDate: string | null;
  currencyCode: string;
  taxRegion: TaxRegion;
  taxRate: number;
  shipping: number;
  notes: string | null;
  terms: string | null;
  paymentStatus: PaymentStatus;
  lineItems: Array<{ variantId: string | null; title: string; size: string | null; sku: string | null; qty: number; unitPrice: number; discountPercent: number }>;
  payments: Array<{ type: string; paidOn: string; amount: number; person: string | null; description: string | null }>;
};

export type LineForm = {
  key: string;
  variantId: string | null;
  title: string;
  size: string;
  sku: string;
  qty: string;
  unitPrice: string;
  discountPercent: string;
};

export type PaymentForm = {
  key: string;
  type: string;
  paidOn: string;
  amount: string;
  person: string;
  description: string;
};

export type InvoiceFormValues = {
  invoiceNumber: string;
  storeId: string;
  customerId: string;
  shopifyCustomerId: string;
  customerLabel: string;
  billToName: string;
  billToAddress: string;
  shipToName: string;
  shipToAddress: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  taxRegion: TaxRegion;
  taxRate: string;
  shipping: string;
  notes: string;
  terms: string;
  lines: LineForm[];
  payments: PaymentForm[];
};

let keyCounter = 0;
const nextKey = () => `k${(keyCounter += 1)}`;

export const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : '');

export const blankLine = (): LineForm => ({ key: nextKey(), variantId: null, title: '', size: '', sku: '', qty: '1', unitPrice: '', discountPercent: '' });

export const blankPayment = (): PaymentForm => ({ key: nextKey(), type: 'Cash', paidOn: todayIso(), amount: '', person: '', description: '' });

/** Tax for a store and ship-to country: the store's rate for that region. */
export function taxFor(store: BillingStore | undefined, country: string | null | undefined) {
  const region = taxRegionForCountry(country);
  const rates = { aus: store?.ausTaxRate ?? 11, nz: store?.nzTaxRate ?? 15 };
  return { region, rate: String(taxRateForRegion(region, rates)) };
}

export function blankForm(store?: BillingStore): InvoiceFormValues {
  const tax = taxFor(store, '');
  return {
    invoiceNumber: '',
    storeId: store?.id ?? '',
    customerId: '',
    shopifyCustomerId: '',
    customerLabel: '',
    billToName: '',
    billToAddress: '',
    shipToName: '',
    shipToAddress: '',
    issueDate: todayIso(),
    dueDate: '',
    currencyCode: 'AUD',
    taxRegion: tax.region,
    taxRate: tax.rate,
    shipping: '',
    notes: '',
    terms: store?.defaultTerms ?? '',
    lines: [blankLine()],
    payments: [],
  };
}

/** Edit keeps the number, dates and payments; copy starts a new invoice from the same content. */
export function formFromDetail(detail: InvoiceDetail, mode: 'edit' | 'copy'): InvoiceFormValues {
  const copy = mode === 'copy';
  return {
    invoiceNumber: copy ? '' : detail.invoiceNumber,
    storeId: detail.storeId,
    customerId: detail.customerId ?? '',
    shopifyCustomerId: detail.shopifyCustomerId ?? '',
    customerLabel: '',
    billToName: detail.billToName,
    billToAddress: detail.billToAddress ?? '',
    shipToName: detail.shipToName,
    shipToAddress: detail.shipToAddress ?? '',
    issueDate: copy ? todayIso() : dateOnly(detail.issueDate),
    dueDate: copy ? '' : dateOnly(detail.dueDate),
    currencyCode: detail.currencyCode,
    taxRegion: detail.taxRegion,
    taxRate: String(detail.taxRate),
    shipping: detail.shipping ? String(detail.shipping) : '',
    notes: detail.notes ?? '',
    terms: detail.terms ?? '',
    lines: detail.lineItems.map((line) => ({
      key: nextKey(),
      variantId: line.variantId,
      title: line.title,
      size: line.size ?? '',
      sku: line.sku ?? '',
      qty: String(line.qty),
      unitPrice: String(line.unitPrice),
      discountPercent: line.discountPercent ? String(line.discountPercent) : '',
    })),
    payments: copy
      ? []
      : detail.payments.map((payment) => ({
          key: nextKey(),
          type: payment.type,
          paidOn: dateOnly(payment.paidOn),
          amount: String(payment.amount),
          person: payment.person ?? '',
          description: payment.description ?? '',
        })),
  };
}

const toNumber = (value: string) => {
  const parsed = Number(value);
  return value.trim() === '' || !Number.isFinite(parsed) ? 0 : parsed;
};

/** Live totals for the form, using the same maths the server applies on save. */
export function totalsForForm(form: InvoiceFormValues) {
  return computeInvoiceTotals({
    lines: form.lines.map((line) => ({ qty: toNumber(line.qty), unitPrice: toNumber(line.unitPrice), discountPercent: toNumber(line.discountPercent) })),
    shipping: toNumber(form.shipping),
    taxRate: form.taxRegion === 'NONE' ? 0 : toNumber(form.taxRate),
    amountPaid: form.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0),
  });
}

export function buildInvoicePayload(form: InvoiceFormValues) {
  const { lines, payments, customerLabel, ...rest } = form;
  void customerLabel;
  return {
    ...rest,
    lineItems: lines.map(({ key, ...line }) => {
      void key;
      return line;
    }),
    payments: payments.map(({ key, ...payment }) => {
      void key;
      return payment;
    }),
  };
}

/** Client-side checks that mirror the server rules, so errors show before the request. */
export function validateInvoiceForm(form: InvoiceFormValues) {
  const errors: Record<string, string> = {};
  if (!form.storeId) errors.storeId = 'Choose a store';
  if (!form.billToName.trim()) errors.billToName = 'Bill to is required';
  if (!form.issueDate) errors.issueDate = 'Enter the invoice date';
  const rate = toNumber(form.taxRate);
  if (form.taxRegion !== 'NONE' && (rate < 0 || rate > 100)) errors.taxRate = 'Tax rate must be between 0 and 100';
  if (form.lines.length === 0) errors.lineItems = 'Add at least one item';
  else if (form.lines.some((line) => !line.title.trim())) errors.lineItems = 'Every item needs a description';
  else if (form.lines.some((line) => !Number.isInteger(Number(line.qty)) || Number(line.qty) < 1)) errors.lineItems = 'Quantities must be whole numbers of 1 or more';
  else if (form.lines.some((line) => line.unitPrice.trim() === '' || toNumber(line.unitPrice) < 0)) errors.lineItems = 'Every item needs a price';
  if (form.payments.some((payment) => toNumber(payment.amount) <= 0 || !payment.paidOn)) errors.payments = 'Each payment needs a date and an amount above 0';
  return errors;
}
