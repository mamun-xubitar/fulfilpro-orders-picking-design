import prisma from '@/lib/prisma.server';
import { StockAdjustmentModel } from '@/models/stock-adjustment.model.server';
import { StockAdjustmentReason } from '@prisma/client';

const model = new StockAdjustmentModel();
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

  async create(supplierProductId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const variantId = typeof value.variantId === 'string' ? value.variantId.trim() : '';
    const delta = Number(value.delta);
    const reasonRaw = typeof value.reason === 'string' ? value.reason : '';
    const note = typeof value.note === 'string' ? value.note.trim() : '';

    const errors: string[] = [];
    if (!variantId) errors.push('variantId: Select a variant');
    if (!Number.isFinite(delta) || delta === 0) errors.push('delta: Enter a non-zero quantity');
    if (!REASON_VALUES.has(reasonRaw)) errors.push('reason: Select a reason');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const variant = await prisma.supplierProductVariant.findUnique({ where: { id: variantId }, select: { supplierProductId: true, stockOnHand: true } });
    if (!variant || variant.supplierProductId !== supplierProductId) return { error: { message: 'Variant not found', status: 404 } };
    if (variant.stockOnHand + delta < 0) return { error: { message: 'Validation failed', errors: ['delta: This would take stock below 0'], status: 400 } };

    const actor = { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
    await model.create({ supplierProductId, variantId, delta: Math.trunc(delta), reason: reasonRaw as StockAdjustmentReason, note: note || null, actorId: actor.id, actorName: actor.name });

    return { data: null, message: 'Stock adjusted' };
  }
}
