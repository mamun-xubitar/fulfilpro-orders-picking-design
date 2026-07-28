import prisma from '@/lib/prisma.server';

export type SupplierRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  poEmail: string;
  description: string | null;
  productCount: number;
  collectionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierOption = { id: string; name: string };

export type SupplierConnectionProduct = {
  id: string;
  productId: string;
  title: string;
  storeName: string;
  linkedAt: string;
};

export type SupplierConnectionCollection = {
  id: string;
  storeId: string;
  storeName: string;
  collectionId: string;
  title: string;
  handle: string | null;
};

export type AttachedSupplier = { id: string; name: string; linkedAt: string };
export type CollectionSupplier = { id: string; name: string; collectionTitle: string };

export class SupplierModel {
  async list(params: { search?: string; page: number; pageSize: number }) {
    const where = params.search
      ? { name: { contains: params.search, mode: 'insensitive' as const } }
      : {};

    const [total, rows] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { products: true, collections: true } } },
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    return { total, suppliers: rows.map(toSupplierRow) };
  }

  async findById(id: string): Promise<SupplierRow | null> {
    const row = await prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { products: true, collections: true } } },
    });
    return row ? toSupplierRow(row) : null;
  }

  async create(data: { name: string; contactEmail: string | null; poEmail: string; description: string | null }) {
    const row = await prisma.supplier.create({
      data,
      include: { _count: { select: { products: true, collections: true } } },
    });
    return toSupplierRow(row);
  }

  async update(id: string, data: { name?: string; contactEmail?: string | null; poEmail?: string; description?: string | null }) {
    const row = await prisma.supplier.update({
      where: { id },
      data,
      include: { _count: { select: { products: true, collections: true } } },
    });
    return toSupplierRow(row);
  }

  async delete(id: string) {
    await prisma.supplier.delete({ where: { id } });
  }

  async listOptions(): Promise<SupplierOption[]> {
    const rows = await prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
    return rows;
  }

  async listConnections(supplierId: string): Promise<{ products: SupplierConnectionProduct[]; collections: SupplierConnectionCollection[] }> {
    const [products, collections] = await Promise.all([
      prisma.supplierProduct.findMany({
        where: { supplierId },
        include: { product: { select: { title: true, store: { select: { name: true, storeDomain: true } } } } },
        orderBy: { linkedAt: 'desc' },
      }),
      prisma.supplierCollection.findMany({
        where: { supplierId },
        include: { store: { select: { name: true, storeDomain: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        productId: p.productId,
        title: p.product.title,
        storeName: p.product.store.name ?? p.product.store.storeDomain,
        linkedAt: p.linkedAt.toISOString(),
      })),
      collections: collections.map((c) => ({
        id: c.id,
        storeId: c.storeId,
        storeName: c.store.name ?? c.store.storeDomain,
        collectionId: c.collectionId,
        title: c.title,
        handle: c.handle,
      })),
    };
  }

  async linkProduct(supplierId: string, productId: string) {
    await prisma.supplierProduct.upsert({
      where: { supplierId_productId: { supplierId, productId } },
      update: { linkedAt: new Date() },
      create: { supplierId, productId },
    });
  }

  async unlinkProduct(supplierId: string, productId: string) {
    await prisma.supplierProduct.deleteMany({ where: { supplierId, productId } });
  }

  async linkCollection(data: { supplierId: string; storeId: string; collectionId: string; title: string; handle: string | null }) {
    await prisma.supplierCollection.upsert({
      where: { supplierId_storeId_collectionId: { supplierId: data.supplierId, storeId: data.storeId, collectionId: data.collectionId } },
      update: { title: data.title, handle: data.handle },
      create: data,
    });
  }

  async unlinkCollection(supplierId: string, storeId: string, collectionId: string) {
    await prisma.supplierCollection.deleteMany({ where: { supplierId, storeId, collectionId } });
  }

  async findForProduct(productId: string): Promise<AttachedSupplier[]> {
    const rows = await prisma.supplierProduct.findMany({
      where: { productId },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { linkedAt: 'desc' },
    });
    return rows.map((r) => ({ id: r.supplier.id, name: r.supplier.name, linkedAt: r.linkedAt.toISOString() }));
  }

  async findByCollections(storeId: string, collectionIds: string[]): Promise<CollectionSupplier[]> {
    if (collectionIds.length === 0) return [];
    const rows = await prisma.supplierCollection.findMany({
      where: { storeId, collectionId: { in: collectionIds } },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const seen = new Set<string>();
    const result: CollectionSupplier[] = [];
    for (const row of rows) {
      if (seen.has(row.supplier.id)) continue;
      seen.add(row.supplier.id);
      result.push({ id: row.supplier.id, name: row.supplier.name, collectionTitle: row.title });
    }
    return result;
  }
}

type SupplierWithCount = {
  id: string;
  name: string;
  contactEmail: string | null;
  poEmail: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { products: number; collections: number };
};

function toSupplierRow(row: SupplierWithCount): SupplierRow {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contactEmail,
    poEmail: row.poEmail,
    description: row.description,
    productCount: row._count.products,
    collectionCount: row._count.collections,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
