import prisma from '@/lib/prisma.server';

export type NoteType = {
  id: number;
  text: string;
  createdAt: string;
  editedAt: string | null;
};

export type StoreRow = {
  id: string;
  storeDomain: string;
  name: string | null;
  url: string | null;
  email: string | null;
  profitMargin: number | null;
  notes: NoteType[];
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
  profitMargin?: number;
  notes?: string;
  name?: string;
  url?: string | null;
  email?: string | null;
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
      profitMargin: s.profitMargin,
      notes: s.notes ? (JSON.parse(s.notes as string) as NoteType[]) : [],
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
        profitMargin: 10,
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
        profitMargin: 10,
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
