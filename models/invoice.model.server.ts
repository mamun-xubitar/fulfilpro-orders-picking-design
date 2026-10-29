import prisma from '@/lib/prisma.server';
import { allocateInvoiceNumber, invoiceNumberTaken } from '@/lib/invoice-number.server';
import type { Prisma } from '@prisma/client';

export const INVOICE_SORT_KEYS = ['invoiceNumber', 'issueDate', 'billToName', 'total', 'balance', 'paymentStatus', 'createdAt'] as const;

export type InvoiceListParams = {
  search: string;
  page: number;
  pageSize: number;
  sort: string;
  dir: 'asc' | 'desc';
  storeId: string | null;
  status: string | null;
  allowedStoreIds: string[] | null;
};

export type InvoiceInput = {
  invoiceNumber: string | null;
  storeId: string;
  customerId: string | null;
  shopifyCustomerId: string | null;
  billToName: string;
  billToAddress: string | null;
  shipToName: string;
  shipToAddress: string | null;
  orderRef: string | null;
  issueDate: Date;
  dueDate: Date | null;
  currencyCode: string;
  taxRegion: string;
  taxRate: number;
  shipping: number;
  notes: string | null;
  terms: string | null;
  totals: { sub: number; discount: number; tax: number; total: number; amountPaid: number; balance: number; status: string };
  lineItems: Array<{
    variantId: string | null;
    title: string;
    size: string | null;
    sku: string | null;
    qty: number;
    unitPrice: number;
    discountPercent: number;
    amount: number;
  }>;
};

export type InvoicePaymentInput = { type: string; paidOn: Date; amount: number; person: string | null; description: string | null };

const DETAIL_INCLUDE = {
  lineItems: { orderBy: { position: 'asc' } },
  payments: { orderBy: { paidOn: 'asc' } },
  store: { select: { id: true, name: true, storeDomain: true, url: true, email: true, invoiceSetting: true } },
  customer: { select: { email: true, contacts: { select: { email: true }, orderBy: { position: 'asc' } } } },
  shopifyCustomer: { select: { email: true } },
} satisfies Prisma.InvoiceInclude;

const columns = (input: InvoiceInput) => ({
  storeId: input.storeId,
  customerId: input.customerId,
  shopifyCustomerId: input.shopifyCustomerId,
  billToName: input.billToName,
  billToAddress: input.billToAddress,
  shipToName: input.shipToName,
  shipToAddress: input.shipToAddress,
  orderRef: input.orderRef,
  issueDate: input.issueDate,
  dueDate: input.dueDate,
  currencyCode: input.currencyCode,
  taxRegion: input.taxRegion,
  taxRate: input.taxRate,
  shipping: input.shipping,
  notes: input.notes,
  terms: input.terms,
  subTotal: input.totals.sub,
  discountTotal: input.totals.discount,
  taxTotal: input.totals.tax,
  total: input.totals.total,
  amountPaid: input.totals.amountPaid,
  balance: input.totals.balance,
  paymentStatus: input.totals.status,
});

/** Invoice numbers sort by their counter value so `INV-999` comes before `INV-1000`; typed numbers last. */
const orderFor = (sort: string, dir: 'asc' | 'desc'): Prisma.InvoiceOrderByWithRelationInput[] =>
  sort === 'invoiceNumber'
    ? [{ invoiceSequence: { sort: dir, nulls: 'last' } }, { invoiceNumber: dir }]
    : [{ [sort]: dir }];

/** Turns a unique-constraint clash (two saves racing for the same typed number) into `fallback`. */
const onUniqueViolation =
  <T>(fallback: T) =>
  (error: unknown): T => {
    if ((error as { code?: string } | null)?.code === 'P2002') return fallback;
    throw error;
  };

const lineRows = (input: InvoiceInput) => input.lineItems.map((line, position) => ({ ...line, position }));

export class InvoiceModel {
  async list(params: InvoiceListParams) {
    const scope = params.allowedStoreIds ? { storeId: { in: params.allowedStoreIds } } : {};
    const where: Prisma.InvoiceWhereInput = {
      AND: [
        scope,
        params.storeId ? { storeId: params.storeId } : {},
        params.status ? { paymentStatus: params.status } : {},
        params.search
          ? {
              OR: ['invoiceNumber', 'billToName', 'shipToName', 'orderRef'].map((field) => ({
                [field]: { contains: params.search, mode: 'insensitive' },
              })) as Prisma.InvoiceWhereInput[],
            }
          : {},
      ],
    };
    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: [...orderFor(params.sort, params.dir), { id: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { store: { select: { id: true, name: true, storeDomain: true } }, lineItems: { select: { qty: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id: string) {
    return prisma.invoice.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  }

  async findStoreIdById(id: string) {
    const row = await prisma.invoice.findUnique({ where: { id }, select: { storeId: true } });
    return row?.storeId ?? null;
  }

  /** Creates the invoice, without payments, with the next global number or with `input.invoiceNumber` when one was typed. */
  async create(input: InvoiceInput, storePrefix: string | null, actor: { id: string; name: string }) {
    const id = await prisma.$transaction(async (tx) => {
      let invoiceNumber = input.invoiceNumber;
      let invoiceSequence: number | null = null;
      if (invoiceNumber) {
        if (await invoiceNumberTaken(tx, invoiceNumber)) return null;
      } else {
        ({ invoiceNumber, sequence: invoiceSequence } = await allocateInvoiceNumber(tx, storePrefix));
      }
      const created = await tx.invoice.create({
        data: {
          ...columns(input),
          invoiceNumber,
          invoiceSequence,
          createdById: actor.id,
          createdByName: actor.name,
          lineItems: { create: lineRows(input) },
        },
        select: { id: true },
      });
      return created.id;
    }).catch(onUniqueViolation(null));
    return id ? this.findById(id) : null;
  }

  /** Replaces the invoice's details and lines; payments are left as they are. Returns null when the typed number is taken. */
  async update(id: string, input: InvoiceInput) {
    const ok = await prisma.$transaction(async (tx) => {
      if (input.invoiceNumber && (await invoiceNumberTaken(tx, input.invoiceNumber, id))) return false;
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.update({
        where: { id },
        data: {
          ...columns(input),
          ...(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {}),
          lineItems: { create: lineRows(input) },
        },
      });
      return true;
    }).catch(onUniqueViolation(false));
    return ok ? this.findById(id) : null;
  }

  async delete(id: string) {
    await prisma.invoice.delete({ where: { id } });
  }

  async sumPayments(id: string) {
    const { _sum } = await prisma.invoicePayment.aggregate({ where: { invoiceId: id }, _sum: { amount: true } });
    return Number(_sum.amount ?? 0);
  }

  /** Replaces the invoice's payments and stores the paid amount, balance and status worked out from them. */
  async replacePayments(id: string, payments: InvoicePaymentInput[], totals: { amountPaid: number; balance: number; status: string }) {
    await prisma.$transaction([
      prisma.invoicePayment.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          amountPaid: totals.amountPaid,
          balance: totals.balance,
          paymentStatus: totals.status,
          payments: { create: payments },
        },
      }),
    ]);
    return this.findById(id);
  }

  async findTotalById(id: string) {
    return prisma.invoice.findUnique({ where: { id }, select: { storeId: true, total: true } });
  }

  async markEmailed(id: string) {
    await prisma.invoice.update({ where: { id }, data: { lastEmailedAt: new Date() } });
  }

  async findStoreSettings(storeId: string) {
    return prisma.storeInvoiceSetting.findUnique({ where: { storeId }, select: { invoicePrefix: true } });
  }

  async listStores(allowedStoreIds: string[] | null) {
    return prisma.store.findMany({
      where: { status: 'connected', ...(allowedStoreIds ? { id: { in: allowedStoreIds } } : {}) },
      select: { id: true, name: true, storeDomain: true, invoiceSetting: { select: { ausTaxRate: true, nzTaxRate: true, defaultTerms: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
