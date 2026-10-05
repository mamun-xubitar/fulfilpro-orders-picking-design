import prisma from '@/lib/prisma.server';
import { detectCsvType, findIncompleteAxisRows, normalizeParsedProductRows, parseShopifyProductCsv, upsertParsedProductVariants } from '@/lib/inventory/csv-import';
import type { ParsedProductGroup } from '@/lib/inventory/csv-import';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import type { SupplierProductRow } from '@/models/supplier-product.model.server';
import { SupplierProductStatus } from '@prisma/client';

const productModel = new SupplierProductModel();
const PRODUCT_STATUS_VALUES = new Set<string>(Object.values(SupplierProductStatus));

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

type ProductCsvOptions = {
  /** Defaults to today's always-replace behaviour when the flag is omitted by an older caller. */
  overwrite: boolean;
  markVerified: boolean;
};

export class InventoryCsvImportController {
  async preview(supplierProductId: string, file: File, session: Session, options: ProductCsvOptions) {
    return this.process(supplierProductId, file, session, false, options);
  }

  async commit(supplierProductId: string, file: File, session: Session, options: ProductCsvOptions) {
    return this.process(supplierProductId, file, session, true, options);
  }

  private async process(supplierProductId: string, file: File, session: Session, commit: boolean, options: ProductCsvOptions) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const product = await productModel.findById(supplierProductId);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const text = await file.text();
    const type = detectCsvType(text);
    if (type !== 'product') {
      return { error: { message: 'Unrecognized file — expected a Shopify product CSV', status: 400 } };
    }
    return this.processProductCsv(product, text, commit, session, options);
  }

  /** Picks the group in a (possibly multi-product) CSV that belongs to this product: the group
   * whose Handle matches, or — for a single-product file with a different Handle (e.g. importing
   * a freshly exported file back into the product that produced it, or a file downloaded straight
   * from Shopify) — the file's only group, adopting its Handle onto this product. A multi-product
   * file with no matching Handle is rejected rather than guessed at. */
  private async resolveProductGroup(
    product: SupplierProductRow,
    groups: ParsedProductGroup[],
    commit: boolean
  ): Promise<{ group: ParsedProductGroup; newHandle: string | null } | { error: { message: string; status: number } }> {
    const matched = groups.find((g) => g.handle === product.handle);
    if (matched) return { group: matched, newHandle: null as string | null };

    if (groups.length === 0) {
      return { error: { message: 'rows: No product rows found in this file', status: 400 } };
    }
    if (groups.length > 1) {
      const handles = groups.map((g) => g.handle).join(', ');
      return {
        error: {
          message: `handle: This file describes ${groups.length} products (${handles}) — none match this product's handle (${product.handle}). Use "Import products" to add multiple products at once.`,
          status: 400,
        },
      };
    }

    const [only] = groups;
    if (commit) {
      const conflict = await prisma.supplierProduct.findUnique({ where: { handle: only.handle }, select: { id: true } });
      if (conflict && conflict.id !== product.id) {
        return { error: { message: 'handle: Another product already uses this file\'s handle', status: 409 } };
      }
    }
    return { group: only, newHandle: only.handle };
  }

  /** Pricing (buying price, freight, margin, tax, exchange rate) is deliberately excluded here —
   * import only ever touches product details, handle, images, and per-variant sku/barcode/stock/
   * sell price/image. itemNo is NOT imported: it's the hub's own style code, distinct from the
   * CSV's Handle (which import instead writes to the product's own handle field). */
  private async processProductCsv(product: SupplierProductRow, text: string, commit: boolean, session: Session, options: ProductCsvOptions) {
    const groups = parseShopifyProductCsv(text);
    const resolved = await this.resolveProductGroup(product, groups, commit);
    if ('error' in resolved) return resolved;
    const { group: parsed, newHandle } = resolved;

    // `newHandle === null` means the file's handle matched this product's own handle — i.e. this
    // import is about to replace values already on the record, which is exactly what
    // "Overwrite…" gates. Adopting a brand-new handle onto the product isn't a replace in that
    // sense, so it's unaffected by the flag. Only refuse on commit — a preview surfaces this via
    // `handleMatches` instead, so toggling the checkbox never needs to re-upload the file.
    const handleMatches = newHandle === null;
    if (commit && handleMatches && !options.overwrite) {
      return {
        error: { message: `handle: This product already exists — tick "Overwrite products with matching handles" to replace its values`, status: 409 },
      };
    }

    if (parsed.rows.length === 0) {
      return { error: { message: 'rows: No variant rows found — expected Handle plus Option values (Colour / Size), or a single Default Title row', status: 400 } };
    }

    const { rows, unionSizes, unionColours } = normalizeParsedProductRows(product, parsed.rows);

    // Applied on both preview and commit, so a malformed file is caught before the user ever
    // sees a preview table for it — see findIncompleteAxisRows for why this matters.
    const axisErrors = findIncompleteAxisRows(
      rows,
      unionColours.map((c) => c.name),
      unionSizes
    );
    if (axisErrors.length > 0) return { error: { message: 'Validation failed', errors: axisErrors, status: 400 } };

    if (typeof parsed.product.status === 'string' && !PRODUCT_STATUS_VALUES.has(parsed.product.status)) {
      delete parsed.product.status;
    }

    // Dedup against existing images by url alone — a flat pool, Shopify-style, so the same photo
    // shared by several variants is stored once and linked from multiple variants (`imageId`).
    const existingImageUrls = new Set(product.images.map((i) => i.url));
    const images = parsed.images.map((image) => ({ url: image.url, altText: image.altText })).filter((image) => !existingImageUrls.has(image.url));

    if (!commit) {
      return { data: { type: 'product' as const, rows, product: parsed.product, images, handleMatches }, message: 'Preview ready' };
    }

    await productModel.updateDetails(product.id, {
      ...parsed.product,
      ...(newHandle ? { handle: newHandle } : {}),
      sizes: unionSizes,
      colours: unionColours,
      ...(options.markVerified ? { verified: true } : {}),
    });

    // Insert new images first, so their ids are available to link into `Variant Image` rows below.
    const urlToImageId = new Map(product.images.map((i) => [i.url, i.id]));
    if (images.length > 0) {
      const createdImages = await productModel.addImages(
        product.id,
        images.map((image) => ({ url: image.url, altText: image.altText, colour: null }))
      );
      for (const created of createdImages) urlToImageId.set(created.url, created.id);
    }

    const { created, updated } = await prisma.$transaction(
      async (tx) => {
        const result = await upsertParsedProductVariants(tx, product.id, rows, urlToImageId);
        await tx.inventoryActivity.create({
          data: {
            supplierProductId: product.id,
            type: 'imported',
            message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'} (${result.created} created, ${result.updated} updated)`,
            actorId: session?.user?.id ?? null,
            actorName: session?.user?.name ?? session?.user?.email ?? 'Unknown',
          },
        });
        return result;
      },
      { timeout: 30_000 }
    );

    const updatedProduct = await productModel.findById(product.id);
    return { data: { product: updatedProduct, created, updated }, message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'}` };
  }
}
