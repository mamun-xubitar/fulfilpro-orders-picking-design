import prisma from '@/lib/prisma.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { CurrencyRateModel } from '@/models/currency-rate.model.server';
import { saveUploadedFile } from '@/lib/uploads.server';
import { SupplierProductStatus } from '@prisma/client';

const model = new SupplierProductModel();
const currencyModel = new CurrencyRateModel();

const STATUS_VALUES = new Set<string>(Object.values(SupplierProductStatus));

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? null, name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

export class SupplierProductController {
  async list(searchParams: URLSearchParams, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const search = searchParams.get('search')?.trim() ?? '';
    const [allProducts, settings, currencies] = await Promise.all([
      model.listAll(),
      prisma.appSettings.upsert({ where: { id: 'default' }, update: {}, create: { id: 'default' }, select: { globalMarginPercent: true, globalExchangeRate: true } }),
      currencyModel.list(),
    ]);

    const products = search ? allProducts.filter((p) => matchesSearch(p, search)) : allProducts;

    return {
      data: {
        products,
        globals: {
          exchangeRate: Number(settings.globalExchangeRate),
          marginPercent: Number(settings.globalMarginPercent),
          baseCurrency: 'AUD',
          currencies: [{ code: 'AUD', rate: 1 }, ...currencies.map((c) => ({ code: c.code, rate: c.rate }))],
        },
      },
    };
  }

  async create(body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const supplierId = typeof value.supplierId === 'string' ? value.supplierId.trim() : '';
    const itemNo = typeof value.itemNo === 'string' ? value.itemNo.trim() : '';
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const brand = typeof value.brand === 'string' ? value.brand.trim() : '';

    const errors: string[] = [];
    if (!supplierId) errors.push('supplierId: Supplier is required');
    if (!itemNo) errors.push('itemNo: Item number is required');
    if (!name) errors.push('name: Product name is required');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
    if (!supplier) return { error: { message: 'Supplier not found', status: 404 } };

    const existing = await prisma.supplierProduct.findUnique({ where: { supplierId_itemNo: { supplierId, itemNo } } });
    if (existing) return { error: { message: 'Validation failed', errors: ['itemNo: This supplier already has a product with this item number'], status: 409 } };

    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
      select: { globalMarginPercent: true, globalExchangeRate: true },
    });
    const id = await model.create({
      supplierId,
      itemNo,
      name,
      brand: brand || null,
      marginPercent: Number(settings.globalMarginPercent),
    });
    const product = await model.findById(id);
    return { data: product, message: 'Product created' };
  }

  async updateDetails(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const errors: string[] = [];
    if (typeof value.status === 'string' && !STATUS_VALUES.has(value.status)) errors.push('status: Invalid status');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    await model.updateDetails(id, {
      ...(typeof value.itemNo === 'string' ? { itemNo: value.itemNo.trim() } : {}),
      ...(typeof value.brand === 'string' ? { brand: value.brand.trim() } : {}),
      ...(typeof value.name === 'string' ? { name: value.name.trim() } : {}),
      ...(typeof value.category === 'string' ? { category: value.category.trim() } : {}),
      ...('categoryId' in value ? { categoryId: typeof value.categoryId === 'string' ? value.categoryId : null } : {}),
      ...(typeof value.sku === 'string' ? { sku: value.sku.trim() } : {}),
      ...(typeof value.description === 'string' ? { description: value.description } : {}),
      ...(typeof value.deliveryRemarks === 'string' ? { deliveryRemarks: value.deliveryRemarks } : {}),
      ...(typeof value.status === 'string' ? { status: value.status as SupplierProductStatus } : {}),
      ...(typeof value.verified === 'boolean' ? { verified: value.verified } : {}),
      ...(Array.isArray(value.sizes) ? { sizes: (value.sizes as unknown[]).filter((s): s is string => typeof s === 'string') } : {}),
      ...(Array.isArray(value.colours)
        ? {
            colours: (value.colours as unknown[])
              .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
              .map((c) => ({ name: String(c.name ?? ''), hex: String(c.hex ?? '#cbd5e1') })),
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
    if (!Number.isFinite(tax) || tax < 0) errors.push('tax: Enter a value of 0 or more');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    await model.upsertPricing(id, { currencyCode, exchangeRate, buyingPrice, freight, misc, marginPercent, tax });
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

    const targetColours = colours.length > 0 ? colours : product.colours.map((c) => c.name);
    const count = await model.applyPriceToColours(id, targetColours, sellPrice, buyPrice);
    await model.logActivity(id, `Price applied to ${count} variant${count === 1 ? '' : 's'}`, 'price_applied', actorFromSession(session));
    const updated = await model.findById(id);
    return { data: updated, message: 'Prices applied' };
  }

  async updateVariant(id: string, variantId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const errors: string[] = [];
    const numeric: Record<string, number> = {};
    for (const field of ['stockOnHand', 'buyPrice', 'sellPrice', 'trigger', 'forwardOrders'] as const) {
      if (value[field] === undefined) continue;
      const n = Number(value[field]);
      if (!Number.isFinite(n) || n < 0) errors.push(`${field}: Enter a value of 0 or more`);
      else numeric[field] = n;
    }
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    try {
      await model.updateVariant(variantId, {
        ...(typeof value.sku === 'string' ? { sku: value.sku.trim() || null } : {}),
        ...(typeof value.barcode === 'string' ? { barcode: value.barcode.trim() || null } : {}),
        ...(typeof value.colour === 'string' ? { colour: value.colour.trim() } : {}),
        ...(typeof value.size === 'string' ? { size: value.size.trim() } : {}),
        ...numeric,
      });
    } catch (error) {
      return { error: { message: error instanceof Error ? error.message : 'Failed to update variant', status: 409 } };
    }

    const product = await model.findById(id);
    return { data: product, message: 'Variant updated' };
  }

  async deleteVariant(id: string, variantId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const removed = await model.deleteVariant(id, variantId);
    if (!removed) return { error: { message: 'Variant not found', status: 404 } };

    await model.logActivity(id, 'Variant deleted', 'variant_deleted', actorFromSession(session), variantId);
    const product = await model.findById(id);
    return { data: product, message: 'Variant deleted' };
  }

  async addImage(id: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const url = typeof value.url === 'string' ? value.url.trim() : '';
    if (!url) return { error: { message: 'url is required', status: 400 } };

    await model.addImage(id, {
      url,
      altText: typeof value.altText === 'string' ? value.altText : null,
      colour: typeof value.colour === 'string' ? value.colour : null,
    });
    const product = await model.findById(id);
    return { data: product, message: 'Image added' };
  }

  async uploadImages(id: string, files: File[], colour: string | null, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    if (!(await model.exists(id))) return { error: { message: 'Product not found', status: 404 } };
    if (files.length === 0) return { error: { message: 'No files provided', status: 400 } };

    const uploaded = await Promise.all(files.map((file) => saveUploadedFile(file)));
    await model.addImages(
      id,
      uploaded.map((file) => ({ url: file.url, altText: file.name, colour }))
    );

    const product = await model.findById(id);
    return { data: product, message: 'Images added' };
  }

  async removeImage(id: string, imageId: string, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const removed = await model.removeImage(id, imageId);
    if (!removed) return { error: { message: 'Image not found', status: 404 } };
    const product = await model.findById(id);
    return { data: product, message: 'Image removed' };
  }

  async updateImageColour(id: string, imageId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const colour = typeof value.colour === 'string' && value.colour.trim() ? value.colour.trim() : null;

    const updated = await model.updateImageColour(id, imageId, colour);
    if (!updated) return { error: { message: 'Image not found', status: 404 } };

    const product = await model.findById(id);
    return { data: product, message: 'Image colour updated' };
  }
}

function matchesSearch(product: { name: string; sku: string; itemNo: string; variants: Array<{ sku: string | null; barcode: string | null }> }, term: string): boolean {
  const q = term.toLowerCase();
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.sku.toLowerCase().includes(q)) return true;
  if (product.itemNo.toLowerCase().includes(q)) return true;
  return product.variants.some((v) => v.sku?.toLowerCase().includes(q) || v.barcode?.toLowerCase().includes(q));
}
