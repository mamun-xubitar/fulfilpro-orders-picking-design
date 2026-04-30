import prisma from '@/lib/prisma.server';

export type StoreRow = {
  id: string;
  storeDomain: string;
  name: string | null;
  url: string | null;
  email: string | null;
  logoPath: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateStoreData = {
  storeDomain: string;
  name?: string | null;
  clientId: string;
  clientSecret: string;
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
};

export class StoreModel {
  async findMany(): Promise<StoreRow[]> {
    const stores = await prisma.store.findMany({ orderBy: { createdAt: 'desc' } });
    return stores.map((s) => ({
      id: s.id,
      storeDomain: s.storeDomain,
      name: s.name,
      url: s.url,
      email: s.email,
      logoPath: s.logoPath,
      status: s.status,
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

  async create(data: CreateStoreData) {
    return prisma.store.create({
      data: {
        storeDomain: data.storeDomain,
        name: data.name ?? null,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        status: 'pending',
      },
    });
  }

  async createOrUpdateFromAppCreation(data: {
    storeDomain: string;
    clientId: string;
    clientSecret: string;
  }) {
    return prisma.store.upsert({
      where: { storeDomain: data.storeDomain },
      update: {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        status: 'pending',
      },
      create: {
        storeDomain: data.storeDomain,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        status: 'pending',
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
