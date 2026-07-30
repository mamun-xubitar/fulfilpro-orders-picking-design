import prisma from '@/lib/prisma.server';
import { ProductModel } from '@/models/product.model.server';
import { SupplierModel } from '@/models/supplier.model.server';
import { SettingsModel } from '@/models/settings.model.server';
import { enqueueProductSyncJob, getProductSyncStatus } from '@/lib/product-sync-jobs.server';
import { enqueueJob } from '@/lib/background-jobs.server';
import { deleteProductNow, type BulkProductAction, type BulkProductActionPayload } from '@/lib/product-bulk-actions.server';
import { fetchProductDetail } from '@/lib/product-detail-fetch.server';
import {
  updateProductFields,
  updateVariants as applyVariantUpdates,
  deleteVariants as removeVariants,
  adjustInventory as applyInventoryAdjustment,
  searchTaxonomyCategories,
  type ProductFieldsUpdate,
  type VariantFieldsUpdate,
} from '@/lib/product-detail-actions.server';
import { getLegacyId } from '@/lib/shopify-graphql.server';
import { ProductStatus } from '@prisma/client';

const model = new ProductModel();
const supplierModel = new SupplierModel();
const settingsModel = new SettingsModel();

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
    const [data, suppliers] = await Promise.all([model.formData(allowedStoreIds), supplierModel.listOptions()]);
    return { data: { ...data, suppliers } };
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

  async detail(id: string, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, storeId: true, shopifyId: true, store: { select: { id: true, storeDomain: true, accessToken: true } } },
    });
    if (!existing) return { error: { message: 'Product not found', status: 404 } };
    if (allowedStoreIds !== null && allowedStoreIds !== undefined && !allowedStoreIds.includes(existing.storeId)) {
      return { error: { message: 'Forbidden', status: 403 } };
    }

    let locations: Array<{ id: string; name: string }> = [];
    let collections: Array<{ id: string; title: string; handle: string | null }> = [];
    const levelsByVariantShopifyId = new Map<
      string,
      Array<{ locationId: string; locationName: string; available: number; onHand: number }>
    >();
    let stale = false;

    if (existing.store.accessToken) {
      try {
        const live = await fetchProductDetail(
          { id: existing.store.id, storeDomain: existing.store.storeDomain, accessToken: existing.store.accessToken },
          existing.shopifyId
        );
        if (live) {
          locations = live.locations;
          collections = live.collections;
          for (const variant of live.product.variants.nodes) {
            const shopifyVariantId = getLegacyId(variant.id);
            const levels = (variant.inventoryItem?.inventoryLevels.nodes ?? []).map((level) => ({
              locationId: getLegacyId(level.location.id),
              locationName: level.location.name,
              available: level.quantities.find((q) => q.name === 'available')?.quantity ?? 0,
              onHand: level.quantities.find((q) => q.name === 'on_hand')?.quantity ?? 0,
            }));
            levelsByVariantShopifyId.set(shopifyVariantId, levels);
          }
        } else {
          stale = true;
        }
      } catch (error) {
        console.error('Failed to fetch live product detail', { productId: id, error });
        stale = true;
      }
    } else {
      stale = true;
    }

    const product = await model.findDetail(id);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const variants = product.variants.map((variant) => ({
      ...variant,
      locationQuantities: levelsByVariantShopifyId.get(variant.shopifyId) ?? [],
    }));

    const siblings = product.handle ? await model.findSiblingsByHandle(product.handle, id) : [];

    const [attached, viaCollection, settings] = await Promise.all([
      supplierModel.findForProduct(id),
      supplierModel.findByCollections(existing.storeId, collections.map((c) => c.id)),
      settingsModel.get(),
    ]);

    return {
      data: {
        product: { ...product, variants, collections, suppliers: { attached, viaCollection } },
        locations,
        siblings,
        stale,
        lowStockThreshold: settings.lowStockThreshold,
      },
    };
  }

  async updateProduct(id: string, body: unknown, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const denied = await this.assertProductAccess(id, allowedStoreIds);
    if (denied) return denied;

    const value = (body ?? {}) as Record<string, unknown>;
    const fields: ProductFieldsUpdate = {};
    if (typeof value.title === 'string') fields.title = value.title.trim();
    if (typeof value.vendor === 'string') fields.vendor = value.vendor.trim();
    if (typeof value.descriptionHtml === 'string') fields.descriptionHtml = value.descriptionHtml;
    if (Array.isArray(value.tags)) fields.tags = (value.tags as unknown[]).filter((t): t is string => typeof t === 'string');
    if (typeof value.productType === 'string') fields.productType = value.productType.trim();
    if (typeof value.status === 'string' && STATUS_VALUES.has(value.status)) fields.status = value.status as ProductStatus;
    if (value.category === null) {
      fields.category = null;
    } else if (value.category && typeof value.category === 'object') {
      const cat = value.category as Record<string, unknown>;
      if (typeof cat.id === 'string' && typeof cat.name === 'string') fields.category = { id: cat.id, name: cat.name };
    }

    if (Object.keys(fields).length === 0) return { error: { message: 'No fields to update', status: 400 } };

    try {
      await updateProductFields(id, fields);
      return { message: 'Product updated' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to update product', status: 400 } };
    }
  }

  async updateVariants(id: string, body: unknown, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const denied = await this.assertProductAccess(id, allowedStoreIds);
    if (denied) return denied;

    const value = (body ?? {}) as Record<string, unknown>;
    const rawVariants = Array.isArray(value.variants) ? value.variants : [];
    const variants: VariantFieldsUpdate[] = [];
    for (const raw of rawVariants) {
      if (!raw || typeof raw !== 'object') continue;
      const v = raw as Record<string, unknown>;
      if (typeof v.id !== 'string') continue;
      const entry: VariantFieldsUpdate = { id: v.id };
      if (typeof v.price === 'number' && Number.isFinite(v.price)) entry.price = v.price;
      if (v.inventoryPolicy === 'DENY' || v.inventoryPolicy === 'CONTINUE') entry.inventoryPolicy = v.inventoryPolicy;
      if (typeof v.cost === 'number' && Number.isFinite(v.cost)) entry.cost = v.cost;
      else if (v.cost === null) entry.cost = null;
      variants.push(entry);
    }
    if (variants.length === 0) return { error: { message: 'No variants to update', status: 400 } };

    try {
      await applyVariantUpdates(id, variants);
      return { message: 'Variants updated' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to update variants', status: 400 } };
    }
  }

  async deleteVariants(id: string, body: unknown, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const denied = await this.assertProductAccess(id, allowedStoreIds);
    if (denied) return denied;

    const value = (body ?? {}) as Record<string, unknown>;
    const variantIds = Array.isArray(value.variantIds)
      ? (value.variantIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    if (variantIds.length === 0) return { error: { message: 'variantIds is required', status: 400 } };

    try {
      await removeVariants(id, variantIds);
      return { message: 'Variants deleted' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to delete variants', status: 400 } };
    }
  }

  async adjustInventory(id: string, body: unknown, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const denied = await this.assertProductAccess(id, allowedStoreIds);
    if (denied) return denied;

    const value = (body ?? {}) as Record<string, unknown>;
    const locationIds = Array.isArray(value.locationIds)
      ? (value.locationIds as unknown[]).filter((v): v is string => typeof v === 'string')
      : [];
    const rawChanges = Array.isArray(value.changes) ? value.changes : [];
    const changes: Array<{ variantId: string; delta: number }> = [];
    for (const raw of rawChanges) {
      if (!raw || typeof raw !== 'object') continue;
      const c = raw as Record<string, unknown>;
      if (typeof c.variantId === 'string' && typeof c.delta === 'number' && Number.isFinite(c.delta) && c.delta !== 0) {
        changes.push({ variantId: c.variantId, delta: Math.trunc(c.delta) });
      }
    }
    if (locationIds.length === 0 || changes.length === 0) {
      return { error: { message: 'locationIds and changes are required', status: 400 } };
    }

    try {
      await applyInventoryAdjustment(id, { locationIds, changes });
      return { message: 'Inventory adjusted' };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to adjust inventory', status: 400 } };
    }
  }

  async searchCategories(searchParams: URLSearchParams, session: Session, allowedStoreIds?: string[] | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const storeId = searchParams.get('storeId')?.trim() ?? '';
    if (!storeId) return { error: { message: 'storeId is required', status: 400 } };
    if (allowedStoreIds !== null && allowedStoreIds !== undefined && !allowedStoreIds.includes(storeId)) {
      return { error: { message: 'Forbidden', status: 403 } };
    }

    try {
      const categories = await searchTaxonomyCategories(storeId, searchParams.get('q')?.trim() ?? '');
      return { data: { categories } };
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to search categories', status: 400 } };
    }
  }

  private async assertProductAccess(id: string, allowedStoreIds?: string[] | null) {
    if (allowedStoreIds === null || allowedStoreIds === undefined) return null;
    const product = await prisma.product.findUnique({ where: { id }, select: { storeId: true } });
    if (!product) return { error: { message: 'Product not found', status: 404 } };
    if (!allowedStoreIds.includes(product.storeId)) return { error: { message: 'Forbidden', status: 403 } };
    return null;
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
