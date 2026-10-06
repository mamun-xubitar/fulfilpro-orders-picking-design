import prisma from '@/lib/prisma.server';
import { StockAdjustmentModel, ADJUSTMENT_SORT_KEYS, type AdjustmentSortKey } from '@/models/stock-adjustment.model.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { upperTrim } from '@/lib/utils/common';
import { StockAdjustmentReason } from '@prisma/client';
import { canReadInventory } from '@/lib/roles';

const model = new StockAdjustmentModel();
const productModel = new SupplierProductModel();
const REASON_VALUES = new Set<string>(Object.values(StockAdjustmentReason));

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class StockAdjustmentController {
  async list(supplierProductId: string, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };
    const adjustments = await model.listForProduct(supplierProductId);
    return { data: { adjustments } };
  }

  /** One adjustment with its lines. Only admins see the stock on hand it was made against. */
  async get(id: string, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };
    const adjustment = await model.findById(id);
    if (!adjustment) return { error: { message: 'Adjustment not found', status: 404 } };
    if (isAdmin(session)) return { data: adjustment };
    return { data: { ...adjustment, lines: adjustment.lines.map((line) => ({ ...line, stockBefore: null })) } };
  }

  /** Every product's adjustments, newest first — the Adjustments tab. */
  async listAll(searchParams: URLSearchParams, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };

    const reasonRaw = searchParams.get('reason') ?? '';
    const reason = REASON_VALUES.has(reasonRaw) ? (reasonRaw as StockAdjustmentReason) : undefined;
    const sortRaw = searchParams.get('sort') ?? '';
    const sort = (ADJUSTMENT_SORT_KEYS as readonly string[]).includes(sortRaw) ? (sortRaw as AdjustmentSortKey) : undefined;
    const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20') || 20));

    const result = await model.listAll({
      search: searchParams.get('search')?.trim() || undefined,
      reason,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sort,
      dir,
      page,
      pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    return {
      data: {
        adjustments: result.adjustments,
        pagination: { page, pageSize, total: result.total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
      },
    };
  }

  /** Accepts either a single { variantId, delta, reason, note } body (unchanged) or a batch
   * { items: [...] } body for the multi-row "Adjust Stock" modal — applied in one transaction. */
  async create(supplierProductId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawItems = Array.isArray(value.items) ? value.items : [value];

    const errors: string[] = [];
    const parsed: { variantId: string; locationId: string | null; delta: number; reason: StockAdjustmentReason; note: string | null }[] = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const variantId = typeof item.variantId === 'string' ? item.variantId.trim() : '';
      const locationId = typeof item.locationId === 'string' && item.locationId.trim() ? item.locationId.trim() : null;
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
      parsed.push({ variantId, locationId, delta: Math.trunc(delta), reason: reasonRaw as StockAdjustmentReason, note: note || null });
    }
    if (parsed.length === 0) {
      return { error: { message: 'Validation failed', errors: errors.length ? errors : ['items: No valid adjustments to save'], status: 400 } };
    }

    const variants = await prisma.supplierProductVariant.findMany({
      where: { id: { in: parsed.map((p) => p.variantId) } },
      select: { id: true, supplierProductId: true, stockOnHand: true, locations: { select: { locationId: true, quantity: true, location: { select: { name: true } } } } },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    // A variant with locations is adjusted at one of them; one without adjusts its unassigned stock.
    // Several lines may hit the same spot, so the "below 0" check runs on the running total.
    const running = new Map<string, number>();
    for (const item of parsed) {
      const variant = variantById.get(item.variantId);
      if (!variant || variant.supplierProductId !== supplierProductId) return { error: { message: 'Variant not found', status: 404 } };
      let available = variant.stockOnHand;
      let where = '';
      if (variant.locations.length > 0) {
        const location = variant.locations.find((l) => l.locationId === item.locationId);
        if (!location) return { error: { message: 'Pick one of the variant’s locations', errors: [`locationId: Pick one of ${variant.id}'s locations`], status: 400 } };
        available = location.quantity;
        where = ` at ${location.location.name}`;
      } else {
        item.locationId = null;
      }
      const key = `${variant.id}:${item.locationId ?? ''}`;
      const after = (running.get(key) ?? available) + item.delta;
      if (after < 0) return { error: { message: 'Validation failed', errors: [`delta: This would take ${variant.id}${where} below 0`], status: 400 } };
      running.set(key, after);
    }

    const actor = { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
    await model.createBatch({ supplierProductId, lines: parsed, actor });

    const product = await productModel.findById(supplierProductId);
    return { data: product, message: parsed.length === 1 ? 'Stock adjusted' : `Adjustment saved — ${parsed.length} variants` };
  }
}
