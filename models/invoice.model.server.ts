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
  payments: Array<{ type: string; paidOn: Date; amount: number; person: string | null; description: string | null }>;
};

const DETAIL_INCLUDE = {
  lineItems: { orderBy: { position: 'asc' } },
  payments: { orderBy: { paidOn: 'asc' } },
  store: { select: { id: true, name: true, storeDomain: true, url: true, email: true, invoiceSetting: true } },
} satisfies Prisma.InvoiceInclude;

const columns = (input: InvoiceInput) => ({
  storeId: input.storeId,
  customerId: input.customerId,
  shopifyCustomerId: input.shopifyCustomerId,
  billToName: input.billToName,
  billToAddress: input.billToAddress,
  shipToName: input.shipToName,
  shipToAddress: input.shipToAddress,
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

const lineRows = (input: InvoiceInput) => input.lineItems.map((line, position) => ({ ...line, position }));
const paymentRows = (input: InvoiceInput) => input.payments.map(({ paidOn, ...rest }) => ({ ...rest, paidOn }));

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
              OR: ['invoiceNumber', 'billToName', 'shipToName'].map((field) => ({
                [field]: { contains: params.search, mode: 'insensitive' },
              })) as Prisma.InvoiceWhereInput[],
            }
          : {},
      ],
    };
    const [rows, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: [{ [params.sort]: params.dir }, { id: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { store: { select: { id: true, name: true, storeDomain: true } } },
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

  /** Creates the invoice with the next global number, or with `input.invoiceNumber` when one was typed. */
  async create(input: InvoiceInput, storePrefix: string | null) {
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
          lineItems: { create: lineRows(input) },
          payments: { create: paymentRows(input) },
        },
        select: { id: true },
      });
      return created.id;
    });
    return id ? this.findById(id) : null;
  }

  /** Replaces the invoice's details, lines and payments. Returns null when the typed number is taken. */
  async update(id: string, input: InvoiceInput) {
    const ok = await prisma.$transaction(async (tx) => {
      if (input.invoiceNumber && (await invoiceNumberTaken(tx, input.invoiceNumber, id))) return false;
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      await tx.invoicePayment.deleteMany({ where: { invoiceId: id } });
      await tx.invoice.update({
        where: { id },
        data: {
          ...columns(input),
          ...(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {}),
          lineItems: { create: lineRows(input) },
          payments: { create: paymentRows(input) },
        },
      });
      return true;
    });
    return ok ? this.findById(id) : null;
  }

  async delete(id: string) {
    await prisma.invoice.delete({ where: { id } });
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
