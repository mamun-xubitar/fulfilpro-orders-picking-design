import prisma from '@/lib/prisma.server';
import { Prisma } from '@prisma/client';

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
        include: { _count: { select: { productLinks: true } } },
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
      include: { _count: { select: { productLinks: true } } },
    });
    return row ? toSupplierRow(row) : null;
  }

  async create(data: { name: string; contactEmail: string | null; poEmail: string; description: string | null }) {
    const row = await prisma.supplier.create({
      data,
      include: { _count: { select: { productLinks: true } } },
    });
    return toSupplierRow(row);
  }

  async update(id: string, data: { name?: string; contactEmail?: string | null; poEmail?: string; description?: string | null }) {
    const row = await prisma.supplier.update({
      where: { id },
      data,
      include: { _count: { select: { productLinks: true } } },
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

  /** Count of products for which this supplier is the ONLY linked supplier — deleting the
   * supplier would leave these with none, so the controller refuses when this is > 0 (a supplier
   * that shares a product with another supplier can always be safely unlinked). */
  async countSoleSupplierFor(id: string): Promise<number> {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "SupplierProductSupplier" sps1
      WHERE sps1."supplierId" = ${id}
        AND NOT EXISTS (
          SELECT 1 FROM "SupplierProductSupplier" sps2
          WHERE sps2."supplierProductId" = sps1."supplierProductId" AND sps2."supplierId" != ${id}
        )
    `);
    return Number(rows[0]?.count ?? 0);
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
  /** Every product this supplier has ever been linked to — primary (created-under) or picked up
   * later via a Receive PO — not just the ones it's the current primary supplier for. */
  _count: { productLinks: number };
};

function toSupplierRow(row: SupplierWithCount): SupplierRow {
  return {
    id: row.id,
    name: row.name,
    contactEmail: row.contactEmail,
    poEmail: row.poEmail,
    description: row.description,
    productCount: row._count.productLinks,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
