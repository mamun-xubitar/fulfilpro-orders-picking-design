import { revalidateTag } from 'next/cache';
import { SupplierProductModel, type SupplierProductRow } from '@/models/supplier-product.model.server';
import { StoreListingModel } from '@/models/store-listing.model.server';
import { storeListingsTag } from '@/lib/shopify-store-listings.server';
import {
  addStoreProductMedia,
  createStoreVariant,
  deleteStoreVariants,
  removeStoreMedia,
  replaceStoreMedia,
  updateStoreProductField,
  updateStoreVariants,
  type StoreProductFieldUpdate,
  type StoreVariantUpdate,
} from '@/lib/shopify-store-product-edit.server';
import { resolveOptionAxes, variantOptionValues } from '@/lib/inventory/variant-options';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { findMissingUploads, saveUploadedFile, toPublicUrl } from '@/lib/uploads.server';

const model = new SupplierProductModel();
const listingModel = new StoreListingModel();

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;
type Fail = { error: { message: string; errors?: string[]; status: number } };

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const VALID_STATUS = new Set(['ACTIVE', 'DRAFT', 'UNLISTED']);

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? null, name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

function fail(message: string, status = 400, errors?: string[]): Fail {
  return { error: { message, status, errors } };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function money(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 999999.99 ? n : null;
}

/** Image input for add/replace: a hub gallery image id (the server resolves its URL) or an uploaded
 * file — never a URL from the client, so Shopify can only be pointed at files this app serves. */
export type StoreImageSource = { hubImageId?: string; file?: File | null };

/**
 * Direct per-property edits for the differences modal. Each method is one Shopify mutation (see
 * lib/shopify-store-product-edit.server.ts), then busts the store-listings cache so the modal's
 * re-sync shows the result. The store's `productGid` comes from the request body — the same
 * contract as `StoreListingController.updatePrices` — since it's the live listing the modal is on.
 */
export class StoreListingEditController {
  /** Shared guard: admin only, product exists, productGid present. */
  private async context(productId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return fail('Forbidden', 403);
    const product = await model.findById(productId);
    if (!product) return fail('Product not found', 404);
    const value = (body ?? {}) as Record<string, unknown>;
    const productGid = str(value.productGid);
    if (!productGid) return fail('Validation failed', 400, ['productGid: Required']);
    return { product, productGid, value };
  }

  private async finish(product: SupplierProductRow, message: string, activity: string, session: Session) {
    revalidateTag(storeListingsTag(product.handle), { expire: 0 });
    await model.logActivity(product.id, activity, 'store_edited', actorFromSession(session));
    return { data: {}, message };
  }

  private async resolveImageUrl(product: SupplierProductRow, source: StoreImageSource): Promise<{ url: string; altText: string | null } | Fail> {
    if (source.file) {
      if (!source.file.type.startsWith('image/')) return fail('Only image files can be uploaded');
      if (source.file.size > MAX_IMAGE_BYTES) return fail(`${source.file.name} exceeds the 10 MB limit`);
      const saved = await saveUploadedFile(source.file);
      const url = toPublicUrl(saved.url);
      if (!url) return fail("Images can't be sent: APP_URL is not set to a public URL Shopify can fetch from");
      return { url, altText: null };
    }
    const image = product.images.find((i) => i.id === source.hubImageId);
    if (!image) return fail('Pick a system image or upload a file');
    const url = toPublicUrl(image.url);
    if (!url) return fail("Images can't be sent: APP_URL is not set to a public URL Shopify can fetch from");
    const missing = await findMissingUploads([url]);
    if (missing.length > 0) return fail(`Image file is missing from the server's uploads folder (${missing.join(', ')})`);
    return { url, altText: image.altText?.slice(0, 255) ?? null };
  }

  async updateField(productId: string, storeId: string, body: unknown, session: Session) {
    const ctx = await this.context(productId, body, session);
    if ('error' in ctx) return ctx;
    const raw = (ctx.value.fields ?? {}) as Record<string, unknown>;

    const fields: StoreProductFieldUpdate = {};
    if (typeof raw.title === 'string') {
      if (!raw.title.trim()) return fail('Validation failed', 400, ['title: Enter a title']);
      fields.title = raw.title.trim().slice(0, 255);
    }
    if (typeof raw.descriptionHtml === 'string') fields.descriptionHtml = sanitizeHtml(raw.descriptionHtml.slice(0, 50000));
    if (typeof raw.vendor === 'string') {
      if (!raw.vendor.trim()) return fail('Validation failed', 400, ['vendor: Enter a vendor']);
      fields.vendor = raw.vendor.trim().slice(0, 255);
    }
    if (typeof raw.category === 'string' || raw.category === null) fields.category = raw.category;
    if (typeof raw.status === 'string') {
      if (!VALID_STATUS.has(raw.status)) return fail('Validation failed', 400, ['status: Invalid status']);
      fields.status = raw.status as StoreProductFieldUpdate['status'];
    }
    if (Object.keys(fields).length === 0) return fail('Validation failed', 400, ['fields: Nothing to update']);

    try {
      await updateStoreProductField({ storeId, productGid: ctx.productGid, fields });
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update the store', 502);
    }
    return this.finish(ctx.product, 'Store listing updated', `Updated ${Object.keys(fields).join(', ')} on a store listing`, session);
  }

  async addMedia(productId: string, storeId: string, body: unknown, source: StoreImageSource, session: Session) {
    const ctx = await this.context(productId, body, session);
    if ('error' in ctx) return ctx;
    const resolved = await this.resolveImageUrl(ctx.product, source);
    if ('error' in resolved) return resolved;

    try {
      await addStoreProductMedia({ storeId, productGid: ctx.productGid, url: resolved.url, altText: resolved.altText });
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to add the image', 502);
    }
    return this.finish(ctx.product, 'Image added', 'Added an image to a store listing', session);
  }

  async updateMedia(productId: string, storeId: string, body: unknown, source: StoreImageSource, session: Session) {
    const ctx = await this.context(productId, body, session);
    if ('error' in ctx) return ctx;
    const mediaId = str(ctx.value.mediaId);
    if (!mediaId) return fail('Validation failed', 400, ['mediaId: Required']);

    try {
      const resolved = await this.resolveImageUrl(ctx.product, source);
      if ('error' in resolved) return resolved;
      await replaceStoreMedia({ storeId, mediaId, url: resolved.url });
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update the image', 502);
    }
    return this.finish(ctx.product, 'Image replaced', 'Replaced an image on a store listing', session);
  }

  async removeMedia(productId: string, storeId: string, body: unknown, session: Session) {
    const ctx = await this.context(productId, body, session);
    if ('error' in ctx) return ctx;
    const mediaIds = Array.isArray(ctx.value.mediaIds) ? (ctx.value.mediaIds as unknown[]).filter((m): m is string => typeof m === 'string' && m.length > 0).slice(0, 250) : [];
    if (mediaIds.length === 0) return fail('Validation failed', 400, ['mediaIds: Select at least one image']);
    try {
      await removeStoreMedia({ storeId, productGid: ctx.productGid, mediaIds });
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to remove the images', 502);
    }
    return this.finish(ctx.product, mediaIds.length === 1 ? 'Image removed' : `${mediaIds.length} images removed`, `Removed ${mediaIds.length} image(s) from a store listing`, session);
  }

  async updateVariants(productId: string, storeId: string, body: unknown, session: Session) {
    const ctx = await this.context(productId, body, session);
    if ('error' in ctx) return ctx;
    const rawVariants = Array.isArray(ctx.value.variants) ? (ctx.value.variants as unknown[]) : [];
    if (rawVariants.length === 0) return fail('Validation failed', 400, ['variants: At least one variant is required']);

    const variants: StoreVariantUpdate[] = [];
    const currentMediaByVariant: Record<string, string | null> = {};
    for (const raw of rawVariants) {
      const v = (raw ?? {}) as Record<string, unknown>;
      const variantGid = str(v.variantGid);
      if (!variantGid) return fail('Validation failed', 400, ['variants: Each variant needs a variantGid']);
      const update: StoreVariantUpdate = { variantGid };
      if (typeof v.sku === 'string') update.sku = v.sku.trim().slice(0, 255);
      if (typeof v.barcode === 'string') update.barcode = v.barcode.trim().slice(0, 255);
      if (v.price !== undefined) {
        const price = money(v.price);
        if (price === null) return fail('Validation failed', 400, ['price: Enter a valid price of 0 or more']);
        update.price = price;
      }
      if (v.mediaId === null || typeof v.mediaId === 'string') update.mediaId = v.mediaId || null;
      if (v.available !== undefined) {
        const available = Number(v.available);
        if (!Number.isFinite(available) || available < 0 || available > 1_000_000) return fail('Validation failed', 400, ['available: Enter a quantity of 0 or more']);
        update.available = Math.round(available);
        update.inventoryItemGid = str(v.inventoryItemGid) || null;
        if (!update.inventoryItemGid) return fail('Validation failed', 400, ['inventoryItemGid: Required to update Available']);
      }
      currentMediaByVariant[variantGid] = typeof v.currentMediaId === 'string' ? v.currentMediaId : null;
      variants.push(update);
    }

    try {
      await updateStoreVariants({ storeId, productGid: ctx.productGid, variants, currentMediaByVariant });
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to update the variant', 502);
    }
    return this.finish(ctx.product, variants.length === 1 ? 'Variant updated' : `${variants.length} variants updated`, `Updated ${variants.length} variant(s) on a store listing`, session);
  }

  async createVariant(productId: string, storeId: string, body: unknown, session: Session) {
    const ctx = await this.context(productId, body, session);
    if ('error' in ctx) return ctx;
    const hubVariant = ctx.product.variants.find((v) => v.id === str(ctx.value.hubVariantId));
    if (!hubVariant) return fail('Variant not found', 404);

    const price = money(ctx.value.price);
    if (price === null) return fail('Validation failed', 400, ['price: Enter a valid price of 0 or more']);
    const available = Number(ctx.value.available);
    if (!Number.isFinite(available) || available < 0 || available > 1_000_000) return fail('Validation failed', 400, ['available: Enter a quantity of 0 or more']);

    const axes = resolveOptionAxes(ctx.product.variants);
    try {
      const created = await createStoreVariant({
        storeId,
        productGid: ctx.productGid,
        optionValues: variantOptionValues({ colour: hubVariant.colour?.trim() ?? '', size: hubVariant.size?.trim() ?? '' }, axes),
        sku: str(ctx.value.sku).trim() || null,
        barcode: str(ctx.value.barcode).trim() || null,
        price,
        cost: Math.max(0, hubVariant.buyPrice),
        available: Math.round(available),
        mediaId: str(ctx.value.mediaId) || null,
      });
      try {
        await listingModel.upsertVariantMappings(productId, storeId, [
          { hubVariantId: hubVariant.id, variantGid: created.variantGid, inventoryItemGid: created.inventoryItemGid, price },
        ]);
      } catch {
        // Mapping persistence must never turn a successful Shopify write into a failure.
      }
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to add the variant', 502);
    }
    return this.finish(ctx.product, 'Variant added to the store', 'Added a variant to a store listing', session);
  }

  async deleteVariants(productId: string, storeId: string, body: unknown, session: Session) {
    const ctx = await this.context(productId, body, session);
    if ('error' in ctx) return ctx;
    const variantGids = Array.isArray(ctx.value.variantGids) ? (ctx.value.variantGids as unknown[]).filter((g): g is string => typeof g === 'string' && g.length > 0).slice(0, 100) : [];
    if (variantGids.length === 0) return fail('Validation failed', 400, ['variantGids: Select at least one variant']);
    try {
      await deleteStoreVariants({ storeId, productGid: ctx.productGid, variantGids });
      await listingModel.deleteVariantMappingsByGid(productId, storeId, variantGids).catch(() => undefined);
    } catch (error) {
      return fail(error instanceof Error ? error.message : 'Failed to remove the variant', 502);
    }
    return this.finish(ctx.product, variantGids.length === 1 ? 'Variant removed' : `${variantGids.length} variants removed`, `Removed ${variantGids.length} variant(s) from a store listing`, session);
  }
}
