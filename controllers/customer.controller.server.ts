import {
  billingStoreScope,
  buildPagination,
  canReadBilling,
  canWriteBilling,
  readListParams,
  type BillingSession,
} from '@/lib/billing-access.server';
import { CUSTOMER_SORT_KEYS, CustomerModel, type CustomerValues } from '@/models/customer.model.server';
import { SHOPIFY_CUSTOMER_SORT_KEYS, ShopifyCustomerModel } from '@/models/shopify-customer.model.server';

const systemModel = new CustomerModel();
const shopifyModel = new ShopifyCustomerModel();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORBIDDEN = { error: { message: 'Forbidden', status: 403 } };
const OPTIONAL_TEXT = ['company', 'email', 'phone', 'address', 'address2', 'city', 'state', 'zip', 'country', 'notes'] as const;
const MAX_LENGTH = { name: 150, notes: 2000 } as const;

export type CustomerSource = 'system' | 'shopify';

const asSource = (value: string | null): CustomerSource => (value === 'shopify' ? 'shopify' : 'system');

type Invoiceish = { id: string; invoiceNumber: string; issueDate: Date; total: unknown; amountPaid: unknown; balance: unknown; paymentStatus: string };

function toInvoiceSummary(invoice: Invoiceish) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    total: Number(invoice.total),
    amountPaid: Number(invoice.amountPaid),
    balance: Number(invoice.balance),
    paymentStatus: invoice.paymentStatus,
  };
}

type BaseRow = CustomerValues & { id: string; createdAt: Date };

function toRow(source: CustomerSource, row: BaseRow & Record<string, unknown>) {
  const shopify = source === 'shopify';
  return {
    id: row.id,
    source,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    address: row.address,
    address2: row.address2,
    city: row.city,
    state: row.state,
    zip: row.zip,
    country: row.country,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    invoiceCount: shopify ? undefined : ((row._count as { invoices: number } | undefined)?.invoices ?? 0),
    ordersCount: shopify ? (row.ordersCount as number) : undefined,
    totalSpent: shopify ? Number(row.totalSpent) : undefined,
    store: shopify ? (row.store as { id: string; name: string | null; storeDomain: string }) : undefined,
    storeId: shopify ? (row.storeId as string) : undefined,
    invoices: Array.isArray(row.invoices) ? (row.invoices as Invoiceish[]).map(toInvoiceSummary) : undefined,
  };
}

/** Trims every field and validates it. Errors are `field: message` so `useRequest` shows them inline. */
export function parseCustomerValues(body: unknown): { values: CustomerValues } | { errors: string[] } {
  const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '');
  const errors: string[] = [];

  const name = text('name');
  if (!name) errors.push('name: Name is required');
  else if (name.length > MAX_LENGTH.name) errors.push(`name: Name must be ${MAX_LENGTH.name} characters or fewer`);
  if (text('email') && !EMAIL_RE.test(text('email'))) errors.push('email: Enter a valid email address');
  if (text('notes').length > MAX_LENGTH.notes) errors.push(`notes: Notes must be ${MAX_LENGTH.notes} characters or fewer`);
  if (errors.length) return { errors };

  const values = { name } as CustomerValues;
  for (const key of OPTIONAL_TEXT) values[key] = text(key) || null;
  return { values };
}

const validationError = (errors: string[]) => ({ error: { message: 'Validation failed', errors, status: 400 } });

async function canAccessStore(session: BillingSession, storeId: string) {
  const scope = await billingStoreScope(session);
  return scope === null || scope.includes(storeId);
}

export class CustomerController {
  async list(searchParams: URLSearchParams, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;

    const source = asSource(searchParams.get('source'));
    const sortKeys = source === 'shopify' ? SHOPIFY_CUSTOMER_SORT_KEYS : CUSTOMER_SORT_KEYS;
    const params = readListParams(searchParams, sortKeys, 'name');
    const pagination = (total: number) => buildPagination(params.page, params.pageSize, total);

    if (source === 'system') {
      const { rows, total } = await systemModel.list(params);
      return { data: { customers: rows.map((row) => toRow('system', row)), pagination: pagination(total) } };
    }

    const allowedStoreIds = await billingStoreScope(session);
    const { rows, total } = await shopifyModel.list({
      ...params,
      storeId: searchParams.get('storeId') || null,
      allowedStoreIds,
    });
    return { data: { customers: rows.map((row) => toRow('shopify', row)), pagination: pagination(total) } };
  }

  async get(id: string, source: CustomerSource, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;

    if (source === 'system') {
      const row = await systemModel.findById(id);
      if (!row) return { error: { message: 'Customer not found', status: 404 } };
      return { data: toRow('system', row) };
    }

    const row = await shopifyModel.findById(id);
    if (!row || !(await canAccessStore(session, row.storeId))) {
      return { error: { message: 'Customer not found', status: 404 } };
    }
    return { data: toRow('shopify', row) };
  }

  async create(body: unknown, source: CustomerSource, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    const parsed = parseCustomerValues(body);
    if ('errors' in parsed) return validationError(parsed.errors);

    if (source === 'system') {
      const row = await systemModel.create(parsed.values);
      return { data: toRow('system', { ...row, _count: { invoices: 0 } }), message: 'Customer created' };
    }

    const storeId = typeof (body as { storeId?: unknown })?.storeId === 'string' ? (body as { storeId: string }).storeId : '';
    if (!storeId) return validationError(['storeId: Choose a store']);
    if (!(await canAccessStore(session, storeId))) return FORBIDDEN;

    const row = await shopifyModel.create(storeId, parsed.values);
    return { data: toRow('shopify', row), message: 'Customer created' };
  }

  async update(id: string, body: unknown, source: CustomerSource, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    const parsed = parseCustomerValues(body);
    if ('errors' in parsed) return validationError(parsed.errors);

    if (source === 'system') {
      if (!(await systemModel.findById(id))) return { error: { message: 'Customer not found', status: 404 } };
      const row = await systemModel.update(id, parsed.values);
      return { data: toRow('system', row), message: 'Customer updated' };
    }

    const existing = await shopifyModel.findById(id);
    if (!existing || !(await canAccessStore(session, existing.storeId))) {
      return { error: { message: 'Customer not found', status: 404 } };
    }
    const row = await shopifyModel.update(id, parsed.values);
    return { data: toRow('shopify', row), message: 'Customer updated' };
  }

  async delete(id: string, source: CustomerSource, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    if (source === 'system') {
      if (!(await systemModel.findById(id))) return { error: { message: 'Customer not found', status: 404 } };
      await systemModel.delete(id);
      return { data: { id }, message: 'Customer deleted' };
    }

    const existing = await shopifyModel.findById(id);
    if (!existing || !(await canAccessStore(session, existing.storeId))) {
      return { error: { message: 'Customer not found', status: 404 } };
    }
    await shopifyModel.softDelete(id);
    return { data: { id }, message: 'Customer deleted' };
  }

  /** Merges system customers: everything in `ids` except `primaryId` is folded into the primary. */
  async merge(body: unknown, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    const raw = (body ?? {}) as { primaryId?: unknown; ids?: unknown };
    const primaryId = typeof raw.primaryId === 'string' ? raw.primaryId : '';
    const ids = Array.isArray(raw.ids) ? raw.ids.filter((id): id is string => typeof id === 'string') : [];
    const sourceIds = [...new Set(ids)].filter((id) => id !== primaryId);

    if (!primaryId || sourceIds.length < 1) return validationError(['ids: Select at least two customers to merge']);

    const found = await systemModel.findManyByIds([primaryId, ...sourceIds]);
    if (found.length !== sourceIds.length + 1) return { error: { message: 'Customer not found', status: 404 } };

    const merged = await systemModel.merge(primaryId, sourceIds);
    if (!merged) return { error: { message: 'Customer not found', status: 404 } };
    return {
      data: toRow('system', { ...merged, _count: { invoices: 0 } }),
      message: `Merged ${sourceIds.length + 1} customers into ${merged.name}`,
    };
  }
}

export { asSource };
