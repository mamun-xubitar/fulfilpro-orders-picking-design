import { StocktakeModel } from '@/models/stocktake.model.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';

const model = new StocktakeModel();
const productModel = new SupplierProductModel();

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

export class StocktakeController {
  async start(supplierProductId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await productModel.exists(supplierProductId))) return { error: { message: 'Product not found', status: 404 } };

    const stocktake = await model.start(supplierProductId, actorFromSession(session));
    return { data: stocktake, message: 'Stocktake started' };
  }

  async complete(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Stocktake not found', status: 404 } };
    if (existing.status !== 'OPEN') return { error: { message: 'This stocktake is already closed', status: 400 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawItems = Array.isArray(value.items) ? value.items : [];
    const counts: Array<{ itemId: string; countedQty: number }> = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const v = raw as Record<string, unknown>;
      const itemId = typeof v.itemId === 'string' ? v.itemId : '';
      const countedQty = Number(v.countedQty);
      if (!itemId || !Number.isFinite(countedQty) || countedQty < 0) continue;
      counts.push({ itemId, countedQty: Math.trunc(countedQty) });
    }
    if (counts.length === 0) return { error: { message: 'items: Enter at least one counted quantity', status: 400 } };

    const stocktake = await model.complete(id, counts, actorFromSession(session));
    const product = await productModel.findById(stocktake.supplierProductId);
    return { data: { stocktake, product }, message: 'Stocktake completed' };
  }
}
