import prisma from '@/lib/prisma.server';
import type { Prisma } from '@prisma/client';

export const CUSTOMER_SORT_KEYS = ['name', 'company', 'email', 'country', 'createdAt'] as const;

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

export type CustomerListParams = {
  search: string;
  page: number;
  pageSize: number;
  sort: string;
  dir: 'asc' | 'desc';
};

const FIELDS = ['company', 'email', 'phone', 'address', 'address2', 'city', 'state', 'zip', 'country', 'notes'] as const;

const searchWhere = (search: string): Prisma.CustomerWhereInput =>
  search
    ? {
        OR: ['name', 'company', 'email', 'phone', 'city', 'country'].map((field) => ({
          [field]: { contains: search, mode: 'insensitive' },
        })) as Prisma.CustomerWhereInput[],
      }
    : {};

export class CustomerModel {
  async list(params: CustomerListParams) {
    const where = searchWhere(params.search);
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: [{ [params.sort]: params.dir }, { id: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { _count: { select: { invoices: true } } },
      }),
      prisma.customer.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        invoices: {
          orderBy: { issueDate: 'desc' },
          take: 20,
          select: { id: true, invoiceNumber: true, issueDate: true, total: true, amountPaid: true, balance: true, paymentStatus: true },
        },
      },
    });
  }

  async create(data: CustomerValues) {
    return prisma.customer.create({ data });
  }

  async update(id: string, data: Partial<CustomerValues>) {
    return prisma.customer.update({ where: { id }, data });
  }

  async delete(id: string) {
    await prisma.customer.delete({ where: { id } });
  }

  /** Folds `sourceIds` into `primaryId` in one transaction: blank fields on the primary are filled
   * from the others, invoices are re-pointed, notes are combined, and the sources are removed. */
  async merge(primaryId: string, sourceIds: string[]) {
    return prisma.$transaction(async (tx) => {
      const primary = await tx.customer.findUnique({ where: { id: primaryId } });
      const sources = await tx.customer.findMany({ where: { id: { in: sourceIds } } });
      if (!primary) return null;

      const patch: Partial<CustomerValues> = {};
      for (const field of FIELDS) {
        if (field === 'notes') continue;
        if (primary[field]?.trim()) continue;
        const donor = sources.find((source) => source[field]?.trim());
        if (donor) patch[field] = donor[field];
      }
      const notes = [primary, ...sources].map((row) => row.notes?.trim()).filter((note): note is string => Boolean(note));
      patch.notes = notes.length ? [...new Set(notes)].join('\n') : null;

      await tx.invoice.updateMany({ where: { customerId: { in: sourceIds } }, data: { customerId: primaryId } });
      await tx.customer.deleteMany({ where: { id: { in: sourceIds } } });
      return tx.customer.update({ where: { id: primaryId }, data: patch });
    });
  }

  async findManyByIds(ids: string[]) {
    return prisma.customer.findMany({ where: { id: { in: ids } } });
  }
}
