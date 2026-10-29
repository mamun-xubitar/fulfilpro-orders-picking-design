import prisma from '@/lib/prisma.server';
import type { Prisma } from '@prisma/client';

export const CUSTOMER_SORT_KEYS = ['code', 'name', 'company', 'email', 'country', 'type', 'createdAt'] as const;

/** Contact fields shared by system and Shopify customers. */
export type CustomerValues = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  notes: string | null;
};

/** Fields only system customers have. */
export type SystemCustomerExtras = {
  type: string | null;
  creditLimit: number | null;
  currencyCode: string;
  taxRegion: string;
};

export type CustomerContactValues = { name: string; email: string | null; phone: string | null; jobTitle: string | null };

export type CustomerAddressValues = {
  label: string | null;
  name: string;
  phone: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  isDefault: boolean;
};

export type SystemCustomerInput = CustomerValues &
  SystemCustomerExtras & { contacts: CustomerContactValues[]; addresses: CustomerAddressValues[] };

export type CustomerListParams = {
  search: string;
  page: number;
  pageSize: number;
  sort: string;
  dir: 'asc' | 'desc';
};

/** Which customer an invoice history / totals query is for. */
export type InvoiceOwner = { customerId: string } | { shopifyCustomerId: string };

const CODE_RE = /^c?(\d{1,9})$/i;

const searchWhere = (search: string): Prisma.CustomerWhereInput => {
  if (!search) return {};
  const code = CODE_RE.exec(search);
  return {
    OR: [
      ...(['name', 'company', 'email', 'phone', 'city', 'country'].map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      })) as Prisma.CustomerWhereInput[]),
      { contacts: { some: { email: { contains: search, mode: 'insensitive' } } } },
      ...(code ? [{ code: Number(code[1]) }] : []),
    ],
  };
};

const storeWhere = (allowedStoreIds: string[] | null): Prisma.InvoiceWhereInput =>
  allowedStoreIds ? { storeId: { in: allowedStoreIds } } : {};

const positioned = <T>(rows: T[]) => rows.map((row, position) => ({ ...row, position }));

const children = { contacts: { orderBy: { position: 'asc' } }, addresses: { orderBy: { position: 'asc' } } } as const;

export class CustomerModel {
  async list(params: CustomerListParams) {
    const where = searchWhere(params.search);
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: [{ [params.sort]: params.dir }, { id: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { ...children, _count: { select: { invoices: true } } },
      }),
      prisma.customer.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id: string) {
    return prisma.customer.findUnique({ where: { id }, include: { ...children, _count: { select: { invoices: true } } } });
  }

  async findManyWithChildren(ids: string[]) {
    return prisma.customer.findMany({ where: { id: { in: ids } }, include: children });
  }

  async create(input: SystemCustomerInput) {
    const { contacts, addresses, ...data } = input;
    return prisma.customer.create({
      data: {
        ...data,
        contacts: { createMany: { data: positioned(contacts) } },
        addresses: { createMany: { data: positioned(addresses) } },
      },
      include: { ...children, _count: { select: { invoices: true } } },
    });
  }

  /** Replaces the customer's fields, contacts and addresses in one transaction. */
  async update(id: string, input: SystemCustomerInput) {
    const { contacts, addresses, ...data } = input;
    return prisma.$transaction(async (tx) => {
      await tx.customerContact.deleteMany({ where: { customerId: id } });
      await tx.customerAddress.deleteMany({ where: { customerId: id } });
      return tx.customer.update({
        where: { id },
        data: {
          ...data,
          contacts: { createMany: { data: positioned(contacts) } },
          addresses: { createMany: { data: positioned(addresses) } },
        },
        include: { ...children, _count: { select: { invoices: true } } },
      });
    });
  }

  async delete(id: string) {
    await prisma.customer.delete({ where: { id } });
  }

  /** Folds `sourceIds` into `primaryId`: applies `patch`, moves invoices and the given contacts and
   * addresses (with their new positions) to the primary, then removes the sources. */
  async merge(input: {
    primaryId: string;
    sourceIds: string[];
    patch: Partial<CustomerValues & SystemCustomerExtras>;
    moveContacts: Array<{ id: string; position: number }>;
    moveAddresses: Array<{ id: string; position: number }>;
  }) {
    const { primaryId, sourceIds } = input;
    return prisma.$transaction(async (tx) => {
      for (const { id, position } of input.moveContacts) {
        await tx.customerContact.update({ where: { id }, data: { customerId: primaryId, position } });
      }
      for (const { id, position } of input.moveAddresses) {
        await tx.customerAddress.update({ where: { id }, data: { customerId: primaryId, position, isDefault: false } });
      }
      await tx.invoice.updateMany({ where: { customerId: { in: sourceIds } }, data: { customerId: primaryId } });
      await tx.customer.deleteMany({ where: { id: { in: sourceIds } } });
      return tx.customer.update({
        where: { id: primaryId },
        data: input.patch,
        include: { ...children, _count: { select: { invoices: true } } },
      });
    });
  }

  async exists(id: string) {
    return Boolean(await prisma.customer.findUnique({ where: { id }, select: { id: true } }));
  }

  /** Invoiced total and outstanding balance per customer, counting only invoices in the given stores. */
  async invoiceTotals(field: 'customerId' | 'shopifyCustomerId', ids: string[], allowedStoreIds: string[] | null) {
    if (!ids.length) return new Map<string, { totalSales: number; balance: number }>();
    const groups = await prisma.invoice.groupBy({
      by: [field],
      where: { [field]: { in: ids }, ...storeWhere(allowedStoreIds) },
      _sum: { total: true, balance: true },
    });
    return new Map(
      groups.map((group) => [
        group[field] as string,
        { totalSales: Number(group._sum.total ?? 0), balance: Number(group._sum.balance ?? 0) },
      ]),
    );
  }

  async invoiceHistory(owner: InvoiceOwner, allowedStoreIds: string[] | null, page: number, pageSize: number) {
    const where: Prisma.InvoiceWhereInput = { ...owner, ...storeWhere(allowedStoreIds) };
    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: [{ issueDate: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          invoiceNumber: true,
          orderRef: true,
          issueDate: true,
          currencyCode: true,
          total: true,
          amountPaid: true,
          balance: true,
          paymentStatus: true,
          createdByName: true,
          lineItems: { select: { qty: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);
    return { rows, total };
  }
}
