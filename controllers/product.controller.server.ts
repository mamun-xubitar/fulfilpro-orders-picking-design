import prisma from '@/lib/prisma.server';
import { ProductModel } from '@/models/product.model.server';
import { enqueueProductSyncJob, getProductSyncStatus } from '@/lib/product-sync-jobs.server';
import { enqueueJob } from '@/lib/background-jobs.server';
import { deleteProductNow, type BulkProductAction, type BulkProductActionPayload } from '@/lib/product-bulk-actions.server';
import { ProductStatus } from '@prisma/client';

const model = new ProductModel();

const SEARCH_FIELD_VALUES = new Set(['title', 'vendor', 'supplier', 'category', 'type', 'tag']);
const STOCK_LEVEL_VALUES = new Set(['out_of_stock', 'not_tracked', 'in_stock']);
const STATUS_VALUES = new Set<string>(Object.values(ProductStatus));
const BULK_ACTIONS = new Set<BulkProductAction>([
  'delete',
  'archive',
  'set_draft',
  'include_channel',
  'exclude_channel',
  'add_tags',
  'remove_tags',
]);

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

  async enqueueBulk(body: unknown, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const actionRaw = typeof value.action === 'string' ? value.action : '';
    if (!BULK_ACTIONS.has(actionRaw as BulkProductAction)) {
      return { error: { message: 'Invalid bulk action', status: 400 } };
    }
    const action = actionRaw as BulkProductAction;

    const tags = Array.isArray(value.tags)
      ? (value.tags as unknown[]).filter((t): t is string => typeof t === 'string' && t.trim() !== '')
      : [];
    if ((action === 'add_tags' || action === 'remove_tags') && tags.length === 0) {
      return { error: { message: 'At least one tag is required', status: 400 } };
    }

    const channelName = typeof value.channelName === 'string' ? value.channelName.trim() : '';
    if ((action === 'include_channel' || action === 'exclude_channel') && !channelName) {
      return { error: { message: 'channelName is required', status: 400 } };
    }

    const productIds = await this.resolveBulkProductIds(value, allowedStoreIds);
    if (productIds.length === 0) {
      return { error: { message: 'No products matched the selection', status: 400 } };
    }

    const payload: BulkProductActionPayload = {
      action,
      productIds,
      ...(tags.length > 0 ? { tags } : {}),
      ...(channelName ? { channelName } : {}),
    };
    const job = await enqueueJob('bulk_product_action', payload as unknown as Record<string, unknown>);
    return { data: { job } };
  }

  async bulkStatus(jobId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const job = await prisma.backgroundJob.findFirst({ where: { id: jobId, type: 'bulk_product_action' } });
    if (!job) return { error: { message: 'Job not found', status: 404 } };
    return { data: { job } };
  }

  async remove(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    try {
      await deleteProductNow(id);
      return { message: 'Product deleted' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to delete product', status: 400 } };
    }
  }

  private async resolveBulkProductIds(value: Record<string, unknown>, allowedStoreIds?: string[] | null) {
    if (value.selectAllFilters !== true) {
      return Array.isArray(value.productIds)
        ? (value.productIds as unknown[]).filter((id): id is string => typeof id === 'string')
        : [];
    }

    const filters = (value.filters ?? {}) as Record<string, unknown>;
    let storeIds = Array.isArray(filters.storeIds)
      ? (filters.storeIds as unknown[]).filter((s): s is string => typeof s === 'string')
      : [];
    if (allowedStoreIds !== null && allowedStoreIds !== undefined) {
      if (allowedStoreIds.length === 0) return [];
      storeIds = storeIds.length > 0 ? storeIds.filter((id) => allowedStoreIds.includes(id)) : allowedStoreIds;
    }

    const status = Array.isArray(filters.status)
      ? (filters.status as unknown[]).filter((s): s is ProductStatus => typeof s === 'string' && STATUS_VALUES.has(s))
      : [];
    const stockLevelRaw = typeof filters.stockLevel === 'string' ? filters.stockLevel : '';
    const stockLevel = STOCK_LEVEL_VALUES.has(stockLevelRaw) ? stockLevelRaw : '';
    const stockCompare = filters.stockCompare === 'below' || filters.stockCompare === 'above' ? filters.stockCompare : '';
    const stockQty = typeof filters.stockQty === 'number' && Number.isFinite(filters.stockQty) ? filters.stockQty : null;
    const search = typeof filters.search === 'string' ? filters.search.trim() : '';
    const searchFieldRaw = typeof filters.searchField === 'string' ? filters.searchField.trim() : '';
    const searchField = SEARCH_FIELD_VALUES.has(searchFieldRaw) ? searchFieldRaw : '';

    return model.listIds({ search, searchField, storeIds, status, stockLevel, stockCompare, stockQty });
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
