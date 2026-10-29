import {
  computeInvoiceTotals,
  DEFAULT_AUS_TAX_RATE,
  DEFAULT_NZ_TAX_RATE,
  taxRateForRegion,
  taxRegionForCountry,
  type PaymentStatus,
  type TaxRegion,
} from '@/lib/invoice-totals';
import type { BillingStore } from '@/hooks/useStoreOptions';

export { PAYMENT_TYPES } from '@/lib/invoice-totals';

export type InvoiceListRow = {
  id: string;
  invoiceNumber: string;
  storeId: string;
  storeName: string;
  billToName: string;
  orderRef: string | null;
  lastEmailedAt: string | null;
  issueDate: string;
  currencyCode: string;
  total: number;
  amountPaid: number;
  balance: number;
  qty: number;
  paymentStatus: PaymentStatus;
  createdByName: string | null;
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
  orderRef: string | null;
  lastEmailedAt: string | null;
  issueDate: string;
  dueDate: string | null;
  currencyCode: string;
  taxRegion: TaxRegion;
  taxRate: number;
  shipping: number;
  notes: string | null;
  terms: string | null;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  createdByName: string | null;
  customerEmails: string[];
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
  /** Read-only: set by the server when the invoice is created. */
  createdByName: string;
  storeId: string;
  customerId: string;
  shopifyCustomerId: string;
  customerLabel: string;
  billToName: string;
  billToAddress: string;
  shipToName: string;
  shipToAddress: string;
  orderRef: string;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  taxRegion: TaxRegion;
  taxRate: string;
  shipping: string;
  notes: string;
  terms: string;
  lines: LineForm[];
  /** Recorded payments, which are edited in their own modal; 0 for a new invoice. */
  amountPaid: number;
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

/** The store's tax-inclusive rate for a region, as a form value. */
export function rateFor(store: BillingStore | undefined, region: TaxRegion) {
  const rates = { aus: store?.ausTaxRate ?? DEFAULT_AUS_TAX_RATE, nz: store?.nzTaxRate ?? DEFAULT_NZ_TAX_RATE };
  return String(taxRateForRegion(region, rates));
}

/** Tax for a store and ship-to country: the store's rate for that region. */
export function taxFor(store: BillingStore | undefined, country: string | null | undefined) {
  const region = taxRegionForCountry(country);
  return { region, rate: rateFor(store, region) };
}

export function blankForm(store?: BillingStore): InvoiceFormValues {
  const tax = taxFor(store, '');
  return {
    invoiceNumber: '',
    createdByName: '',
    storeId: store?.id ?? '',
    customerId: '',
    shopifyCustomerId: '',
    customerLabel: '',
    billToName: '',
    billToAddress: '',
    shipToName: '',
    shipToAddress: '',
    orderRef: '',
    issueDate: todayIso(),
    dueDate: '',
    currencyCode: 'AUD',
    taxRegion: tax.region,
    taxRate: tax.rate,
    shipping: '',
    notes: '',
    terms: store?.defaultTerms ?? '',
    lines: [blankLine()],
    amountPaid: 0,
  };
}

/** Edit keeps the number, dates, PO # and paid amount; copy starts a new, unpaid invoice from the same content.
 * `customerLabel` starts blank and is filled once the linked customer has loaded. */
export function formFromDetail(detail: InvoiceDetail, mode: 'edit' | 'copy'): InvoiceFormValues {
  const copy = mode === 'copy';
  return {
    invoiceNumber: copy ? '' : detail.invoiceNumber,
    createdByName: copy ? '' : (detail.createdByName ?? ''),
    storeId: detail.storeId,
    customerId: detail.customerId ?? '',
    shopifyCustomerId: detail.shopifyCustomerId ?? '',
    customerLabel: '',
    billToName: detail.billToName,
    billToAddress: detail.billToAddress ?? '',
    shipToName: detail.shipToName,
    shipToAddress: detail.shipToAddress ?? '',
    orderRef: copy ? '' : (detail.orderRef ?? ''),
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
    amountPaid: copy ? 0 : detail.amountPaid,
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
    amountPaid: form.amountPaid,
  });
}

const upper = (value: string) => value.toUpperCase();

export function buildInvoicePayload(form: InvoiceFormValues) {
  const { lines, customerLabel, amountPaid, createdByName, ...rest } = form;
  void customerLabel;
  void amountPaid;
  void createdByName;
  return {
    ...rest,
    currencyCode: upper(rest.currencyCode),
    orderRef: upper(rest.orderRef),
    billToName: upper(rest.billToName),
    shipToName: upper(rest.shipToName),
    billToAddress: upper(rest.billToAddress),
    shipToAddress: upper(rest.shipToAddress),
    notes: upper(rest.notes),
    terms: upper(rest.terms),
    lineItems: lines.map(({ key, ...line }) => {
      void key;
      return { ...line, title: upper(line.title), size: upper(line.size), sku: upper(line.sku) };
    }),
  };
}

/** Payment rows for the payments modal, from a loaded invoice. */
export function paymentsFromDetail(detail: InvoiceDetail): PaymentForm[] {
  return detail.payments.map((payment) => ({
    key: nextKey(),
    type: payment.type,
    paidOn: dateOnly(payment.paidOn),
    amount: String(payment.amount),
    person: payment.person ?? '',
    description: payment.description ?? '',
  }));
}

export const paymentsTotal = (payments: PaymentForm[]) => payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);

export function validatePayments(payments: PaymentForm[]) {
  const errors: Record<string, string> = {};
  if (payments.some((payment) => toNumber(payment.amount) <= 0 || !payment.paidOn)) errors.payments = 'Each payment needs a date and an amount above 0';
  return errors;
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
  return errors;
}
