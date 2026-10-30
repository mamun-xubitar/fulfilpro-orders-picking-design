import moment from 'moment-timezone';
import { DEFAULT_INVOICE_ACCENT } from '@/lib/invoice-defaults';
import type { RawPaymentData } from '@/lib/shopify-order-fetch.server';
import {
  DEFAULT_AUS_TAX_RATE,
  DEFAULT_NZ_TAX_RATE,
  includedTax,
  taxRateForRegion,
  taxRegionForCountry,
} from '@/lib/invoice-totals';
import type { OrderModel } from '@/models/order.model.server';

export type TaxInvoiceSource = Awaited<ReturnType<OrderModel['getTaxInvoiceSource']>>;

/** How an order was paid, boiled down from Shopify's transactions. */
export type PaymentSummary = {
  /** Online payments that actually went through, one label per method. */
  lines: string[];
  /** Paid (or to be paid) by a manual method such as Bank Deposit — shows the store's instructions. */
  manual: boolean;
  manualNames: string[];
};

export type TaxInvoice = {
  orderId: string;
  invoiceNumber: string;
  date: string;
  currencyCode: string;
  billTo: string;
  /** Bill-to address lines; empty for Shopify-order invoices. */
  billToLines: string[];
  shipTo: { name: string; lines: string[] };
  /** Customer's order / PO reference and due date — manual invoices only. */
  orderRef: string | null;
  dueDate: string | null;
  items: Array<{ qty: number; title: string; size: string; price: number; discountPercent: number; amount: number }>;
  totals: {
    sub: number;
    discount: number;
    shipping: number;
    /** Tax already contained in the prices — the total is not changed by it. */
    tax: number;
    taxRate: number;
    total: number;
    applied: number;
    balance: number;
  };
  /** PAYMENT METHOD block: what Shopify recorded, plus the store's instructions for manual methods. */
  payment: { lines: string[]; instructions: string | null };
  /** Printed at the bottom of the invoice. */
  terms: string | null;
  /** Shown to the user when printing, not on the invoice itself. */
  notice: string | null;
  store: {
    name: string;
    businessName: string | null;
    email: string | null;
    websiteUrl: string | null;
    abn: string | null;
    accentColor: string;
    logoPath: string | null;
  };
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const clean = (value: string | null | undefined) => value?.trim() || null;

function addressLines(source: TaxInvoiceSource) {
  return [
    clean(source.address),
    clean(source.address2),
    [source.city, source.state, source.zip].map(clean).filter(Boolean).join(' ') || null,
    clean(source.country),
  ].filter((line): line is string => Boolean(line));
}

function shippingTotal(lines: TaxInvoiceSource['shippingLines']) {
  return lines.reduce((sum, line) => {
    const allocated = line.discountAllocations.reduce((acc, allocation) => acc + allocation.amount, 0);
    return sum + (line.discountedPrice ?? Math.max(0, line.price - allocated));
  }, 0);
}

const ONLINE_KINDS = new Set(['SALE', 'CAPTURE', 'AUTHORIZATION']);

const normalizeGateway = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

function paymentLabel(transaction: RawPaymentData['transactions'][number]) {
  const name = clean(transaction.formattedGateway) ?? clean(transaction.gateway) ?? 'Payment';
  const card = transaction.paymentDetails;
  const last4 = card?.number?.match(/(\d{1,4})\s*$/)?.[1];
  const parts = [name];
  if (card?.company) parts.push(`— ${card.company}${last4 ? ` •••• ${last4}` : ''}`);
  if (card?.wallet) parts.push(`(${card.wallet.replace(/_/g, ' ')})`);
  return parts.join(' ');
}

/** Online payments that went through (an authorization and its capture count once), and whether a
 * manual method such as Bank Deposit is involved — including an unpaid one with no transaction yet. */
export function summarizePayments(raw: RawPaymentData): PaymentSummary {
  const lines = new Set<string>();
  const manualNames = new Set<string>();

  for (const transaction of raw.transactions) {
    if (transaction.manualPaymentGateway) {
      manualNames.add(clean(transaction.formattedGateway) ?? clean(transaction.gateway) ?? 'Manual payment');
    } else if (transaction.status === 'SUCCESS' && ONLINE_KINDS.has(transaction.kind)) {
      lines.add(paymentLabel(transaction));
    }
  }

  // A gateway named on the order with no transaction at all is a payment still to come.
  const withTransactions = new Set(raw.transactions.map((t) => normalizeGateway(t.gateway)));
  for (const name of raw.gatewayNames) {
    if (!withTransactions.has(normalizeGateway(name))) manualNames.add(name.trim());
  }

  return { lines: [...lines], manual: manualNames.size > 0, manualNames: [...manualNames] };
}

function buildPaymentBlock(source: TaxInvoiceSource, balance: number): TaxInvoice['payment'] {
  const summary = source.paymentMethods;
  if (!summary) return { lines: [], instructions: null };

  // Instructions are for paying: once nothing is owed, name the manual method instead.
  const instructions = summary.manual && balance > 0 ? clean(source.store.invoiceSetting?.paymentInstructions) : null;
  // No instructions to show: at least name the manual method rather than print nothing.
  const lines = summary.manual && !instructions ? [...summary.lines, ...summary.manualNames] : summary.lines;
  return { lines, instructions };
}

function buildStoreBlock(store: TaxInvoiceSource['store']): TaxInvoice['store'] {
  const setting = store.invoiceSetting;
  return {
    name: clean(setting?.storeName) ?? store.name ?? store.storeDomain,
    businessName: clean(setting?.businessName),
    email: clean(setting?.email) ?? clean(store.email),
    websiteUrl: clean(setting?.websiteUrl) ?? clean(store.url),
    abn: clean(setting?.abn),
    accentColor: setting?.accentColor ?? DEFAULT_INVOICE_ACCENT,
    logoPath: setting?.logoPath ?? null,
  };
}

/** Assumes `source.financials` total and amount paid are present — the controller loads them first. */
export function buildTaxInvoice(
  source: TaxInvoiceSource,
  timezone: string,
  invoiceNumber: string,
  liveShipping: number | null = null,
): Omit<TaxInvoice, 'notice'> {
  const { financials } = source;
  const items = source.lineItems
    .filter((item) => item.qty > 0)
    .map((item) => {
      const price = item.originalPrice ?? item.price;
      const size = item.variantTitle.trim();
      return {
        qty: item.qty,
        title: item.title,
        size: size.toLowerCase() === 'default title' ? '' : size,
        price: round2(price),
        discountPercent: 0,
        amount: round2(item.qty * price),
      };
    });

  const sub = round2(items.reduce((sum, item) => sum + item.amount, 0));
  // Derived from Shopify's subtotal rather than its discount total, whose treatment of shipping
  // discounts varies — this keeps SUB − DISCOUNT equal to Shopify's own subtotal.
  const discount = round2(Math.max(0, sub - (financials.currentSubtotalPrice ?? sub)));
  const total = round2(financials.currentTotalPrice ?? 0);
  // APPLIED is what Shopify has actually received net of refunds; BALANCE is what is still owed.
  const applied = round2(financials.amountPaid ?? 0);
  const balance = round2(total - applied);
  const taxRate = taxRateForRegion(taxRegionForCountry(source.country), storeTaxRates(source.store));

  return {
    orderId: source.id,
    invoiceNumber,
    date: moment(source.orderedAt).tz(timezone).format('DD/MM/YYYY'),
    currencyCode: source.currencyCode ?? 'AUD',
    billTo: source.customer,
    billToLines: [],
    orderRef: null,
    dueDate: null,
    shipTo: { name: source.customer, lines: addressLines(source) },
    items,
    totals: {
      sub,
      discount,
      // Shopify's live figure reflects refunds and edits; the stored lines are the offline fallback.
      shipping: round2(liveShipping ?? shippingTotal(source.shippingLines)),
      // Shopify's own tax figure is ignored: prices are tax-inclusive, so the tax is the part of the
      // total at the store's rate for the ship-to country.
      tax: includedTax(total, taxRate),
      taxRate,
      total,
      applied,
      balance,
    },
    payment: buildPaymentBlock(source, balance),
    terms: clean(source.store.invoiceSetting?.defaultTerms),
    store: buildStoreBlock(source.store),
  };
}

function storeTaxRates(store: TaxInvoiceSource['store']) {
  const setting = store.invoiceSetting;
  return {
    aus: setting ? Number(setting.ausTaxRate) : DEFAULT_AUS_TAX_RATE,
    nz: setting ? Number(setting.nzTaxRate) : DEFAULT_NZ_TAX_RATE,
  };
}

/** A manually created invoice, as loaded for printing. */
export type ManualInvoiceSource = {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  orderRef: string | null;
  currencyCode: string;
  billToName: string;
  billToAddress: string | null;
  shipToName: string;
  shipToAddress: string | null;
  taxRate: number;
  shipping: number;
  subTotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balance: number;
  terms: string | null;
  lineItems: Array<{ qty: number; title: string; size: string | null; unitPrice: number; discountPercent: number; amount: number }>;
  payments: Array<{ type: string; paidOn: Date; amount: number }>;
  store: TaxInvoiceSource['store'];
};

function formatMoney(value: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: currencyCode }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currencyCode}`;
  }
}

const splitLines = (value: string | null) =>
  (value ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

export function buildManualTaxInvoice(source: ManualInvoiceSource, timezone: string): Omit<TaxInvoice, 'notice'> {
  const instructions = source.balance > 0 ? clean(source.store.invoiceSetting?.paymentInstructions) : null;
  const day = (date: Date) => moment(date).tz(timezone).format('DD/MM/YYYY');
  const money = (value: number) => formatMoney(value, source.currencyCode);
  const paymentLines = source.payments.map((payment) => `${payment.type} — ${day(payment.paidOn)} — ${money(payment.amount)}`);
  return {
    orderId: source.id,
    invoiceNumber: source.invoiceNumber,
    date: day(source.issueDate),
    currencyCode: source.currencyCode,
    billTo: source.billToName,
    billToLines: splitLines(source.billToAddress),
    orderRef: clean(source.orderRef),
    dueDate: source.dueDate ? day(source.dueDate) : null,
    shipTo: { name: source.shipToName, lines: splitLines(source.shipToAddress) },
    items: source.lineItems.map((item) => ({
      qty: item.qty,
      title: item.title,
      size: item.size ?? '',
      price: item.unitPrice,
      discountPercent: item.discountPercent,
      amount: item.amount,
    })),
    totals: {
      sub: source.subTotal,
      discount: source.discountTotal,
      shipping: source.shipping,
      tax: source.taxTotal,
      taxRate: source.taxRate,
      total: source.total,
      applied: source.amountPaid,
      balance: source.balance,
    },
    payment: { lines: paymentLines, instructions },
    terms: clean(source.terms),
    store: buildStoreBlock(source.store),
  };
}
