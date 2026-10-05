import { StocktakeModel, STOCKTAKE_SORT_KEYS, type StocktakeRow, type StocktakeSortKey } from '@/models/stocktake.model.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { StocktakeStatus } from '@prisma/client';
import { formatStocktakeNumber } from '@/lib/inventory/stocktake-number';
import { isStaffLikeRole } from '@/lib/roles';

const model = new StocktakeModel();
const productModel = new SupplierProductModel();
const STATUS_VALUES = new Set<string>(Object.values(StocktakeStatus));
const MAX_LINES = 2000;

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

/** Admins, plus staff (test users included, read-only) — every other role stays out. */
function canAccess(session: Session) {
  return isAdmin(session) || isStaffLikeRole(session?.user?.role);
}

/** Admins and real staff can create and count; test users only look. */
function canCount(session: Session) {
  return isAdmin(session) || session?.user?.role === 'staff';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? '', name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

/** Staff see OPEN stocktakes (anyone may finish counting them) plus the ones they created or counted. */
function canView(stocktake: StocktakeRow, session: Session) {
  if (isAdmin(session)) return true;
  const userId = session?.user?.id ?? '';
  return stocktake.status === 'OPEN' || stocktake.startedById === userId || stocktake.countedById === userId;
}

/** Only admins see what the system holds — dropped here, not just hidden in the UI. */
function shape(stocktake: StocktakeRow, session: Session) {
  if (isAdmin(session)) return stocktake;
  const hidden = new Set(['expectedQty', 'systemQty']);
  return { ...stocktake, items: stocktake.items.map((item) => Object.fromEntries(Object.entries(item).filter(([key]) => !hidden.has(key)))) };
}

function parseCount(raw: unknown): number | null | undefined {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.trunc(n);
}

export class StocktakeController {
  async create(supplierProductId: string, body: unknown, session: Session) {
    if (!canCount(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await productModel.exists(supplierProductId))) return { error: { message: 'Product not found', status: 404 } };

    const rawLines = Array.isArray((body as Record<string, unknown> | null)?.lines) ? ((body as Record<string, unknown>).lines as unknown[]) : [];
    if (rawLines.length === 0) return { error: { message: 'lines: Select at least one variant to count', status: 400 } };
    if (rawLines.length > MAX_LINES) return { error: { message: `lines: At most ${MAX_LINES} lines per stocktake`, status: 400 } };

    const seen = new Set<string>();
    const lines: Array<{ variantId: string; locationId: string | null; countedQty: number | null }> = [];
    for (const raw of rawLines) {
      if (!raw || typeof raw !== 'object') continue;
      const v = raw as Record<string, unknown>;
      const variantId = typeof v.variantId === 'string' ? v.variantId : '';
      const locationId = typeof v.locationId === 'string' && v.locationId ? v.locationId : null;
      const countedQty = parseCount(v.countedQty);
      if (!variantId) continue;
      if (countedQty === undefined) return { error: { message: 'lines: Counted quantities must be 0 or more', status: 400 } };
      const key = `${variantId}:${locationId ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ variantId, locationId, countedQty });
    }

    const stocktake = await model.create(supplierProductId, lines, actorFromSession(session));
    if (stocktake.itemCount === 0) return { error: { message: 'lines: None of the selected variants belong to this product', status: 400 } };
    return { data: shape(stocktake, session), message: `Stocktake ${formatStocktakeNumber(stocktake.number)} created` };
  }

  async list(searchParams: URLSearchParams, session: Session) {
    if (!canAccess(session)) return { error: { message: 'Forbidden', status: 403 } };

    const statusRaw = searchParams.get('status') ?? '';
    const status = STATUS_VALUES.has(statusRaw) ? (statusRaw as StocktakeStatus) : undefined;
    const search = searchParams.get('search')?.trim() || undefined;
    const dateFrom = searchParams.get('dateFrom') ?? undefined;
    const dateTo = searchParams.get('dateTo') ?? undefined;
    const sortRaw = searchParams.get('sort') ?? '';
    const sort = (STOCKTAKE_SORT_KEYS as readonly string[]).includes(sortRaw) ? (sortRaw as StocktakeSortKey) : undefined;
    const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));

    const result = await model.list({
      search,
      status,
      dateFrom,
      dateTo,
      sort,
      dir,
      page,
      pageSize,
      visibleToUserId: isAdmin(session) ? undefined : (session?.user?.id ?? ''),
    });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    return {
      data: {
        stocktakes: result.stocktakes.map((s) => shape(s, session)),
        pagination: { page, pageSize, total: result.total, totalPages, hasPrev: page > 1, hasNext: page < totalPages },
      },
    };
  }

  async get(id: string, session: Session) {
    if (!canAccess(session)) return { error: { message: 'Forbidden', status: 403 } };
    const stocktake = await model.findById(id);
    if (!stocktake || !canView(stocktake, session)) return { error: { message: 'Stocktake not found', status: 404 } };
    return { data: shape(stocktake, session) };
  }

  async saveCounts(id: string, body: unknown, session: Session) {
    if (!canCount(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await model.findById(id);
    if (!existing || !canView(existing, session)) return { error: { message: 'Stocktake not found', status: 404 } };
    if (existing.status !== 'OPEN' && existing.status !== 'COUNTED') return { error: { message: 'This stocktake is closed', status: 400 } };

    const rawItems = Array.isArray((body as Record<string, unknown> | null)?.items) ? ((body as Record<string, unknown>).items as unknown[]) : [];
    const counts: Array<{ itemId: string; countedQty: number | null }> = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') continue;
      const v = raw as Record<string, unknown>;
      const itemId = typeof v.itemId === 'string' ? v.itemId : '';
      const countedQty = parseCount(v.countedQty);
      if (!itemId) continue;
      if (countedQty === undefined) return { error: { message: 'items: Counted quantities must be 0 or more', status: 400 } };
      counts.push({ itemId, countedQty });
    }
    if (counts.length === 0) return { error: { message: 'items: Nothing to save', status: 400 } };

    const stocktake = await model.saveCounts(id, counts, actorFromSession(session));
    return { data: shape(stocktake, session), message: stocktake.status === 'COUNTED' ? 'Counts saved — ready to sync' : 'Counts saved' };
  }

  async sync(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Stocktake not found', status: 404 } };
    if (existing.status !== 'COUNTED') {
      return { error: { message: existing.status === 'OPEN' ? 'Every line must be counted before syncing' : 'This stocktake is closed', status: 400 } };
    }

    const { stocktake, result } = await model.sync(id, actorFromSession(session));
    const product = await productModel.findById(stocktake.supplierProductId);
    const skippedNote = result.skipped > 0 ? `, ${result.skipped} skipped` : '';
    return { data: { stocktake, result, product }, message: `Synced — ${result.adjusted} adjusted${skippedNote}` };
  }

  async cancel(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await model.findById(id);
    if (!existing) return { error: { message: 'Stocktake not found', status: 404 } };
    if (existing.status !== 'OPEN' && existing.status !== 'COUNTED') return { error: { message: 'This stocktake is already closed', status: 400 } };

    const stocktake = await model.cancel(id);
    return { data: stocktake, message: 'Stocktake cancelled' };
  }
}
