import prisma from '@/lib/prisma.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';

const model = new SupplierProductModel();

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;
type ImportRow = { colour: string; size: string; sku: string | null; barcode: string | null; stockOnHand: number; buyPrice?: number; sellPrice: number; trigger?: number };

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class InventoryImportController {
  async importVariants(supplierProductId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(supplierProductId))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawRows = Array.isArray(value.rows) ? value.rows : [];

    const rows: ImportRow[] = [];
    for (const raw of rawRows) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as Record<string, unknown>;
      const colour = typeof r.colour === 'string' ? r.colour.trim() : '';
      const size = typeof r.size === 'string' ? r.size.trim() : '';
      if (!colour || !size) continue;
      rows.push({
        colour,
        size,
        sku: typeof r.sku === 'string' && r.sku.trim() ? r.sku.trim() : null,
        barcode: typeof r.barcode === 'string' && r.barcode.trim() ? r.barcode.trim() : null,
        stockOnHand: Number.isFinite(Number(r.stockOnHand)) ? Math.max(0, Math.trunc(Number(r.stockOnHand))) : 0,
        buyPrice: r.buyPrice !== undefined && Number.isFinite(Number(r.buyPrice)) ? Number(r.buyPrice) : undefined,
        sellPrice: Number.isFinite(Number(r.sellPrice)) ? Number(r.sellPrice) : 0,
        trigger: r.trigger !== undefined && Number.isFinite(Number(r.trigger)) ? Math.max(0, Math.trunc(Number(r.trigger))) : undefined,
      });
    }
    if (rows.length === 0) return { error: { message: 'rows: No valid rows to import', status: 400 } };

    let created = 0;
    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const existing = await tx.supplierProductVariant.findUnique({
          where: { supplierProductId_colour_size: { supplierProductId, colour: row.colour, size: row.size } },
        });
        if (existing) {
          await tx.supplierProductVariant.update({
            where: { id: existing.id },
            data: {
              sku: row.sku,
              barcode: row.barcode,
              stockOnHand: row.stockOnHand,
              sellPrice: row.sellPrice,
              ...(row.buyPrice !== undefined && { buyPrice: row.buyPrice }),
              ...(row.trigger !== undefined && { trigger: row.trigger }),
            },
          });
          updated++;
        } else {
          await tx.supplierProductVariant.create({
            data: { supplierProductId, colour: row.colour, size: row.size, sku: row.sku, barcode: row.barcode, stockOnHand: row.stockOnHand, sellPrice: row.sellPrice, buyPrice: row.buyPrice ?? 0, trigger: row.trigger ?? 0 },
          });
          created++;
        }
      }
      await tx.inventoryActivity.create({
        data: {
          supplierProductId,
          type: 'imported',
          message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'} (${created} created, ${updated} updated)`,
          actorId: session?.user?.id ?? null,
          actorName: session?.user?.name ?? session?.user?.email ?? 'Unknown',
        },
      });
    });

    const product = await model.findById(supplierProductId);
    return { data: { product, created, updated }, message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'}` };
  }
}
