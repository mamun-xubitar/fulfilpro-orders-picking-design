import { ProductModel } from '@/models/product.model.server';
import { enqueueProductSyncJob, getProductSyncStatus } from '@/lib/product-sync-jobs.server';
import { ProductStatus } from '@prisma/client';

const model = new ProductModel();

const SEARCH_FIELD_VALUES = new Set(['title', 'vendor', 'supplier', 'category', 'type', 'tag']);
const STOCK_LEVEL_VALUES = new Set(['out_of_stock', 'not_tracked', 'in_stock']);
const STATUS_VALUES = new Set<string>(Object.values(ProductStatus));

type Session = { user?: { id?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class ProductController {
  async list(searchParams: URLSearchParams, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const search = searchParams.get('search')?.trim() ?? '';
    const searchFieldRaw = searchParams.get('searchField')?.trim() ?? '';
    const searchField = SEARCH_FIELD_VALUES.has(searchFieldRaw) ? searchFieldRaw : '';
    let storeIds = searchParams.getAll('storeId').map((s) => s.trim()).filter(Boolean);
    const status = searchParams
      .getAll('status')
      .map((s) => s.trim().toUpperCase())
      .filter((s): s is ProductStatus => STATUS_VALUES.has(s));
    const stockLevelRaw = searchParams.get('stockLevel')?.trim() ?? '';
    const stockLevel = STOCK_LEVEL_VALUES.has(stockLevelRaw) ? stockLevelRaw : '';
    const stockCompareRaw = searchParams.get('stockCompare');
    const stockCompare = stockCompareRaw === 'below' || stockCompareRaw === 'above' ? stockCompareRaw : '';
    const stockQtyRaw = searchParams.get('stockQty');
    const stockQty = stockQtyRaw != null && Number.isFinite(Number(stockQtyRaw)) ? Number(stockQtyRaw) : null;
    const sort = searchParams.get('sort')?.trim() || 'title';
    const dir = searchParams.get('dir') === 'desc' ? 'desc' : 'asc';
    const page = normalizePositiveInt(searchParams.get('page'), 1);
    const pageSize = clamp(normalizePositiveInt(searchParams.get('pageSize'), 20), 5, 100);

    const filters = { search, searchField, storeIds, status, stockLevel, stockCompare, stockQty, sort, dir };

    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      if (allowedStoreIds.length === 0) {
        return {
          data: {
            products: [],
            filters,
            stores: [],
            pagination: { page, pageSize, total: 0, totalPages: 1, hasPrev: false, hasNext: false },
          },
        };
      }
      storeIds = storeIds.length > 0 ? storeIds.filter((id) => allowedStoreIds.includes(id)) : allowedStoreIds;
    }

    const [result, stores] = await Promise.all([
      model.list({ search, searchField, storeIds, status, stockLevel, stockCompare, stockQty, sort, dir, page, pageSize }),
      model.getStoreOptions(allowedStoreIds),
    ]);

    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

    return {
      data: {
        products: result.products,
        filters: { ...filters, storeIds },
        stores,
        pagination: {
          page,
          pageSize,
          total: result.total,
          totalPages,
          hasPrev: page > 1,
          hasNext: page < totalPages,
        },
      },
    };
  }

  async formData(session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const data = await model.formData(allowedStoreIds);
    return { data };
  }

  async triggerSync(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const value = body as Record<string, unknown> | null;
    const storeIds = Array.isArray(value?.storeIds)
      ? (value.storeIds as unknown[]).filter((id): id is string => typeof id === 'string')
      : undefined;
    const result = await enqueueProductSyncJob(storeIds);
    return { data: result };
  }

  async syncStatus(session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const result = await getProductSyncStatus();
    return { data: result };
  }
}

function normalizePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
