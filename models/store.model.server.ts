import prisma from '@/lib/prisma.server';

export type StoreRow = {
  id: string;
  storeDomain: string;
  name: string | null;
  url: string | null;
  email: string | null;
  logoPath: string | null;
  status: string;
  partnerStoreId: string | null;
  partnerStoreName: string | null;
  hasApp: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreData = {
  storeDomain: string;
  name?: string | null;
  clientId: string;
  clientSecret: string;
  partnerStoreId?: string | null;
};

export type UpdateStoreData = {
  status?: string;
  accessToken?: string | null;
  name?: string;
  url?: string | null;
  email?: string | null;
  logoPath?: string | null;
  clientId?: string;
  clientSecret?: string;
  partnerStoreId?: string | null;
};

export class StoreModel {
  async findMany(): Promise<StoreRow[]> {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
      include: { partnerStore: true }
    });
    return stores.map((s) => ({
      id: s.id,
      storeDomain: s.storeDomain,
      name: s.name,
      url: s.url,
      email: s.email,
      logoPath: s.logoPath,
      status: s.status,
      partnerStoreId: s.partnerStoreId,
      partnerStoreName: s.partnerStore?.name ?? null,
      hasApp: !!s.appId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async findById(id: string) {
    return prisma.store.findUnique({ where: { id } });
  }

  async existsByDomain(storeDomain: string) {
    const store = await prisma.store.findUnique({ where: { storeDomain } });
    return !!store;
  }

  async findByDomain(storeDomain: string) {
    return prisma.store.findUnique({ where: { storeDomain } });
  }

  /** Connected stores with their access token — for server-only Shopify Admin API calls
   * (e.g. store-listing lookups). `findMany` deliberately omits the token. */
  async findConnectedWithTokens(): Promise<{ id: string; storeDomain: string; name: string | null; accessToken: string }[]> {
    const stores = await prisma.store.findMany({
      where: { status: 'connected', accessToken: { not: null } },
      select: { id: true, storeDomain: true, name: true, accessToken: true },
      orderBy: [{ name: 'asc' }, { storeDomain: 'asc' }],
    });
    return stores as { id: string; storeDomain: string; name: string | null; accessToken: string }[];
  }

  /** Every connected store's global default margin — the "Per store margin" section on the
   * inventory toolbar's Store-wide defaults card. Null entries are stores with no default set
   * yet, which fall back further to the product's own sell price. */
  async findConnectedWithDefaultMargins(): Promise<{ id: string; storeDomain: string; name: string | null; defaultMarginPercent: number | null }[]> {
    const stores = await prisma.store.findMany({
      where: { status: 'connected' },
      select: { id: true, storeDomain: true, name: true, defaultMarginPercent: true },
      orderBy: [{ name: 'asc' }, { storeDomain: 'asc' }],
    });
    return stores.map((s) => ({ ...s, defaultMarginPercent: s.defaultMarginPercent !== null ? Number(s.defaultMarginPercent) : null }));
  }

  async setDefaultMargin(id: string, marginPercent: number | null) {
    await prisma.store.update({ where: { id }, data: { defaultMarginPercent: marginPercent } });
  }

  async create(data: CreateStoreData) {
    return prisma.store.create({
      data: {
        storeDomain: data.storeDomain,
        name: data.name ?? null,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        partnerStoreId: data.partnerStoreId ?? null,
        status: 'pending',
      },
    });
  }

  async updateStoreWithTokens(appManagementToken: string, expireAt: string, store: string) {
    return prisma.store.update({
      where: { storeDomain: store },
      data: { appManagementToken: appManagementToken, appManagementTokenExpiresAt: expireAt }
    })
  }

  async createOrUpdateFromAppCreation(data: {
    storeDomain: string;
    clientId: string;
    appId: string;
    clientSecret: string;
    partnerStoreId?: string | null;
    appManagementToken: string;
    appManagementTokenExpiresAt: string;
  }) {
    return prisma.store.upsert({
      where: { storeDomain: data.storeDomain },
      update: {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        partnerStoreId: data.partnerStoreId ?? undefined,
        status: 'pending',
        appId: data.appId,
        appManagementToken: data.appManagementToken,
        appManagementTokenExpiresAt: data.appManagementTokenExpiresAt
      },
      create: {
        storeDomain: data.storeDomain,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        partnerStoreId: data.partnerStoreId ?? null,
        status: 'pending',
        appId: data.appId,
        appManagementToken: data.appManagementToken,
        appManagementTokenExpiresAt: data.appManagementTokenExpiresAt
      },
    });
  }

  async updateByDomain(storeDomain: string, data: UpdateStoreData) {
    return prisma.store.update({ where: { storeDomain }, data });
  }

  async update(id: string, data: UpdateStoreData) {
    return prisma.store.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.store.delete({ where: { id } });
  }
}
