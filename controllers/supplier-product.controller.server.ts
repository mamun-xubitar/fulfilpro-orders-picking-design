import prisma from '@/lib/prisma.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { SupplierModel } from '@/models/supplier.model.server';
import { LocationModel } from '@/models/location.model.server';
import { InventoryCategoryModel } from '@/models/inventory-category.model.server';
import { CurrencyRateModel } from '@/models/currency-rate.model.server';
import { StockError } from '@/lib/inventory-stock.server';
import { saveUploadedFile } from '@/lib/uploads.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { isValidHandle, slugifyHandle } from '@/lib/inventory/handle';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { SupplierProductStatus } from '@prisma/client';
import { upperTrim } from '@/lib/utils/common';
import type { CatalogueListParams, ProductsSortKey, QuickFilterId } from '@/models/supplier-product.model.server';
import { canReadInventory } from '@/lib/roles';

const model = new SupplierProductModel();
const locationModel = new LocationModel();
const currencyModel = new CurrencyRateModel();
const supplierModel = new SupplierModel();
const categoryModel = new InventoryCategoryModel();

const STATUS_VALUES = new Set<string>(Object.values(SupplierProductStatus));
const MAX_IMAGES = 250;
const QUICK_FILTER_IDS = new Set<string>(['buying-lt-1', 'profit-lt-5', 'selling-lt-1', 'selling-lt-5']);
const SORT_KEYS = new Set<string>(['name', 'brand', 'category', 'sku', 'status', 'variants', 'stock', 'stockValue', 'createdAt']);
const CATALOGUE_MODES = new Set(['detail', 'table', 'search', 'ids']);

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;
type CataloguePagination = { page: number; pageSize: number; total: number; totalPages: number; hasPrev: boolean; hasNext: boolean };

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? null, name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

function paginationOf(page: number, pageSize: number, total: number): CataloguePagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  return { page: clampedPage, pageSize, total, totalPages, hasPrev: clampedPage > 1, hasNext: clampedPage < totalPages };
}

/** `{ [fromLocationId]: toLocationId }` — where a removed location's stock moves. Whether each
 * destination survives the write is checked by setLocationStock. */
function parseRemap(raw: unknown): Record<string, string> {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

export class SupplierProductController {
  private async loadGlobals() {
    const [settings, currencies] = await Promise.all([
      prisma.appSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' }, select: { globalMarginPercent: true, globalExchangeRate: true } }),
      currencyModel.list(),
    ]);
    // USD is always offered in the currency picker even if no CurrencyRate row has been configured
    // for it yet — the pricing panel defaults new products to USD, so the option must always exist.
    const configuredUsd = currencies.find((c) => c.code === 'USD');
    const usdRate = configuredUsd?.rate ?? Number(settings.globalExchangeRate);
    const extraCurrencies = currencies.filter((c) => c.code !== 'USD').map((c) => ({ code: c.code, rate: c.rate }));
    return {
      exchangeRate: Number(settings.globalExchangeRate),
      marginPercent: Number(settings.globalMarginPercent),
      baseCurrency: 'AUD',
      currencies: [{ code: 'AUD', rate: 1 }, { code: 'USD', rate: usdRate }, ...extraCurrencies],
    };
  }

  async list(searchParams: URLSearchParams, session: Session) {
    if (!canReadInventory(session?.user?.role)) return { error: { message: 'Forbidden', status: 403 } };

    const modeParam = searchParams.get('mode') ?? 'detail';
    const mode = CATALOGUE_MODES.has(modeParam) ? (modeParam as 'detail' | 'table' | 'search' | 'ids') : 'detail';

    const verifiedParam = searchParams.get('verified');
    const verified = verifiedParam === '1' ? true : verifiedParam === '0' ? false : undefined;
    const quickFilterParam = searchParams.get('quickFilter');
    const quickFilter = quickFilterParam && QUICK_FILTER_IDS.has(quickFilterParam) ? (quickFilterParam as QuickFilterId) : null;
    const statusParam = searchParams.get('status');
    const status = statusParam && STATUS_VALUES.has(statusParam) ? (statusParam as SupplierProductStatus) : undefined;
    const supplierId = searchParams.get('supplier')?.trim() || undefined;
    const inventoryCategoryId = searchParams.get('category')?.trim() || undefined;
    const sortParam = searchParams.get('sort');
    const sort = sortParam && SORT_KEYS.has(sortParam) ? (sortParam as ProductsSortKey) : 'createdAt';
    const dir = searchParams.get('dir') === 'desc' ? 'desc' : searchParams.get('dir') === 'asc' ? 'asc' : sort === 'createdAt' ? 'desc' : 'asc';
    const includeOmitted = searchParams.get('includeOmitted') === '1';

    if (mode === 'ids') {
      const ids = await model.listIds({ search: searchParams.get('search')?.trim() || undefined, verified, status, supplierId, inventoryCategoryId, quickFilter, sort, dir, includeOmitted });
      return { data: { ids } };
    }

    const globals = await this.loadGlobals();

    if (mode === 'search') {
      const term = searchParams.get('search')?.trim() ?? '';
      if (!term) return { data: { products: [], pagination: paginationOf(1, 8, 0), totalAll: 0, globals, supplierOptions: [] } };
      const { products, total } = await model.list({ page: 1, pageSize: 8, search: term, sort: 'name', dir: 'asc' });
      return { data: { products, pagination: paginationOf(1, 8, total), totalAll: total, globals, supplierOptions: [] } };
    }

    if (mode === 'table') {
      const page = Math.max(1, Number(searchParams.get('page')) || 1);
      const pageSize = [10, 20, 30, 40, 50, 100].includes(Number(searchParams.get('pageSize'))) ? Number(searchParams.get('pageSize')) : 20;
      const search = searchParams.get('search')?.trim() || undefined;
      const params: CatalogueListParams = { page, pageSize, search, verified, status, supplierId, inventoryCategoryId, quickFilter, sort, dir, includeOmitted };
      // Every supplier/category in the system, not just ones with linked products — one with
      // zero products should still be pickable in the filter dropdown.
      const [{ products, total, totals }, supplierOptionRows, categoryOptionRows, totalAll, stepperTotal] = await Promise.all([
        model.list(params),
        supplierModel.listOptions(),
        categoryModel.list(),
        model.countAll(),
        model.countForStepper(verified),
      ]);
      const supplierOptions = supplierOptionRows.map((s) => ({ id: s.id, name: s.name }));
      return { data: { products, pagination: paginationOf(page, pageSize, total), totalAll, stepperTotal, totals, globals, supplierOptions, categoryOptions: categoryOptionRows } };
    }

    // detail mode — the quick filter deliberately never reaches here: it only narrows the
    // focused product's own variants matrix client-side (see useVariantsMatrix), so it must
    // never move the record stepper's position or "of Y" counts.
    const focusId = searchParams.get('focusId');
    let page = Math.max(1, Number(searchParams.get('page')) || 1);
    if (focusId) {
      const found = await model.findPosition(focusId, { verified });
      if (found) page = found.position;
    }
    const [{ products, total }, totalAll] = await Promise.all([
      model.list({ page, pageSize: 1, verified, sort: 'createdAt', dir: 'desc' }),
      model.countAll(),
    ]);
    const focused = products[0] ?? null;

    return {
      data: {
        products: focused ? [focused] : [],
        pagination: paginationOf(page, 1, total),
        totalAll,
        globals,
        supplierOptions: [] as { id: string; name: string }[],
      },
    };
  }

  /** Instant inline availability check for the itemNo field — New Product wizard's Basics step
   * and Product details both debounce a call here so a collision is flagged before submit rather
   * than only surfacing as the create/save 409. */
  async checkItemNo(searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const itemNo = searchParams.get('itemNo')?.trim() ?? '';
    const excludeId = searchParams.get('excludeId')?.trim() || undefined;
    if (!itemNo) return { data: { available: true } };

    const taken = await model.existsByItemNo(itemNo, excludeId);
    return { data: { available: !taken } };
  }

  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawSupplierIds = Array.isArray(value.supplierIds)
      ? (value.supplierIds as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : typeof value.supplierId === 'string' && value.supplierId.trim()
        ? [value.supplierId.trim()]
        : [];
    const supplierIds = [...new Set(rawSupplierIds)];
    const itemNo = typeof value.itemNo === 'string' ? upperTrim(value.itemNo) : '';
    const name = typeof value.name === 'string' ? upperTrim(value.name) : '';
    const brand = typeof value.brand === 'string' ? upperTrim(value.brand) : '';
    const handleInput = typeof value.handle === 'string' ? value.handle.trim() : '';
    const handle = handleInput || slugifyHandle(name) || slugifyHandle(itemNo);

    const errors: string[] = [];
    if (supplierIds.length === 0) errors.push('supplierId: At least one supplier is required');
    if (!itemNo) errors.push('itemNo: Item number is required');
    if (!name) errors.push('name: Product name is required');
    if (!handle || !isValidHandle(handle)) errors.push('handle: Enter a valid handle (lowercase letters, numbers and dashes)');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const suppliers = await prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true } });
    if (suppliers.length !== supplierIds.length) return { error: { message: 'One or more suppliers were not found', status: 404 } };

    const existing = await prisma.supplierProduct.findUnique({ where: { itemNo } });
    if (existing) return { error: { message: 'Validation failed', errors: ['itemNo: A product with this item number already exists'], status: 409 } };

    const handleTaken = await prisma.supplierProduct.findUnique({ where: { handle }, select: { id: true } });
    if (handleTaken) return { error: { message: 'Validation failed', errors: ['handle: A product with this handle already exists'], status: 409 } };

    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
      select: { globalMarginPercent: true, globalExchangeRate: true, lowStockThreshold: true },
    });
    const id = await model.create({
      supplierIds,
      itemNo,
      handle,
      name,
      brand: brand || null,
      marginPercent: Number(settings.globalMarginPercent),
      exchangeRate: Number(settings.globalExchangeRate),
      lowStockThreshold: settings.lowStockThreshold ?? 10,
      actor: actorFromSession(session),
    });
    const product = await model.findById(id);
    return { data: product, message: 'Product created' };
  }

  async updateDetails(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const current = await prisma.supplierProduct.findUnique({ where: { id }, select: { itemNo: true } });
    if (!current) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const errors: string[] = [];
    if (typeof value.status === 'string' && !STATUS_VALUES.has(value.status)) errors.push('status: Invalid status');

    let handle: string | undefined;
    if (typeof value.handle === 'string') {
      handle = value.handle.trim();
      if (!handle || !isValidHandle(handle)) {
        errors.push('handle: Enter a valid handle (lowercase letters, numbers and dashes)');
      } else {
        const handleTaken = await prisma.supplierProduct.findUnique({ where: { handle }, select: { id: true } });
        if (handleTaken && handleTaken.id !== id) errors.push('handle: A product with this handle already exists');
      }
    }

    let supplierIds: string[] | undefined;
    if (Array.isArray(value.supplierIds)) {
      supplierIds = [...new Set((value.supplierIds as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0))];
      if (supplierIds.length === 0) {
        errors.push('supplierId: At least one supplier is required');
      } else {
        const found = await prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true } });
        if (found.length !== supplierIds.length) errors.push('supplierId: One or more suppliers were not found');
      }
    }

    // Hub-only flat Category — distinct from the Shopify taxonomy category above. An empty
    // string clears it, same convention as categoryId.
    if (typeof value.inventoryCategoryId === 'string' && value.inventoryCategoryId.trim()) {
      const found = await prisma.inventoryCategory.findUnique({ where: { id: value.inventoryCategoryId.trim() }, select: { id: true } });
      if (!found) errors.push('inventoryCategoryId: Category not found');
    }
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    // itemNo is globally unique — re-check whenever it's about to change, mirroring create.
    const effectiveItemNo = typeof value.itemNo === 'string' ? upperTrim(value.itemNo) : current.itemNo;
    if (effectiveItemNo !== current.itemNo) {
      const conflict = await prisma.supplierProduct.findUnique({ where: { itemNo: effectiveItemNo }, select: { id: true } });
      if (conflict && conflict.id !== id) {
        return { error: { message: 'Validation failed', errors: ['itemNo: A product with this item number already exists'], status: 409 } };
      }
    }

    let poQuantity: number | undefined;
    if (value.poQuantity !== undefined) {
      const parsed = Number(value.poQuantity);
      if (!Number.isFinite(parsed) || parsed < 1) {
        return { error: { message: 'Validation failed', errors: ['poQuantity: Enter a quantity of at least 1'], status: 400 } };
      }
      poQuantity = Math.trunc(parsed);
    }

    await model.updateDetails(id, {
      ...(typeof value.itemNo === 'string' ? { itemNo: upperTrim(value.itemNo) } : {}),
      ...(handle !== undefined ? { handle } : {}),
      ...(supplierIds !== undefined ? { supplierIds } : {}),
      ...(typeof value.brand === 'string' ? { brand: upperTrim(value.brand) } : {}),
      ...(typeof value.name === 'string' ? { name: upperTrim(value.name) } : {}),
      ...(typeof value.category === 'string' ? { category: value.category.trim() } : {}),
      ...('categoryId' in value ? { categoryId: typeof value.categoryId === 'string' ? value.categoryId : null } : {}),
      ...('inventoryCategoryId' in value
        ? { inventoryCategoryId: typeof value.inventoryCategoryId === 'string' && value.inventoryCategoryId.trim() ? value.inventoryCategoryId.trim() : null }
        : {}),
      ...(typeof value.sku === 'string' ? { sku: upperTrim(value.sku) } : {}),
      ...(typeof value.description === 'string' ? { description: sanitizeHtml(value.description) } : {}),
      ...(typeof value.productRemark === 'string' ? { productRemark: upperTrim(value.productRemark) } : {}),
      ...(poQuantity !== undefined ? { poQuantity } : {}),
      ...(typeof value.omitted === 'boolean' ? { omitted: value.omitted } : {}),
      ...(typeof value.status === 'string' ? { status: value.status as SupplierProductStatus } : {}),
      ...(typeof value.verified === 'boolean' ? { verified: value.verified } : {}),
      ...(Array.isArray(value.sizes) ? { sizes: (value.sizes as unknown[]).filter((s): s is string => typeof s === 'string').map((s) => upperTrim(s)) } : {}),
      ...(Array.isArray(value.colours)
        ? {
            colours: (value.colours as unknown[])
              .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
              .map((c) => {
                const name = upperTrim(String(c.name ?? ''));
                return { name, color: typeof c.color === 'string' && c.color ? c.color : deriveColorFromName(name) };
              }),
          }
        : {}),
    });

    await model.logActivity(id, 'Product details updated', 'details_updated', actorFromSession(session));
    const product = await model.findById(id);
    return { data: product, message: 'Product updated' };
  }

  async updatePricing(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const currencyCode = typeof value.currencyCode === 'string' ? value.currencyCode.trim().toUpperCase() : '';
    const exchangeRate = Number(value.exchangeRate);
    const buyingPrice = Number(value.buyingPrice);
    const freight = Number(value.freight);
    const misc = Number(value.misc);
    const marginPercent = Number(value.marginPercent);
    const tax = Number(value.tax);

    const errors: string[] = [];
    if (!/^[A-Z]{3}$/.test(currencyCode)) errors.push('currencyCode: Enter a 3-letter ISO currency code');
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) errors.push('exchangeRate: Enter a rate greater than 0');
    if (!Number.isFinite(buyingPrice) || buyingPrice < 0) errors.push('buyingPrice: Enter a value of 0 or more');
    if (!Number.isFinite(freight) || freight < 0) errors.push('freight: Enter a value of 0 or more');
    if (!Number.isFinite(misc) || misc < 0) errors.push('misc: Enter a value of 0 or more');
    if (!Number.isFinite(marginPercent) || marginPercent < 0) errors.push('marginPercent: Enter a margin of 0 or more');
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) errors.push('tax: Enter a percent between 0 and 100');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    await model.upsertPricing(id, { currencyCode, exchangeRate, buyingPrice, freight, misc, marginPercent, tax });
    await model.logActivity(id, 'Pricing updated', 'pricing_updated', actorFromSession(session));
    const product = await model.findById(id);
    return { data: product, message: 'Pricing saved' };
  }

  async applyPrice(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const product = await model.findById(id);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const sellPrice = Number(value.sellPrice);
    const buyPrice = Number(value.buyPrice);
    const colours = Array.isArray(value.colours) ? (value.colours as unknown[]).filter((c): c is string => typeof c === 'string') : [];

    if (!Number.isFinite(sellPrice) || sellPrice < 0 || !Number.isFinite(buyPrice) || buyPrice < 0) {
      return { error: { message: 'Validation failed', errors: ['sellPrice: Enter valid prices'], status: 400 } };
    }

    const targetColours = colours.length > 0 ? colours : null;
    const count = await model.applyPriceToColours(id, targetColours, sellPrice, buyPrice);
    await model.logActivity(id, `Price applied to ${count} variant${count === 1 ? '' : 's'}`, 'price_applied', actorFromSession(session));
    const updated = await model.findById(id);
    return { data: updated, message: 'Prices applied' };
  }

  async updateVariant(id: string, variantId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const existingProduct = await model.findById(id);
    if (!existingProduct) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const errors: string[] = [];
    const numeric: Record<string, number> = {};
    for (const field of ['stockOnHand', 'sellPrice', 'trigger', 'allocated'] as const) {
      if (value[field] === undefined) continue;
      const n = Number(value[field]);
      if (!Number.isFinite(n) || n < 0) errors.push(`${field}: Enter a value of 0 or more`);
      else numeric[field] = n;
    }
    // A blank colour/size on a product that declares that axis produces a variant Shopify's own
    // CSV importer rejects ("Each variant must have exactly one option value for each product
    // option") — refuse it here rather than letting it reach the database.
    if (typeof value.colour === 'string' && value.colour.trim() === '' && existingProduct.colours.length > 0) {
      errors.push('colour: Enter a colour');
    }
    if (typeof value.size === 'string' && value.size.trim() === '' && existingProduct.sizes.length > 0) {
      errors.push('size: Enter a size');
    }
    // The variant's locations and the stock held at each, replacing both wholesale.
    let locationStock: { locationId: string; quantity: number }[] | undefined;
    if ('locationStock' in value) {
      locationStock = [];
      const seen = new Set<string>();
      for (const raw of Array.isArray(value.locationStock) ? (value.locationStock as unknown[]) : []) {
        const entry = (raw ?? {}) as Record<string, unknown>;
        if (typeof entry.locationId !== 'string' || seen.has(entry.locationId)) continue;
        const quantity = Number(entry.quantity ?? 0);
        if (!Number.isInteger(quantity) || quantity < 0) {
          errors.push('locationStock: Enter a whole number of 0 or more at each location');
          continue;
        }
        seen.add(entry.locationId);
        locationStock.push({ locationId: entry.locationId, quantity });
      }
      if (locationStock.length > 0 && (await locationModel.countExisting([...seen])) !== locationStock.length) errors.push('locationStock: Pick existing locations');
    }
    // Stock from a removed location moves into a survivor: `remap[fromLocationId]` is the
    // destination kept in `locationStock`.
    const remap = parseRemap(value.remap);
    // A located variant's stock on hand is the sum of its locations — it's only set directly while
    // the variant has no location.
    if (numeric.stockOnHand !== undefined) {
      const variant = existingProduct.variants.find((v) => v.id === variantId);
      const willHaveLocations = locationStock !== undefined ? locationStock.length > 0 : (variant?.locations.length ?? 0) > 0;
      if (willHaveLocations) errors.push('stockOnHand: Set stock on hand per location');
      else numeric.stockOnHand = Math.trunc(numeric.stockOnHand);
    }
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const fieldsChanged = Object.keys(value).some((k) => k !== 'imageId');
    let imageId: string | null | undefined;

    try {
      // Locations first: a dropped location holding stock moves into its remap destination.
      if (locationStock !== undefined) await locationModel.setVariantLocationStock(variantId, locationStock, remap);
      await model.updateVariant(variantId, {
        ...(typeof value.sku === 'string' ? { sku: value.sku.trim() || null } : {}),
        ...(typeof value.barcode === 'string' ? { barcode: value.barcode.trim() || null } : {}),
        ...(typeof value.colour === 'string' ? { colour: value.colour.trim() } : {}),
        ...(typeof value.size === 'string' ? { size: value.size.trim() } : {}),
        ...numeric,
      });
      if ('imageId' in value) {
        imageId = typeof value.imageId === 'string' && value.imageId.trim() ? value.imageId.trim() : null;
        await model.setVariantImage(id, variantId, imageId);
      }
    } catch (error) {
      if (error instanceof StockError) return { error: { message: error.message, errors: [`locationStock: ${error.message}`], status: 400 } };
      return { error: { message: error instanceof Error ? error.message : 'Failed to update variant', status: 409 } };
    }

    if (fieldsChanged) await model.logActivity(id, 'Variant updated', 'variant_updated', actorFromSession(session), variantId);
    if (imageId !== undefined) {
      await model.logActivity(id, imageId ? 'Variant image linked' : 'Variant image unlinked', 'variant_image_updated', actorFromSession(session), variantId);
    }
    const product = await model.findById(id);
    return { data: product, message: 'Variant updated' };
  }

  async deleteVariant(id: string, variantId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    if ((await model.countUndeletableVariants(id, [variantId])) > 0) {
      return { error: { message: 'This variant still has stock, allocated or incoming quantity — clear it before deleting', status: 409 } };
    }

    const removed = await model.deleteVariant(id, variantId);
    if (!removed) return { error: { message: 'Variant not found', status: 404 } };

    await model.logActivity(id, 'Variant deleted', 'variant_deleted', actorFromSession(session), variantId);
    const product = await model.findById(id);
    return { data: product, message: 'Variant deleted' };
  }

  /** Bulk location assignment for the selected variants of a product. */
  async setVariantLocations(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const existingProduct = await model.findById(id);
    if (!existingProduct) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const strings = (raw: unknown) => (Array.isArray(raw) ? [...new Set((raw as unknown[]).filter((v): v is string => typeof v === 'string'))] : []);
    const productVariantIds = new Set(existingProduct.variants.map((v) => v.id));
    const variantIds = strings(value.variantIds).filter((v) => productVariantIds.has(v));
    const locationIds = strings(value.locationIds);
    const mode = value.mode === 'replace' ? 'replace' : 'add';

    const errors: string[] = [];
    if (variantIds.length === 0) errors.push('variantIds: Select at least one variant');
    if (mode === 'add' && locationIds.length === 0) errors.push('locationIds: Pick at least one location');
    if (locationIds.length > 0 && (await locationModel.countExisting(locationIds)) !== locationIds.length) errors.push('locationIds: Pick existing locations');
    // Stock from each removed location moves into one survivor: `remap[fromId]` is a kept location.
    const remap = parseRemap(value.remap);
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    try {
      await locationModel.bulkSetVariantLocations(variantIds, locationIds, mode, remap);
    } catch (error) {
      if (error instanceof StockError) return { error: { message: error.message, errors: [`locationIds: ${error.message}`], status: 400 } };
      throw error;
    }
    await model.logActivity(id, `Locations updated on ${variantIds.length} variant${variantIds.length === 1 ? '' : 's'}`, 'variant_updated', actorFromSession(session));
    return { data: await model.findById(id), message: 'Locations updated' };
  }

  async deleteVariants(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const variantIds = Array.isArray(value.variantIds) ? (value.variantIds as unknown[]).filter((v): v is string => typeof v === 'string') : [];
    if (variantIds.length === 0) return { error: { message: 'Validation failed', errors: ['variantIds: Select at least one variant'], status: 400 } };

    const blocked = await model.countUndeletableVariants(id, variantIds);
    if (blocked > 0) {
      return {
        error: {
          message: `${blocked} selected variant${blocked === 1 ? ' still has' : 's still have'} stock, allocated or incoming quantity — clear it before deleting`,
          status: 409,
        },
      };
    }

    const count = await model.deleteVariants(id, variantIds);
    if (count === 0) return { error: { message: 'No matching variants found', status: 404 } };

    await model.logActivity(id, `${count} variant${count === 1 ? '' : 's'} deleted`, 'variant_deleted', actorFromSession(session));
    const product = await model.findById(id);
    return { data: product, message: `${count} variant${count === 1 ? '' : 's'} deleted` };
  }

  /** Parses `colours`/`sizes` arrays off a request body the same way for every endpoint that
   * accepts a checked colour/size list: uppercase-trimmed, case-insensitive deduped, colours
   * paired with a derived swatch. Used by applyOptions. */
  private parseCheckedOptions(value: Record<string, unknown>): { colours: { name: string; color: string }[]; sizes: string[] } {
    const rawColours = Array.isArray(value.colours) ? (value.colours as unknown[]) : [];
    const seenColours = new Set<string>();
    const colours: { name: string; color: string }[] = [];
    for (const raw of rawColours) {
      const name = typeof raw === 'string' ? upperTrim(raw) : '';
      if (!name || seenColours.has(name.toLowerCase())) continue;
      seenColours.add(name.toLowerCase());
      colours.push({ name, color: deriveColorFromName(name) });
    }

    const rawSizes = Array.isArray(value.sizes) ? (value.sizes as unknown[]) : [];
    const seenSizes = new Set<string>();
    const sizes: string[] = [];
    for (const raw of rawSizes) {
      const size = typeof raw === 'string' ? upperTrim(raw) : '';
      if (!size || seenSizes.has(size.toLowerCase())) continue;
      seenSizes.add(size.toLowerCase());
      sizes.push(size);
    }

    return { colours, sizes };
  }

  /** Applies the Colour & size adjustment modal's checked colours/sizes/variant values to a
   * product — see SupplierProductModel.applyOptions for what `replace` vs `insert` each do. */
  async applyOptions(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const mode = value.mode === 'replace' || value.mode === 'insert' ? value.mode : null;
    if (!mode) return { error: { message: 'mode: Must be "replace" or "insert"', status: 400 } };

    const { colours, sizes } = this.parseCheckedOptions(value);

    if (colours.length === 0 && sizes.length === 0) {
      return { error: { message: 'Validation failed', errors: ['colours: Check at least one colour or size'], status: 400 } };
    }

    // Replace deletes every variant outside the checked colours x sizes, so none holding stock may be left out.
    if (mode === 'replace') {
      const product = await model.findById(id);
      const kept = new Set<string>();
      for (const colour of colours.length > 0 ? colours.map((c) => c.name) : ['']) {
        for (const size of sizes.length > 0 ? sizes : ['']) kept.add(`${colour.toLowerCase()}::${size.toUpperCase()}`);
      }
      const stocked = (product?.variants ?? []).filter((v) => v.stockOnHand > 0 && !kept.has(`${v.colour.toLowerCase()}::${v.size.toUpperCase()}`));
      if (stocked.length > 0) {
        const names = stocked.map((v) => [v.colour, v.size].filter(Boolean).join(' / ') || 'Default Title').join(', ');
        return { error: { message: `Cannot remove ${names} — still has stock on hand. Set its stock to 0 first.`, status: 409 } };
      }
    }

    const errors: string[] = [];

    // Where stock is kept: the ticked locations. Required whenever any location exists.
    const locationIds = [...new Set((Array.isArray(value.locationIds) ? (value.locationIds as unknown[]) : []).filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()))];
    if (locationIds.length > 0) {
      if ((await locationModel.countExisting(locationIds)) !== locationIds.length) errors.push('locationIds: Pick existing locations');
    } else if ((await locationModel.listOptions()).length > 0) {
      errors.push('locationIds: Pick at least one location');
    }
    const remap = parseRemap(value.remap);
    for (const [from, to] of Object.entries(remap)) {
      if (!locationIds.includes(to) || from === to) errors.push('remap: Move stock into one of the picked locations');
    }

    const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
    const rawValues = Array.isArray(value.values) ? (value.values as unknown[]) : [];
    const values: { colour: string; size: string; stockOnHand?: number; trigger?: number; stock?: { locationId: string; quantity: number }[] }[] = [];
    for (const raw of rawValues) {
      if (!raw || typeof raw !== 'object') continue;
      const v = raw as Record<string, unknown>;
      const colour = typeof v.colour === 'string' ? v.colour.trim() : '';
      const size = typeof v.size === 'string' ? v.size.trim() : '';
      const label = [colour, size].filter(Boolean).join(' / ') || 'Default Title';
      const entry: (typeof values)[number] = { colour, size };
      if (v.trigger !== undefined) {
        if (isCount(v.trigger)) entry.trigger = v.trigger;
        else errors.push(`trigger: ${label} needs a whole number of 0 or more`);
      }
      if (locationIds.length > 0) {
        const seen = new Set<string>();
        const stock: { locationId: string; quantity: number }[] = [];
        for (const s of Array.isArray(v.stock) ? (v.stock as unknown[]) : []) {
          const row = (s ?? {}) as Record<string, unknown>;
          const locationId = typeof row.locationId === 'string' ? row.locationId : '';
          if (!locationIds.includes(locationId) || seen.has(locationId)) {
            errors.push(`stock: ${label} has stock for a location that isn't picked`);
          } else if (!isCount(row.quantity)) {
            errors.push(`stock: ${label} needs a whole number of 0 or more`);
          } else {
            seen.add(locationId);
            stock.push({ locationId, quantity: row.quantity });
          }
        }
        entry.stock = stock;
        entry.stockOnHand = stock.reduce((sum, l) => sum + l.quantity, 0);
      } else if (v.stockOnHand !== undefined) {
        if (isCount(v.stockOnHand)) entry.stockOnHand = v.stockOnHand;
        else errors.push(`stockOnHand: ${label} needs a whole number of 0 or more`);
      }
      values.push(entry);
    }
    if (errors.length) return { error: { message: 'Validation failed', errors: [...new Set(errors)], status: 400 } };

    try {
      await model.applyOptions(id, { mode, colours, sizes, values, locationIds, remap });
    } catch (error) {
      if (error instanceof StockError) return { error: { message: error.message, errors: [`locationIds: ${error.message}`], status: 400 } };
      throw error;
    }

    const variantCount = colours.length > 0 ? colours.length * Math.max(sizes.length, 1) : sizes.length;
    await model.logActivity(
      id,
      mode === 'replace' ? `Variants replaced (${variantCount})` : `${variantCount} variant${variantCount === 1 ? '' : 's'} checked for insert`,
      mode === 'replace' ? 'variant_deleted' : 'variant_updated',
      actorFromSession(session)
    );
    const product = await model.findById(id);
    return { data: product, message: mode === 'replace' ? 'Variants replaced' : 'Variants inserted' };
  }

  async addImage(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const url = typeof value.url === 'string' ? value.url.trim() : '';
    if (!url) return { error: { message: 'url is required', status: 400 } };

    const existingCount = await model.countImages(id);
    if (existingCount >= MAX_IMAGES) {
      return { error: { message: `This product can hold at most ${MAX_IMAGES} images (${existingCount} already uploaded)`, status: 400 } };
    }

    await model.addImage(id, {
      url,
      altText: typeof value.altText === 'string' ? value.altText : null,
      colour: typeof value.colour === 'string' ? value.colour : null,
    });
    await model.logActivity(id, 'Image added', 'image_added', actorFromSession(session));
    const product = await model.findById(id);
    return { data: product, message: 'Image added' };
  }

  /** `variantId` links the first uploaded image straight into that variant's image slot — used
   * by the per-variant upload control in the images modal. */
  async uploadImages(id: string, files: File[], colour: string | null, session: Session, variantId?: string | null) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };
    if (files.length === 0) return { error: { message: 'No files provided', status: 400 } };

    const existingCount = await model.countImages(id);
    if (existingCount + files.length > MAX_IMAGES) {
      return {
        error: {
          message: `This product can hold at most ${MAX_IMAGES} images (${existingCount} already uploaded, ${files.length} more requested)`,
          status: 400,
        },
      };
    }

    const uploaded = await Promise.all(files.map((file) => saveUploadedFile(file)));
    const created = await model.addImages(
      id,
      uploaded.map((file) => ({ url: file.url, altText: file.name, colour }))
    );
    if (variantId && created[0]) {
      await model.setVariantImage(id, variantId, created[0].id);
    }
    await model.logActivity(id, `${created.length} image${created.length === 1 ? '' : 's'} uploaded`, 'image_added', actorFromSession(session));

    const product = await model.findById(id);
    return { data: product, message: 'Images added' };
  }

  /** Saves files to disk and returns their public URLs without creating any `SupplierProductImage`
   * row — used by the Online stores & prices / Bulk update modals, where an added image is only a
   * temporary part of that store's draft (never the hub gallery) until the admin hits Save. */
  async stageImages(files: File[], session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (files.length === 0) return { error: { message: 'No files provided', status: 400 } };

    const uploaded = await Promise.all(files.map((file) => saveUploadedFile(file)));
    return { data: { files: uploaded.map((file) => ({ url: file.url, name: file.name })) }, message: 'Images staged' };
  }

  async removeImage(id: string, imageId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const removed = await model.removeImage(id, imageId);
    if (!removed) return { error: { message: 'Image not found', status: 404 } };
    await model.logActivity(id, 'Image removed', 'image_removed', actorFromSession(session));
    const product = await model.findById(id);
    return { data: product, message: 'Image removed' };
  }

  async updateImageColour(id: string, imageId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const product = await model.findById(id);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const colour = typeof value.colour === 'string' && value.colour.trim() ? value.colour.trim() : null;
    if (colour !== null && !product.colours.some((c) => c.name.toLowerCase() === colour.toLowerCase())) {
      return { error: { message: 'Validation failed', errors: ['colour: Not one of this product’s declared colours'], status: 400 } };
    }

    const updated = await model.updateImageColour(id, imageId, colour);
    if (!updated) return { error: { message: 'Image not found', status: 404 } };

    const updatedProduct = await model.findById(id);
    return { data: updatedProduct, message: colour ? `Image assigned to ${colour}` : 'Image unassigned' };
  }

  async remove(id: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const removed = await model.delete(id);
    if (!removed) return { error: { message: 'Product not found', status: 404 } };
    return { data: null, message: 'Product deleted' };
  }

  async bulk(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const action = typeof value.action === 'string' ? value.action : '';
    const productIds = Array.isArray(value.productIds) ? (value.productIds as unknown[]).filter((id): id is string => typeof id === 'string') : [];
    if (productIds.length === 0) return { error: { message: 'productIds: At least one product is required', status: 400 } };

    if (action === 'delete') {
      const count = await model.deleteMany(productIds);
      return { data: { count }, message: `${count} product${count === 1 ? '' : 's'} deleted` };
    }

    if (action === 'set_status') {
      const status = typeof value.status === 'string' ? value.status : '';
      if (!STATUS_VALUES.has(status)) return { error: { message: 'status: Invalid status', status: 400 } };
      const count = await model.setStatusMany(productIds, status as SupplierProductStatus);
      await Promise.all(productIds.map((id) => model.logActivity(id, `Status set to ${status}`, 'status_updated', actorFromSession(session))));
      return { data: { count }, message: `${count} product${count === 1 ? '' : 's'} updated` };
    }

    if (action === 'set_verified') {
      if (typeof value.verified !== 'boolean') return { error: { message: 'verified: Must be true or false', status: 400 } };
      const count = await model.setVerifiedMany(productIds, value.verified);
      const message = value.verified ? 'Marked as verified' : 'Marked as unverified';
      await Promise.all(productIds.map((id) => model.logActivity(id, message, 'verified_updated', actorFromSession(session))));
      return { data: { count }, message: `${count} product${count === 1 ? '' : 's'} updated` };
    }

    if (action === 'set_omitted') {
      if (typeof value.omitted !== 'boolean') return { error: { message: 'omitted: Must be true or false', status: 400 } };
      const count = await model.setOmittedMany(productIds, value.omitted);
      const message = value.omitted ? 'Omitted from list' : 'Restored to list';
      await Promise.all(productIds.map((id) => model.logActivity(id, message, 'omitted_updated', actorFromSession(session))));
      return { data: { count }, message: `${count} product${count === 1 ? '' : 's'} updated` };
    }

    return { error: { message: 'action: Unsupported bulk action', status: 400 } };
  }
}

