import moment from 'moment-timezone';
import { DEFAULT_INVOICE_ACCENT } from '@/lib/invoice-defaults';
import type { RawPaymentData } from '@/lib/shopify-order-fetch.server';
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
  shipTo: { name: string; lines: string[] };
  items: Array<{ qty: number; title: string; size: string; price: number; amount: number }>;
  totals: {
    sub: number;
    discount: number;
    shipping: number;
    tax: number;
    taxesIncluded: boolean;
    total: number;
    applied: number;
    balance: number;
  };
  /** PAYMENT METHOD block: what Shopify recorded, plus the store's instructions for manual methods. */
  payment: { lines: string[]; instructions: string | null };
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

function isAustralia(country: string | null) {
  const normalized = (country ?? '').trim().toLowerCase();
  // No country means no shipping address (e.g. local pickup) — treated as a domestic sale.
  return normalized === '' || normalized === 'australia' || normalized === 'au';
}

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

function buildStoreBlock(source: TaxInvoiceSource): TaxInvoice['store'] {
  const { store } = source;
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

  return {
    orderId: source.id,
    invoiceNumber,
    date: moment(source.orderedAt).tz(timezone).format('DD/MM/YYYY'),
    currencyCode: source.currencyCode ?? 'AUD',
    billTo: source.customer,
    shipTo: { name: source.customer, lines: addressLines(source) },
    items,
    totals: {
      sub,
      discount,
      // Shopify's live figure reflects refunds and edits; the stored lines are the offline fallback.
      shipping: round2(liveShipping ?? shippingTotal(source.shippingLines)),
      tax: isAustralia(source.country) ? round2(financials.currentTotalTax ?? 0) : 0,
      taxesIncluded: financials.taxesIncluded ?? true,
      total,
      applied,
      balance,
    },
    payment: buildPaymentBlock(source, balance),
    store: buildStoreBlock(source),
  };
}
