import {
  billingStoreScope,
  buildPagination,
  canReadBilling,
  canWriteBilling,
  readListParams,
  type BillingSession,
} from '@/lib/billing-access.server';
import { buildMessageOnlyEmailHtml, buildTaxInvoiceEmailHtml } from '@/lib/tax-invoice-email.server';
import { sendAppMail } from '@/lib/email.server';
import {
  computeInvoiceTotals,
  DEFAULT_AUS_TAX_RATE,
  derivePaymentStatus,
  DEFAULT_NZ_TAX_RATE,
  lineAmount,
  PAYMENT_TYPES,
  round2,
  type TaxRegion,
} from '@/lib/invoice-totals';
import { getSettingsTimezone } from '@/lib/task-due-date.server';
import { buildManualTaxInvoice, type ManualInvoiceSource } from '@/lib/tax-invoice.server';
import { CustomerModel } from '@/models/customer.model.server';
import { InvoiceModel, INVOICE_SORT_KEYS, type InvoiceInput, type InvoicePaymentInput } from '@/models/invoice.model.server';
import { ProductModel } from '@/models/product.model.server';
import { ShopifyCustomerModel } from '@/models/shopify-customer.model.server';

const model = new InvoiceModel();
const productModel = new ProductModel();
const customerModel = new CustomerModel();
const shopifyCustomerModel = new ShopifyCustomerModel();

const FORBIDDEN = { error: { message: 'Forbidden', status: 403 } };
const NOT_FOUND = { error: { message: 'Invoice not found', status: 404 } };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 10;
const MAX_BULK_INVOICES = 50;
const TAX_REGIONS: TaxRegion[] = ['AU', 'NZ', 'NONE'];
const STATUSES = ['UNPAID', 'PARTIAL', 'PAID'];
const NUMBER_PATTERN = /^[A-Za-z0-9#/_-]{1,30}$/;

type Detail = NonNullable<Awaited<ReturnType<InvoiceModel['findById']>>>;
type Raw = Record<string, unknown>;

const validationError = (errors: string[]) => ({ error: { message: 'Validation failed', errors, status: 400 } });

const asRaw = (value: unknown): Raw => (value && typeof value === 'object' ? (value as Raw) : {});
const text = (raw: Raw, key: string) => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '');
const num = (value: unknown) => (typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN);

/** A `YYYY-MM-DD` date, stored at noon UTC so it reads as the same day in any operating timezone. */
function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseLines(raw: unknown, errors: string[]): InvoiceInput['lineItems'] {
  const rows = Array.isArray(raw) ? raw : [];
  if (rows.length === 0) errors.push('lineItems: Add at least one item');
  return rows.map((row, index) => {
    const line = asRaw(row);
    const n = index + 1;
    const qty = num(line.qty);
    const unitPrice = num(line.unitPrice);
    const discountPercent = line.discountPercent === undefined || line.discountPercent === '' ? 0 : num(line.discountPercent);
    if (!text(line, 'title')) errors.push(`lineItems: Item ${n} needs a description`);
    if (!Number.isInteger(qty) || qty < 1) errors.push(`lineItems: Item ${n} quantity must be a whole number of 1 or more`);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) errors.push(`lineItems: Item ${n} price must be 0 or more`);
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      errors.push(`lineItems: Item ${n} discount must be between 0 and 100`);
    }
    return {
      variantId: text(line, 'variantId') || null,
      title: text(line, 'title'),
      size: text(line, 'size') || null,
      sku: text(line, 'sku') || null,
      qty,
      unitPrice,
      discountPercent,
      amount: 0,
    };
  });
}

function parsePayments(raw: unknown, errors: string[]): InvoicePaymentInput[] {
  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((row, index) => {
    const payment = asRaw(row);
    const n = index + 1;
    const amount = num(payment.amount);
    const paidOn = parseDate(text(payment, 'paidOn'));
    const type = text(payment, 'type');
    if (!(PAYMENT_TYPES as readonly string[]).includes(type)) errors.push(`payments: Payment ${n} needs a type`);
    if (!Number.isFinite(amount) || amount <= 0) errors.push(`payments: Payment ${n} amount must be more than 0`);
    if (!paidOn) errors.push(`payments: Payment ${n} needs a date`);
    return {
      type,
      paidOn: paidOn ?? new Date(),
      amount,
      person: text(payment, 'person') || null,
      description: text(payment, 'description') || null,
    };
  });
}

/** Validates the invoice form and works out its totals. Payments are managed on their own, so
 * `amountPaid` is what is already recorded (0 for a new invoice). Errors are `field: message` for `useRequest`. */
function parseInvoice(body: unknown, amountPaid: number): { input: InvoiceInput } | { errors: string[] } {
  const raw = asRaw(body);
  const errors: string[] = [];

  const billToName = text(raw, 'billToName');
  const issueDate = parseDate(text(raw, 'issueDate'));
  const dueDate = text(raw, 'dueDate') ? parseDate(text(raw, 'dueDate')) : null;
  const invoiceNumber = text(raw, 'invoiceNumber');
  const taxRegion = text(raw, 'taxRegion') as TaxRegion;
  const taxRateRaw = taxRegion === 'NONE' ? 0 : num(raw.taxRate);
  const shipping = raw.shipping === undefined || raw.shipping === '' ? 0 : num(raw.shipping);
  const currencyCode = text(raw, 'currencyCode').toUpperCase() || 'AUD';

  if (!text(raw, 'storeId')) errors.push('storeId: Choose a store');
  if (!billToName) errors.push('billToName: Bill to is required');
  if (!issueDate) errors.push('issueDate: Enter the invoice date');
  if (text(raw, 'dueDate') && !dueDate) errors.push('dueDate: Enter a valid due date');
  if (invoiceNumber && !NUMBER_PATTERN.test(invoiceNumber)) errors.push('invoiceNumber: Up to 30 letters, numbers, #, /, _ or -');
  if (!TAX_REGIONS.includes(taxRegion)) errors.push('taxRegion: Choose a tax region');
  if (!Number.isFinite(taxRateRaw) || taxRateRaw < 0 || taxRateRaw > 100) errors.push('taxRate: Tax rate must be between 0 and 100');
  if (!Number.isFinite(shipping) || shipping < 0) errors.push('shipping: Shipping must be 0 or more');
  if (!/^[A-Z]{3}$/.test(currencyCode)) errors.push('currencyCode: Use a 3-letter currency code');
  if (text(raw, 'terms').length > 2000) errors.push('terms: Terms must be 2000 characters or fewer');
  if (text(raw, 'notes').length > 2000) errors.push('notes: Notes must be 2000 characters or fewer');
  if (text(raw, 'orderRef').length > 60) errors.push('orderRef: Order / PO # must be 60 characters or fewer');
  if (text(raw, 'customerId') && text(raw, 'shopifyCustomerId')) errors.push('customerId: Link one customer only');

  const lineItems = parseLines(raw.lineItems, errors);
  if (errors.length) return { errors };

  const taxRate = Math.round(taxRateRaw * 100) / 100;
  const totals = computeInvoiceTotals({
    lines: lineItems,
    shipping,
    taxRate,
    amountPaid,
  });
  const lines = lineItems.map((line) => ({ ...line, amount: lineAmount(line) }));

  return {
    input: {
      invoiceNumber: invoiceNumber || null,
      storeId: text(raw, 'storeId'),
      customerId: text(raw, 'customerId') || null,
      shopifyCustomerId: text(raw, 'shopifyCustomerId') || null,
      billToName,
      billToAddress: text(raw, 'billToAddress') || null,
      shipToName: text(raw, 'shipToName') || billToName,
      shipToAddress: text(raw, 'shipToAddress') || null,
      orderRef: text(raw, 'orderRef') || null,
      issueDate: issueDate as Date,
      dueDate,
      currencyCode,
      taxRegion,
      taxRate,
      shipping: totals.shipping,
      notes: text(raw, 'notes') || null,
      terms: text(raw, 'terms') || null,
      totals: { sub: totals.sub, discount: totals.discount, tax: totals.tax, total: totals.total, amountPaid: totals.amountPaid, balance: totals.balance, status: totals.status },
      lineItems: lines,
    },
  };
}

/** Where the invoice can be emailed: the linked customer's email and its contacts' emails. */
function customerEmailsOf(row: Detail) {
  return [
    ...new Set(
      [row.customer?.email, ...(row.customer?.contacts ?? []).map((contact) => contact.email), row.shopifyCustomer?.email].filter(
        (email): email is string => Boolean(email),
      ),
    ),
  ];
}

function toDetail(row: Detail) {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    storeId: row.storeId,
    customerId: row.customerId,
    shopifyCustomerId: row.shopifyCustomerId,
    billToName: row.billToName,
    billToAddress: row.billToAddress,
    shipToName: row.shipToName,
    shipToAddress: row.shipToAddress,
    orderRef: row.orderRef,
    lastEmailedAt: row.lastEmailedAt,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    currencyCode: row.currencyCode,
    taxRegion: row.taxRegion,
    taxRate: Number(row.taxRate),
    shipping: Number(row.shipping),
    notes: row.notes,
    terms: row.terms,
    subTotal: Number(row.subTotal),
    discountTotal: Number(row.discountTotal),
    taxTotal: Number(row.taxTotal),
    total: Number(row.total),
    amountPaid: Number(row.amountPaid),
    balance: Number(row.balance),
    paymentStatus: row.paymentStatus,
    lineItems: row.lineItems.map((line) => ({
      id: line.id,
      variantId: line.variantId,
      title: line.title,
      size: line.size,
      sku: line.sku,
      qty: line.qty,
      unitPrice: Number(line.unitPrice),
      discountPercent: Number(line.discountPercent),
      amount: Number(line.amount),
    })),
    payments: row.payments.map((payment) => ({
      id: payment.id,
      type: payment.type,
      paidOn: payment.paidOn,
      amount: Number(payment.amount),
      person: payment.person,
      description: payment.description,
    })),
    store: { id: row.store.id, name: row.store.name, storeDomain: row.store.storeDomain },
    customerEmails: customerEmailsOf(row),
  };
}

async function canAccessStore(session: BillingSession, storeId: string) {
  const scope = await billingStoreScope(session);
  return scope === null || scope.includes(storeId);
}

/** The linked customer must exist; a Shopify customer must also be live and belong to the invoice's store. */
async function customerLinksValid(input: InvoiceInput) {
  if (input.customerId && !(await customerModel.exists(input.customerId))) return false;
  if (input.shopifyCustomerId && !(await shopifyCustomerModel.existsInStore(input.shopifyCustomerId, input.storeId))) return false;
  return true;
}

function toPrintSource(row: Detail): ManualInvoiceSource {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    orderRef: row.orderRef,
    currencyCode: row.currencyCode,
    billToName: row.billToName,
    billToAddress: row.billToAddress,
    shipToName: row.shipToName,
    shipToAddress: row.shipToAddress,
    taxRate: Number(row.taxRate),
    shipping: Number(row.shipping),
    subTotal: Number(row.subTotal),
    discountTotal: Number(row.discountTotal),
    taxTotal: Number(row.taxTotal),
    total: Number(row.total),
    amountPaid: Number(row.amountPaid),
    balance: Number(row.balance),
    terms: row.terms,
    lineItems: row.lineItems.map((line) => ({
      qty: line.qty,
      title: line.title,
      size: line.size,
      unitPrice: Number(line.unitPrice),
      discountPercent: Number(line.discountPercent),
      amount: Number(line.amount),
    })),
    payments: row.payments.map((payment) => ({ type: payment.type, paidOn: payment.paidOn, amount: Number(payment.amount) })),
    store: { ...row.store, accessToken: null },
  };
}

/** The message and invoice toggle shared by the single and bulk email requests. */
function parseEmailContent(raw: Raw, errors: string[]) {
  const message = text(raw, 'message');
  const includeInvoice = raw.includeInvoice !== false;
  if (message.length > 2000) errors.push('message: Message must be 2000 characters or fewer');
  if (!includeInvoice && !message) errors.push('message: Add a message when the invoice is not included');
  return { message, includeInvoice };
}

function parseEmail(body: unknown): { to: string[]; message: string; includeInvoice: boolean } | { errors: string[] } {
  const raw = asRaw(body);
  const to = [...new Set((Array.isArray(raw.to) ? raw.to : []).map((value) => String(value).trim().toLowerCase()).filter(Boolean))];
  const errors: string[] = [];
  if (to.length === 0) errors.push('to: Add at least one recipient');
  else if (to.length > MAX_RECIPIENTS) errors.push(`to: Send to at most ${MAX_RECIPIENTS} recipients`);
  else if (to.some((email) => !EMAIL_RE.test(email))) errors.push('to: One of the email addresses is not valid');
  const { message, includeInvoice } = parseEmailContent(raw, errors);
  return errors.length ? { errors } : { to, message, includeInvoice };
}

function parseBulkEmail(body: unknown): { ids: string[]; message: string; includeInvoice: boolean } | { errors: string[] } {
  const raw = asRaw(body);
  const ids = [...new Set((Array.isArray(raw.ids) ? raw.ids : []).map((value) => String(value).trim()).filter(Boolean))];
  const errors: string[] = [];
  if (ids.length === 0) errors.push('ids: Select at least one invoice');
  else if (ids.length > MAX_BULK_INVOICES) errors.push(`ids: Email at most ${MAX_BULK_INVOICES} invoices at once`);
  const { message, includeInvoice } = parseEmailContent(raw, errors);
  return errors.length ? { errors } : { ids, message, includeInvoice };
}

/** Renders and sends one invoice email (the full invoice, or only the message), then marks it emailed. */
async function deliverInvoiceEmail(row: Detail, to: string[], message: string, includeInvoice: boolean, origin: string) {
  const invoice = { ...buildManualTaxInvoice(toPrintSource(row), await getSettingsTimezone()), notice: null };
  const subject = `Invoice ${invoice.invoiceNumber} from ${invoice.store.name}`;
  const text = [
    message,
    ...(includeInvoice
      ? [`${subject}. Total ${invoice.totals.total.toFixed(2)} ${invoice.currencyCode}, balance due ${invoice.totals.balance.toFixed(2)} ${invoice.currencyCode}.`]
      : []),
  ]
    .filter(Boolean)
    .join('\n\n');

  // Logos must load for recipients, so prefer the public app URL over the (possibly internal) request origin.
  const logoBase = process.env.APP_URL?.replace(/\/$/, '') || origin;
  const html = includeInvoice ? buildTaxInvoiceEmailHtml(invoice, logoBase, message) : buildMessageOnlyEmailHtml(message);

  await sendAppMail({ to, subject, html, text });
  await model.markEmailed(row.id);
  return invoice.invoiceNumber;
}

export class InvoiceController {
  async list(searchParams: URLSearchParams, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;

    const params = readListParams(searchParams, INVOICE_SORT_KEYS, 'createdAt');
    const status = searchParams.get('status');
    const { rows, total } = await model.list({
      ...params,
      storeId: searchParams.get('storeId') || null,
      status: status && STATUSES.includes(status) ? status : null,
      allowedStoreIds: await billingStoreScope(session),
    });

    return {
      data: {
        invoices: rows.map((row) => ({
          id: row.id,
          invoiceNumber: row.invoiceNumber,
          storeId: row.storeId,
          storeName: row.store.name ?? row.store.storeDomain,
          billToName: row.billToName,
          orderRef: row.orderRef,
          lastEmailedAt: row.lastEmailedAt,
          qty: row.lineItems.reduce((sum, line) => sum + line.qty, 0),
          issueDate: row.issueDate,
          currencyCode: row.currencyCode,
          total: Number(row.total),
          amountPaid: Number(row.amountPaid),
          balance: Number(row.balance),
          paymentStatus: row.paymentStatus,
        })),
        pagination: buildPagination(params.page, params.pageSize, total),
      },
    };
  }

  async get(id: string, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;
    const row = await model.findById(id);
    if (!row || !(await canAccessStore(session, row.storeId))) return NOT_FOUND;
    return { data: toDetail(row) };
  }

  async create(body: unknown, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    const parsed = parseInvoice(body, 0);
    if ('errors' in parsed) return validationError(parsed.errors);
    const { input } = parsed;
    if (!(await canAccessStore(session, input.storeId))) return FORBIDDEN;
    if (!(await customerLinksValid(input))) return validationError(['customerId: That customer no longer exists or belongs to another store']);

    const prefix = (await model.findStoreSettings(input.storeId))?.invoicePrefix ?? null;
    const created = await model.create(input, prefix);
    if (!created) return { error: { message: 'Validation failed', errors: ['invoiceNumber: That invoice number is already used'], status: 409 } };
    return { data: toDetail(created), message: `Invoice ${created.invoiceNumber} created` };
  }

  async update(id: string, body: unknown, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    const existingStoreId = await model.findStoreIdById(id);
    if (!existingStoreId || !(await canAccessStore(session, existingStoreId))) return NOT_FOUND;

    const parsed = parseInvoice(body, await model.sumPayments(id));
    if ('errors' in parsed) return validationError(parsed.errors);
    const { input } = parsed;
    if (!(await canAccessStore(session, input.storeId))) return FORBIDDEN;
    if (!(await customerLinksValid(input))) return validationError(['customerId: That customer no longer exists or belongs to another store']);

    const updated = await model.update(id, input);
    if (!updated) return { error: { message: 'Validation failed', errors: ['invoiceNumber: That invoice number is already used'], status: 409 } };
    return { data: toDetail(updated), message: `Invoice ${updated.invoiceNumber} saved` };
  }

  /** Replaces an invoice's payments and recomputes what is paid and owing against its stored total. */
  async updatePayments(id: string, body: unknown, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;
    const existing = await model.findTotalById(id);
    if (!existing || !(await canAccessStore(session, existing.storeId))) return NOT_FOUND;

    const errors: string[] = [];
    const payments = parsePayments(asRaw(body).payments, errors);
    if (errors.length) return validationError(errors);

    const total = Number(existing.total);
    const amountPaid = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
    const updated = await model.replacePayments(id, payments, {
      amountPaid,
      balance: round2(total - amountPaid),
      status: derivePaymentStatus(total, amountPaid),
    });
    if (!updated) return NOT_FOUND;
    return { data: toDetail(updated), message: `Payments saved for ${updated.invoiceNumber}` };
  }

  async delete(id: string, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;
    const storeId = await model.findStoreIdById(id);
    if (!storeId || !(await canAccessStore(session, storeId))) return NOT_FOUND;
    await model.delete(id);
    return { data: { id }, message: 'Invoice deleted' };
  }

  async stores(session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;
    const stores = await model.listStores(await billingStoreScope(session));
    return {
      data: {
        stores: stores.map((store) => ({
          id: store.id,
          name: store.name ?? store.storeDomain,
          storeDomain: store.storeDomain,
          ausTaxRate: store.invoiceSetting ? Number(store.invoiceSetting.ausTaxRate) : DEFAULT_AUS_TAX_RATE,
          nzTaxRate: store.invoiceSetting ? Number(store.invoiceSetting.nzTaxRate) : DEFAULT_NZ_TAX_RATE,
          defaultTerms: store.invoiceSetting?.defaultTerms ?? null,
        })),
      },
    };
  }

  async variantSearch(storeId: string, query: string, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;
    if (!storeId || !(await canAccessStore(session, storeId))) return FORBIDDEN;
    return { data: await productModel.searchVariantsForStore({ storeId, query }) };
  }

  async pdfData(id: string, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;
    const row = await model.findById(id);
    if (!row || !(await canAccessStore(session, row.storeId))) return NOT_FOUND;

    const timezone = await getSettingsTimezone();
    return { data: { ...buildManualTaxInvoice(toPrintSource(row), timezone), notice: null }, message: 'Tax invoice retrieved' };
  }

  /** Emails the invoice, rendered with the same template as the printed one, through the app's mail provider. */
  async email(id: string, body: unknown, origin: string, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;
    const row = await model.findById(id);
    if (!row || !(await canAccessStore(session, row.storeId))) return NOT_FOUND;

    const parsed = parseEmail(body);
    if ('errors' in parsed) return validationError(parsed.errors);

    let invoiceNumber: string;
    try {
      invoiceNumber = await deliverInvoiceEmail(row, parsed.to, parsed.message, parsed.includeInvoice, origin);
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Could not send the email', status: 502 } };
    }
    return { data: { id, lastEmailedAt: new Date() }, message: `Invoice ${invoiceNumber} emailed` };
  }

  /** Emails each selected invoice to its own customer's addresses; invoices with none are skipped. */
  async bulkEmail(body: unknown, origin: string, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;
    const parsed = parseBulkEmail(body);
    if ('errors' in parsed) return validationError(parsed.errors);

    let sent = 0;
    const skipped: string[] = [];
    const failed: string[] = [];
    let lastError = 'Could not send the emails';
    for (const id of parsed.ids) {
      const row = await model.findById(id);
      if (!row || !(await canAccessStore(session, row.storeId))) continue;
      const to = customerEmailsOf(row).slice(0, MAX_RECIPIENTS);
      if (to.length === 0) {
        skipped.push(row.invoiceNumber);
        continue;
      }
      try {
        await deliverInvoiceEmail(row, to, parsed.message, parsed.includeInvoice, origin);
        sent += 1;
      } catch (error) {
        failed.push(row.invoiceNumber);
        lastError = error instanceof Error ? error.message : lastError;
      }
    }

    if (sent === 0 && failed.length > 0) return { error: { message: lastError, status: 502 } };
    const notes = [
      skipped.length ? `${skipped.length} skipped: no email address (${skipped.join(', ')})` : '',
      failed.length ? `${failed.length} failed (${failed.join(', ')})` : '',
    ].filter(Boolean);
    return {
      data: { sent, skipped, failed },
      message: `Emailed ${sent} invoice${sent === 1 ? '' : 's'}${notes.length ? `. ${notes.join('; ')}` : ''}`,
    };
  }
}
