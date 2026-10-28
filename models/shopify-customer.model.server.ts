import prisma from '@/lib/prisma.server';
import type { Prisma } from '@prisma/client';
import type { CustomerListParams, CustomerValues } from '@/models/customer.model.server';

export const SHOPIFY_CUSTOMER_SORT_KEYS = ['name', 'company', 'email', 'country', 'ordersCount', 'totalSpent', 'createdAt'] as const;

export type ShopifyCustomerListParams = CustomerListParams & {
  storeId: string | null;
  allowedStoreIds: string[] | null;
};

const storeSelect = { select: { id: true, name: true, storeDomain: true } } as const;

const scopeWhere = (storeId: string | null, allowedStoreIds: string[] | null): Prisma.ShopifyCustomerWhereInput => {
  const allowed = allowedStoreIds ? { storeId: { in: allowedStoreIds } } : {};
  return storeId ? { AND: [allowed, { storeId }] } : allowed;
};

export class ShopifyCustomerModel {
  async list(params: ShopifyCustomerListParams) {
    const search: Prisma.ShopifyCustomerWhereInput = params.search
      ? {
          OR: ['name', 'company', 'email', 'phone', 'city', 'country'].map((field) => ({
            [field]: { contains: params.search, mode: 'insensitive' },
          })) as Prisma.ShopifyCustomerWhereInput[],
        }
      : {};
    const where: Prisma.ShopifyCustomerWhereInput = {
      deletedAt: null,
      AND: [scopeWhere(params.storeId, params.allowedStoreIds), search],
    };
    const [rows, total] = await Promise.all([
      prisma.shopifyCustomer.findMany({
        where,
        orderBy: [{ [params.sort]: params.dir }, { id: 'asc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { store: storeSelect },
      }),
      prisma.shopifyCustomer.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(id: string) {
    return prisma.shopifyCustomer.findFirst({
      where: { id, deletedAt: null },
      include: { store: storeSelect },
    });
  }

  /** A live (not soft-deleted) customer of the given store, for linking to an invoice. */
  async existsInStore(id: string, storeId: string) {
    return Boolean(await prisma.shopifyCustomer.findFirst({ where: { id, storeId, deletedAt: null }, select: { id: true } }));
  }

  async create(storeId: string, data: CustomerValues) {
    return prisma.shopifyCustomer.create({
      data: { storeId, ...data, locallyEdited: true },
      include: { store: storeSelect },
    });
  }

  async update(id: string, data: Partial<CustomerValues>) {
    return prisma.shopifyCustomer.update({
      where: { id },
      data: { ...data, locallyEdited: true },
      include: { store: storeSelect },
    });
  }

  async softDelete(id: string) {
    await prisma.shopifyCustomer.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Writes one synced customer. Rows edited or deleted locally are left exactly as they are. */
  async upsertFromShopify(storeId: string, shopifyCustomerId: string, data: CustomerValues & { ordersCount: number; totalSpent: number }) {
    const existing = await prisma.shopifyCustomer.findUnique({
      where: { storeId_shopifyCustomerId: { storeId, shopifyCustomerId } },
      select: { id: true, locallyEdited: true, deletedAt: true },
    });
    if (!existing) {
      await prisma.shopifyCustomer.create({ data: { storeId, shopifyCustomerId, ...data } });
      return;
    }
    if (existing.deletedAt) return;
    // Locally edited rows keep their contact details but still get fresh order figures.
    const { ordersCount, totalSpent } = data;
    await prisma.shopifyCustomer.update({
      where: { id: existing.id },
      data: existing.locallyEdited ? { ordersCount, totalSpent } : data,
    });
  }
}
