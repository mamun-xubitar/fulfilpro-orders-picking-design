import prisma from '@/lib/prisma.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import { CurrencyRateModel } from '@/models/currency-rate.model.server';
import { saveUploadedFile } from '@/lib/uploads.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { isValidHandle, slugifyHandle } from '@/lib/inventory/handle';
import { sanitizeHtml } from '@/lib/sanitize-html';
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

    // USD is always offered in the currency picker even if no CurrencyRate row has been configured
    // for it yet — the pricing panel defaults new products to USD, so the option must always exist.
    const configuredUsd = currencies.find((c) => c.code === 'USD');
    const usdRate = configuredUsd?.rate ?? Number(settings.globalExchangeRate);
    const extraCurrencies = currencies.filter((c) => c.code !== 'USD').map((c) => ({ code: c.code, rate: c.rate }));

    return {
      data: {
        products,
        globals: {
          exchangeRate: Number(settings.globalExchangeRate),
          marginPercent: Number(settings.globalMarginPercent),
          baseCurrency: 'AUD',
          currencies: [{ code: 'AUD', rate: 1 }, { code: 'USD', rate: usdRate }, ...extraCurrencies],
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
    const handleInput = typeof value.handle === 'string' ? value.handle.trim() : '';
    const handle = handleInput || slugifyHandle(name) || slugifyHandle(itemNo);

    const errors: string[] = [];
    if (!supplierId) errors.push('supplierId: Supplier is required');
    if (!itemNo) errors.push('itemNo: Item number is required');
    if (!name) errors.push('name: Product name is required');
    if (!handle || !isValidHandle(handle)) errors.push('handle: Enter a valid handle (lowercase letters, numbers and dashes)');
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
    if (!supplier) return { error: { message: 'Supplier not found', status: 404 } };

    const existing = await prisma.supplierProduct.findUnique({ where: { supplierId_itemNo: { supplierId, itemNo } } });
    if (existing) return { error: { message: 'Validation failed', errors: ['itemNo: This supplier already has a product with this item number'], status: 409 } };

    const handleTaken = await prisma.supplierProduct.findUnique({ where: { handle }, select: { id: true } });
    if (handleTaken) return { error: { message: 'Validation failed', errors: ['handle: A product with this handle already exists'], status: 409 } };

    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
      select: { globalMarginPercent: true, globalExchangeRate: true },
    });
    const id = await model.create({
      supplierId,
      itemNo,
      handle,
      name,
      brand: brand || null,
      marginPercent: Number(settings.globalMarginPercent),
      exchangeRate: Number(settings.globalExchangeRate),
      actor: actorFromSession(session),
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
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    await model.updateDetails(id, {
      ...(typeof value.itemNo === 'string' ? { itemNo: value.itemNo.trim() } : {}),
      ...(handle !== undefined ? { handle } : {}),
      ...(typeof value.brand === 'string' ? { brand: value.brand.trim() } : {}),
      ...(typeof value.name === 'string' ? { name: value.name.trim() } : {}),
      ...(typeof value.category === 'string' ? { category: value.category.trim() } : {}),
      ...('categoryId' in value ? { categoryId: typeof value.categoryId === 'string' ? value.categoryId : null } : {}),
      ...(typeof value.sku === 'string' ? { sku: value.sku.trim() } : {}),
      ...(typeof value.description === 'string' ? { description: sanitizeHtml(value.description) } : {}),
      ...(typeof value.deliveryRemarks === 'string' ? { deliveryRemarks: value.deliveryRemarks } : {}),
      ...(typeof value.status === 'string' ? { status: value.status as SupplierProductStatus } : {}),
      ...(typeof value.verified === 'boolean' ? { verified: value.verified } : {}),
      ...(Array.isArray(value.sizes) ? { sizes: (value.sizes as unknown[]).filter((s): s is string => typeof s === 'string') } : {}),
      ...(Array.isArray(value.colours)
        ? {
            colours: (value.colours as unknown[])
              .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
              .map((c) => {
                const name = String(c.name ?? '');
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

    const targetColours = colours.length > 0 ? colours : product.colours.map((c) => c.name);
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
    if (errors.length) return { error: { message: 'Validation failed', errors, status: 400 } };

    const fieldsChanged = Object.keys(value).some((k) => k !== 'imageId');
    let imageId: string | null | undefined;

    try {
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

    const value = (body ?? {}) as Record<string, unknown>;
    const colour = typeof value.colour === 'string' && value.colour.trim() ? value.colour.trim() : null;

    const updated = await model.updateImageColour(id, imageId, colour);
    if (!updated) return { error: { message: 'Image not found', status: 404 } };

    const product = await model.findById(id);
    return { data: product, message: 'Image colour updated' };
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

    return { error: { message: 'action: Unsupported bulk action', status: 400 } };
  }
}

function matchesSearch(
  product: { name: string; sku: string; itemNo: string; handle: string; variants: Array<{ sku: string | null; barcode: string | null }> },
  term: string
): boolean {
  const q = term.toLowerCase();
  if (product.name.toLowerCase().includes(q)) return true;
  if (product.sku.toLowerCase().includes(q)) return true;
  if (product.itemNo.toLowerCase().includes(q)) return true;
  if (product.handle.toLowerCase().includes(q)) return true;
  return product.variants.some((v) => v.sku?.toLowerCase().includes(q) || v.barcode?.toLowerCase().includes(q));
}
