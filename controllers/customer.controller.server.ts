import {
  billingStoreScope,
  buildPagination,
  canReadBilling,
  canWriteBilling,
  readListParams,
  type BillingSession,
} from '@/lib/billing-access.server';
import {
  CUSTOMER_SORT_KEYS,
  CustomerModel,
  type CustomerAddressValues,
  type CustomerContactValues,
  type CustomerValues,
  type SystemCustomerExtras,
  type SystemCustomerInput,
} from '@/models/customer.model.server';
import { taxRegionForCountry } from '@/lib/invoice-totals';
import { SHOPIFY_CUSTOMER_SORT_KEYS, ShopifyCustomerModel } from '@/models/shopify-customer.model.server';

const systemModel = new CustomerModel();
const shopifyModel = new ShopifyCustomerModel();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORBIDDEN = { error: { message: 'Forbidden', status: 403 } };
const NOT_FOUND = { error: { message: 'Customer not found', status: 404 } };
const OPTIONAL_TEXT = ['company', 'email', 'phone', 'address', 'address2', 'city', 'state', 'zip', 'country', 'notes'] as const;
const CONTACT_TEXT = ['phone', 'jobTitle', 'address', 'city', 'state', 'zip', 'country'] as const;
const ADDRESS_TEXT = ['label', 'email', 'phone', 'address', 'address2', 'city', 'state', 'zip', 'country'] as const;
const MAX_LENGTH = { name: 150, notes: 2000, type: 60 } as const;
const MAX_CHILDREN = 20;
const CURRENCIES = ['AUD', 'NZD'];
const HISTORY_PAGE_SIZE = 10;

export type CustomerSource = 'system' | 'shopify';

const asSource = (value: string | null): CustomerSource => (value === 'shopify' ? 'shopify' : 'system');

type Totals = { totalSales: number; balance: number };
type BaseRow = CustomerValues & { id: string; createdAt: Date };

function toRow(source: CustomerSource, row: BaseRow & Record<string, unknown>, totals?: Totals) {
  const shopify = source === 'shopify';
  return {
    id: row.id,
    source,
    code: shopify ? undefined : (row.code as number),
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
    type: shopify ? undefined : ((row.type as string | null) ?? null),
    creditLimit: shopify || row.creditLimit == null ? null : Number(row.creditLimit),
    currencyCode: shopify ? undefined : (row.currencyCode as string),
    taxRegion: shopify ? undefined : (row.taxRegion as string),
    contacts: shopify ? undefined : ((row.contacts as unknown[] | undefined) ?? []),
    addresses: shopify ? undefined : ((row.addresses as unknown[] | undefined) ?? []),
    invoiceCount: shopify ? undefined : ((row._count as { invoices: number } | undefined)?.invoices ?? 0),
    ordersCount: shopify ? (row.ordersCount as number) : undefined,
    totalSpent: shopify ? Number(row.totalSpent) : undefined,
    store: shopify ? (row.store as { id: string; name: string | null; storeDomain: string }) : undefined,
    storeId: shopify ? (row.storeId as string) : undefined,
    totalSales: totals?.totalSales ?? 0,
    balance: totals?.balance ?? 0,
  };
}

type Raw = Record<string, unknown>;
const asObject = (value: unknown): Raw => (value && typeof value === 'object' ? (value as Raw) : {});
const textOf = (raw: Raw, key: string) => (typeof raw[key] === 'string' ? (raw[key] as string).trim() : '');

/** Trims every field and validates it. Errors are `field: message` so `useRequest` shows them inline. */
export function parseCustomerValues(body: unknown): { values: CustomerValues } | { errors: string[] } {
  const raw = asObject(body);
  const text = (key: string) => textOf(raw, key);
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

function parseContacts(value: unknown, errors: string[]): CustomerContactValues[] {
  const list = Array.isArray(value) ? value.map(asObject) : [];
  if (list.length > MAX_CHILDREN) errors.push(`contacts: Add at most ${MAX_CHILDREN} contacts`);
  return list.map((raw, index) => {
    const email = textOf(raw, 'email');
    if (!textOf(raw, 'name')) errors.push(`contacts: Contact ${index + 1} needs a name`);
    if (email && !EMAIL_RE.test(email)) errors.push(`contacts: Contact ${index + 1} has an invalid email`);
    const contact = { name: textOf(raw, 'name'), email: email || null } as CustomerContactValues;
    for (const key of CONTACT_TEXT) contact[key] = textOf(raw, key) || null;
    return contact;
  });
}

function parseAddresses(value: unknown, errors: string[]): CustomerAddressValues[] {
  const list = Array.isArray(value) ? value.map(asObject) : [];
  if (list.length > MAX_CHILDREN) errors.push(`addresses: Add at most ${MAX_CHILDREN} addresses`);
  const defaultIndex = Math.max(0, list.findIndex((raw) => raw.isDefault === true));
  return list.map((raw, index) => {
    if (!textOf(raw, 'name')) errors.push(`addresses: Address ${index + 1} needs a name`);
    if (textOf(raw, 'email') && !EMAIL_RE.test(textOf(raw, 'email'))) errors.push(`addresses: Address ${index + 1} has an invalid email`);
    const address = { name: textOf(raw, 'name'), isDefault: index === defaultIndex } as CustomerAddressValues;
    for (const key of ADDRESS_TEXT) address[key] = textOf(raw, key) || null;
    return address;
  });
}

/** The customer's own email, phone and billing address are its first contact's, kept in the flat columns
 * so lists, search, invoices and emailing keep working. Nothing is mirrored when there is no contact. */
function primaryContactFields(contact: CustomerContactValues | undefined) {
  if (!contact) return {};
  const { email, phone, address, city, state, zip } = contact;
  return { email, phone, address, address2: null, city, state, zip };
}

/** System customers also carry type, credit limit, invoice defaults, contacts and shipping addresses. */
function parseSystemCustomer(body: unknown): { values: SystemCustomerInput } | { errors: string[] } {
  const parsed = parseCustomerValues(body);
  const raw = asObject(body);
  const errors = 'errors' in parsed ? [...parsed.errors] : [];

  const type = textOf(raw, 'type');
  if (type.length > MAX_LENGTH.type) errors.push(`type: Type must be ${MAX_LENGTH.type} characters or fewer`);
  const limitText = String(raw.creditLimit ?? '').trim();
  const creditLimit = limitText === '' ? null : Number(limitText);
  if (creditLimit !== null && (!Number.isFinite(creditLimit) || creditLimit < 0)) errors.push('creditLimit: Credit limit must be 0 or more');
  const currencyCode = textOf(raw, 'currencyCode') || 'AUD';
  if (!CURRENCIES.includes(currencyCode)) errors.push('currencyCode: Choose AUD or NZD');
  const contacts = parseContacts(raw.contacts, errors);
  const addresses = parseAddresses(raw.addresses, errors);

  if (errors.length || 'errors' in parsed) return { errors };
  const extras: SystemCustomerExtras = {
    type: type || null,
    creditLimit,
    currencyCode,
    taxRegion: taxRegionForCountry(parsed.values.country),
  };
  const mirrored = contacts.length ? primaryContactFields(contacts[0]) : { email: null, phone: null, address: null, address2: null, city: null, state: null, zip: null };
  return { values: { ...parsed.values, ...mirrored, ...extras, contacts, addresses } };
}

const validationError = (errors: string[]) => ({ error: { message: 'Validation failed', errors, status: 400 } });

async function canAccessStore(session: BillingSession, storeId: string) {
  const scope = await billingStoreScope(session);
  return scope === null || scope.includes(storeId);
}

type MergeCandidate = NonNullable<Awaited<ReturnType<CustomerModel['findManyWithChildren']>>>[number];
const MERGE_FIELDS = ['company', 'country', 'type'] as const;
const norm = (...parts: Array<string | null | undefined>) => parts.map((part) => (part ?? '').trim().toLowerCase().replace(/\s+/g, ' ')).join('|');
/** Contacts are the same person when they share an email; without one, when every detail matches. */
const contactKey = (row: CustomerContactValues) => (row.email?.trim() ? norm(row.email) : norm(row.name, row.phone, row.address, row.zip));
const addressKey = (row: CustomerAddressValues) => norm(row.name, row.email, row.address, row.city, row.state, row.zip, row.country);

/** What merging `sources` into `primary` changes: blank fields filled, notes combined, and the
 * contacts and shipping addresses that are not already on the primary moved across (the primary's
 * own come first, then each source's in order). The primary's email, phone and billing address
 * follow its first contact, as they do when a customer is saved. */
function planMerge(primary: MergeCandidate, sources: MergeCandidate[]) {
  const patch: Partial<CustomerValues & SystemCustomerExtras> = {};
  for (const field of MERGE_FIELDS) {
    if (primary[field]?.trim()) continue;
    const donor = sources.find((source) => source[field]?.trim());
    if (donor) patch[field] = donor[field];
  }
  if (patch.country) patch.taxRegion = taxRegionForCountry(patch.country);
  if (primary.creditLimit == null) {
    const donor = sources.find((source) => source.creditLimit != null);
    if (donor) patch.creditLimit = Number(donor.creditLimit);
  }
  const notes = [primary, ...sources].map((row) => row.notes?.trim()).filter((note): note is string => Boolean(note));
  patch.notes = notes.length ? [...new Set(notes)].join('\n').slice(0, MAX_LENGTH.notes) : null;

  const contacts = new Set(primary.contacts.map(contactKey));
  const addresses = new Set(primary.addresses.map(addressKey));
  const moveContacts: Array<{ id: string; position: number }> = [];
  const moveAddresses: Array<{ id: string; position: number }> = [];
  let firstContact: CustomerContactValues | undefined = primary.contacts[0];
  for (const source of sources) {
    for (const contact of source.contacts) {
      if (contacts.has(contactKey(contact))) continue;
      contacts.add(contactKey(contact));
      firstContact ??= contact;
      moveContacts.push({ id: contact.id, position: primary.contacts.length + moveContacts.length });
    }
    for (const address of source.addresses) {
      if (addresses.has(addressKey(address))) continue;
      addresses.add(addressKey(address));
      moveAddresses.push({ id: address.id, position: primary.addresses.length + moveAddresses.length });
    }
  }
  Object.assign(patch, primaryContactFields(firstContact));
  return { patch, moveContacts, moveAddresses };
}

export class CustomerController {
  async list(searchParams: URLSearchParams, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;

    const source = asSource(searchParams.get('source'));
    const sortKeys = source === 'shopify' ? SHOPIFY_CUSTOMER_SORT_KEYS : CUSTOMER_SORT_KEYS;
    const params = readListParams(searchParams, sortKeys, 'name');
    const pagination = (total: number) => buildPagination(params.page, params.pageSize, total);
    const allowedStoreIds = await billingStoreScope(session);

    if (source === 'system') {
      const { rows, total } = await systemModel.list(params);
      const totals = await systemModel.invoiceTotals('customerId', rows.map((row) => row.id), allowedStoreIds);
      return {
        data: { customers: rows.map((row) => toRow('system', row, totals.get(row.id))), pagination: pagination(total) },
      };
    }

    const { rows, total } = await shopifyModel.list({
      ...params,
      storeId: searchParams.get('storeId') || null,
      allowedStoreIds,
    });
    const totals = await systemModel.invoiceTotals('shopifyCustomerId', rows.map((row) => row.id), allowedStoreIds);
    return {
      data: { customers: rows.map((row) => toRow('shopify', row, totals.get(row.id))), pagination: pagination(total) },
    };
  }

  async get(id: string, source: CustomerSource, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;
    const allowedStoreIds = await billingStoreScope(session);

    if (source === 'system') {
      const row = await systemModel.findById(id);
      if (!row) return NOT_FOUND;
      const totals = await systemModel.invoiceTotals('customerId', [id], allowedStoreIds);
      return { data: toRow('system', row, totals.get(id)) };
    }

    const row = await shopifyModel.findById(id);
    if (!row || !(await canAccessStore(session, row.storeId))) return NOT_FOUND;
    const totals = await systemModel.invoiceTotals('shopifyCustomerId', [id], allowedStoreIds);
    return { data: toRow('shopify', row, totals.get(id)) };
  }

  /** One page of the customer's manual invoices, limited to the stores the user can see. */
  async invoices(id: string, searchParams: URLSearchParams, session: BillingSession) {
    if (!canReadBilling(session)) return FORBIDDEN;
    const source = asSource(searchParams.get('source'));
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1);

    if (source === 'system' ? !(await systemModel.findById(id)) : !(await this.visibleShopifyCustomer(id, session))) {
      return NOT_FOUND;
    }
    const owner = source === 'system' ? { customerId: id } : { shopifyCustomerId: id };
    const { rows, total } = await systemModel.invoiceHistory(owner, await billingStoreScope(session), page, HISTORY_PAGE_SIZE);
    return {
      data: {
        invoices: rows.map(({ lineItems, ...invoice }) => ({
          ...invoice,
          total: Number(invoice.total),
          amountPaid: Number(invoice.amountPaid),
          balance: Number(invoice.balance),
          qty: lineItems.reduce((sum, line) => sum + line.qty, 0),
        })),
        pagination: buildPagination(page, HISTORY_PAGE_SIZE, total),
      },
    };
  }

  private async visibleShopifyCustomer(id: string, session: BillingSession) {
    const row = await shopifyModel.findById(id);
    return row && (await canAccessStore(session, row.storeId)) ? row : null;
  }

  async create(body: unknown, source: CustomerSource, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    if (source === 'system') {
      const parsed = parseSystemCustomer(body);
      if ('errors' in parsed) return validationError(parsed.errors);
      const row = await systemModel.create(parsed.values);
      return { data: toRow('system', row), message: 'Customer created' };
    }

    const parsed = parseCustomerValues(body);
    if ('errors' in parsed) return validationError(parsed.errors);
    const storeId = textOf(asObject(body), 'storeId');
    if (!storeId) return validationError(['storeId: Choose a store']);
    if (!(await canAccessStore(session, storeId))) return FORBIDDEN;

    const row = await shopifyModel.create(storeId, parsed.values);
    return { data: toRow('shopify', row), message: 'Customer created' };
  }

  async update(id: string, body: unknown, source: CustomerSource, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    if (source === 'system') {
      const parsed = parseSystemCustomer(body);
      if ('errors' in parsed) return validationError(parsed.errors);
      if (!(await systemModel.findById(id))) return NOT_FOUND;
      const row = await systemModel.update(id, parsed.values);
      return { data: toRow('system', row), message: 'Customer updated' };
    }

    const parsed = parseCustomerValues(body);
    if ('errors' in parsed) return validationError(parsed.errors);
    if (!(await this.visibleShopifyCustomer(id, session))) return NOT_FOUND;
    const row = await shopifyModel.update(id, parsed.values);
    return { data: toRow('shopify', row), message: 'Customer updated' };
  }

  async delete(id: string, source: CustomerSource, session: BillingSession) {
    if (!canWriteBilling(session)) return FORBIDDEN;

    if (source === 'system') {
      if (!(await systemModel.findById(id))) return NOT_FOUND;
      await systemModel.delete(id);
      return { data: { id }, message: 'Customer deleted' };
    }

    if (!(await this.visibleShopifyCustomer(id, session))) return NOT_FOUND;
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

    const found = await systemModel.findManyWithChildren([primaryId, ...sourceIds]);
    const primary = found.find((row) => row.id === primaryId);
    if (!primary || found.length !== sourceIds.length + 1) return NOT_FOUND;

    const plan = planMerge(primary, found.filter((row) => row.id !== primaryId));
    const merged = await systemModel.merge({ primaryId, sourceIds, ...plan });
    return {
      data: toRow('system', merged),
      message: `Merged ${sourceIds.length + 1} customers into ${merged.name}`,
    };
  }
}

export { asSource };
