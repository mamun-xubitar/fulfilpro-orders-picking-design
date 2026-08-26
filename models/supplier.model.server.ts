import prisma from '@/lib/prisma.server';

export type SupplierRow = {
  id: string;
  name: string;
  contactEmail: string | null;
  poEmail: string;
  description: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierOption = { id: string; name: string; poEmail: string };

export class SupplierModel {
  async list(params: { search?: string; page: number; pageSize: number }) {
    const where = params.search
      ? { name: { contains: params.search, mode: 'insensitive' as const } }
      : {};

    const [total, rows] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({
        where,
        include: { _count: { select: { products: true } } },
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
      include: { _count: { select: { products: true } } },
    });
    return row ? toSupplierRow(row) : null;
  }

  async create(data: { name: string; contactEmail: string | null; poEmail: string; description: string | null }) {
    const row = await prisma.supplier.create({
      data,
      include: { _count: { select: { products: true } } },
    });
    return toSupplierRow(row);
  }

  async update(id: string, data: { name?: string; contactEmail?: string | null; poEmail?: string; description?: string | null }) {
    const row = await prisma.supplier.update({
      where: { id },
      data,
      include: { _count: { select: { products: true } } },
    });
    return toSupplierRow(row);
  }

  async delete(id: string) {
    await prisma.supplier.delete({ where: { id } });
  }

  async listOptions(): Promise<SupplierOption[]> {
    const rows = await prisma.supplier.findMany({ select: { id: true, name: true, poEmail: true }, orderBy: { name: 'asc' } });
    return rows;
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
  _count: { products: number };
};

function toSupplierRow(row: SupplierWithCount): SupplierRow {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contactEmail,
    poEmail: row.poEmail,
    description: row.description,
    productCount: row._count.products,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
