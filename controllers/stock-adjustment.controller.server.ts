import prisma from '@/lib/prisma.server';
import { StockAdjustmentModel } from '@/models/stock-adjustment.model.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { upperTrim } from '@/lib/utils/common';
import { StockAdjustmentReason } from '@prisma/client';

const model = new StockAdjustmentModel();
const productModel = new SupplierProductModel();
const REASON_VALUES = new Set<string>(Object.values(StockAdjustmentReason));

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class StockAdjustmentController {
  async list(supplierProductId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const adjustments = await model.listForProduct(supplierProductId);
    return { data: { adjustments } };
  }

  /** Accepts either a single { variantId, delta, reason, note } body (unchanged) or a batch
   * { items: [...] } body for the multi-row "Adjust Stock" modal — applied in one transaction. */
  async create(supplierProductId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawItems = Array.isArray(value.items) ? value.items : [value];

    const errors: string[] = [];
    const parsed: { variantId: string; delta: number; reason: StockAdjustmentReason; note: string | null }[] = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const variantId = typeof item.variantId === 'string' ? item.variantId.trim() : '';
      const delta = Number(item.delta);
      const reasonRaw = typeof item.reason === 'string' ? item.reason : '';
      const note = typeof item.note === 'string' ? upperTrim(item.note) : '';

      if (!variantId) {
        errors.push('variantId: Select a variant');
        continue;
      }
      if (!Number.isFinite(delta) || delta === 0) {
        errors.push(`delta: Enter a non-zero quantity for ${variantId}`);
        continue;
      }
      if (!REASON_VALUES.has(reasonRaw)) {
        errors.push(`reason: Select a reason for ${variantId}`);
        continue;
      }
      parsed.push({ variantId, delta: Math.trunc(delta), reason: reasonRaw as StockAdjustmentReason, note: note || null });
    }
    if (parsed.length === 0) {
      return { error: { message: 'Validation failed', errors: errors.length ? errors : ['items: No valid adjustments to save'], status: 400 } };
    }

    const variants = await prisma.supplierProductVariant.findMany({
      where: { id: { in: parsed.map((p) => p.variantId) } },
      select: { id: true, supplierProductId: true, stockOnHand: true },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    for (const item of parsed) {
      const variant = variantById.get(item.variantId);
      if (!variant || variant.supplierProductId !== supplierProductId) return { error: { message: 'Variant not found', status: 404 } };
      if (variant.stockOnHand + item.delta < 0) {
        return { error: { message: 'Validation failed', errors: [`delta: This would take ${variant.id} below 0`], status: 400 } };
      }
    }

    const actor = { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
    await model.createMany(parsed.map((item) => ({ supplierProductId, ...item, actorId: actor.id, actorName: actor.name })));

    const product = await productModel.findById(supplierProductId);
    return { data: product, message: parsed.length === 1 ? 'Stock adjusted' : `${parsed.length} adjustments saved` };
  }
}
