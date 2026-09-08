import prisma from '@/lib/prisma.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { detectCsvType, findIncompleteAxisRows, normalizeParsedProductRows, parseShopifyProductCsv, upsertParsedProductVariants } from '@/lib/inventory/csv-import';
import type { ParsedProductGroup } from '@/lib/inventory/csv-import';
import { uniqueHandle } from '@/lib/inventory/handle';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import type { ColourOptionData, SupplierProductRow } from '@/models/supplier-product.model.server';
import { Prisma, SupplierProductStatus } from '@prisma/client';

const productModel = new SupplierProductModel();
const PRODUCT_STATUS_VALUES = new Set<string>(Object.values(SupplierProductStatus));

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export type ProductImportPreviewGroup = {
  handle: string;
  title: string;
  variantCount: number;
  imageCount: number;
  /** Whether a product with this handle already exists — the client derives create/update/skip
   * from this plus the live "Overwrite" checkbox state, so toggling it never needs a re-preview. */
  exists: boolean;
};

type ProductImportOptions = { overwrite: boolean; markVerified: boolean };

/** Bulk "Import products" — creates one SupplierProduct per Handle group in a (possibly
 * multi-product) Shopify product CSV, all under one chosen supplier. A handle that already
 * exists is skipped unless `overwrite` is set, in which case that product is updated in place
 * instead (same behaviour as the single-product "Import Product/PO CSV", just for many products
 * at once). */
export class InventoryProductImportController {
  async preview(file: File, supplierId: string, session: Session, options: ProductImportOptions) {
    return this.process(file, supplierId, session, false, options);
  }

  async commit(file: File, supplierId: string, session: Session, options: ProductImportOptions) {
    return this.process(file, supplierId, session, true, options);
  }

  private async process(file: File, supplierId: string, session: Session, commit: boolean, options: ProductImportOptions) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } });
    if (!supplier) return { error: { message: 'supplierId: Supplier not found', status: 404 } };

    const text = await file.text();
    const type = detectCsvType(text);
    if (type !== 'product') {
      return { error: { message: 'Unrecognized file — expected a Shopify product CSV', status: 400 } };
    }

    const groups = parseShopifyProductCsv(text);
    if (groups.length === 0) {
      return { error: { message: 'rows: No product rows found in this file', status: 400 } };
    }

    const existingByHandle = new Map((await prisma.supplierProduct.findMany({ select: { id: true, handle: true } })).map((r) => [r.handle, r.id]));

    if (!commit) {
      const preview: ProductImportPreviewGroup[] = groups.map((g) => ({
        handle: g.handle,
        title: g.product.name || g.handle,
        variantCount: g.rows.length,
        imageCount: g.images.length,
        exists: existingByHandle.has(g.handle),
      }));
      return { data: { groups: preview }, message: 'Preview ready' };
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default' },
      select: { globalMarginPercent: true, globalExchangeRate: true },
    });
    // itemNo is globally unique now, not scoped per supplier.
    const takenItemNos = new Set((await prisma.supplierProduct.findMany({ select: { itemNo: true } })).map((r) => r.itemNo));

    const actor = { id: session?.user?.id ?? null, name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
    const created: SupplierProductRow[] = [];
    const updated: SupplierProductRow[] = [];
    const skipped: string[] = [];
    // Handle + reason for groups skipped due to a malformed row (blank Colour/Size where the
    // product declares that axis) — kept separate from plain "already exists"/"empty" skips so
    // the toast can tell the admin exactly what to fix, rather than just a bare count.
    const invalidReasons: string[] = [];

    for (const group of groups) {
      const existingId = existingByHandle.get(group.handle);
      if (existingId) {
        if (!options.overwrite) {
          skipped.push(group.handle);
          continue;
        }
        const existingProduct = await productModel.findById(existingId);
        if (!existingProduct || group.rows.length === 0) {
          skipped.push(group.handle);
          continue;
        }
        const normalized = normalizeParsedProductRows(existingProduct, group.rows);
        const axisErrors = findIncompleteAxisRows(
          normalized.rows,
          normalized.unionColours.map((c) => c.name),
          normalized.unionSizes
        );
        if (axisErrors.length > 0) {
          skipped.push(group.handle);
          invalidReasons.push(`${group.handle}: ${axisErrors[0]}`);
          continue;
        }
        await this.updateProductFromGroup(existingProduct, group, normalized, actor, options.markVerified);
        const product = await productModel.findById(existingId);
        if (product) updated.push(product);
        continue;
      }

      if (group.rows.length === 0) {
        skipped.push(group.handle);
        continue;
      }
      const createAxisErrors = findIncompleteAxisRows(group.rows, group.colours, group.sizes);
      if (createAxisErrors.length > 0) {
        skipped.push(group.handle);
        invalidReasons.push(`${group.handle}: ${createAxisErrors[0]}`);
        continue;
      }
      // Guard against the same handle appearing twice in one file — findById('pending') below
      // resolves to nothing, so a repeat is safely skipped rather than hitting the DB's unique
      // constraint on a second create.
      existingByHandle.set(group.handle, 'pending');

      const itemNo = uniqueHandle(group.handle, takenItemNos);
      takenItemNos.add(itemNo);

      const productId = await this.createProductFromGroup(group, itemNo, supplierId, settings, actor, options.markVerified);
      const product = await productModel.findById(productId);
      if (product) created.push(product);
    }

    const parts = [`${created.length} product${created.length === 1 ? '' : 's'} created`];
    if (updated.length) parts.push(`${updated.length} updated`);
    if (skipped.length) parts.push(`${skipped.length} skipped`);
    if (invalidReasons.length > 0) {
      const shown = invalidReasons.slice(0, 3).join('; ');
      parts.push(`${invalidReasons.length} invalid (${shown}${invalidReasons.length > 3 ? `, +${invalidReasons.length - 3} more` : ''})`);
    }

    return {
      data: { created, updated, createdCount: created.length, updatedCount: updated.length, skipped },
      message: parts.join(', '),
    };
  }

  /** Updates an existing product from its matching CSV group — details, new images, and a
   * per-row variant upsert — mirroring `InventoryCsvImportController.processProductCsv`'s commit
   * path for the single-product import, just without the handle-adoption case (the handle is
   * already the match key here). `normalized` is precomputed by the caller so its own
   * axis-completeness check (`findIncompleteAxisRows`) and this write share one
   * `normalizeParsedProductRows` call instead of running it twice. */
  private async updateProductFromGroup(
    product: SupplierProductRow,
    group: ParsedProductGroup,
    normalized: ReturnType<typeof normalizeParsedProductRows>,
    actor: { id: string | null; name: string },
    markVerified: boolean
  ) {
    const { rows, unionSizes, unionColours } = normalized;
    const status = group.product.status && PRODUCT_STATUS_VALUES.has(group.product.status) ? (group.product.status as SupplierProductStatus) : undefined;

    await productModel.updateDetails(product.id, {
      ...group.product,
      ...(status ? { status } : {}),
      sizes: unionSizes,
      colours: unionColours,
      ...(markVerified ? { verified: true } : {}),
    });

    const existingImageUrls = new Set(product.images.map((i) => i.url));
    const newImages = group.images.filter((image) => !existingImageUrls.has(image.url));
    const urlToImageId = new Map(product.images.map((i) => [i.url, i.id]));
    if (newImages.length > 0) {
      const createdImages = await productModel.addImages(
        product.id,
        newImages.map((image) => ({ url: image.url, altText: image.altText, colour: null }))
      );
      for (const createdImage of createdImages) urlToImageId.set(createdImage.url, createdImage.id);
    }

    await prisma.$transaction(
      async (tx) => {
        const result = await upsertParsedProductVariants(tx, product.id, rows, urlToImageId);
        await tx.inventoryActivity.create({
          data: {
            supplierProductId: product.id,
            type: 'imported',
            message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'} (${result.created} created, ${result.updated} updated)`,
            actorId: actor.id,
            actorName: actor.name,
          },
        });
      },
      { timeout: 30_000 }
    );
  }

  /** Creates one product, its image pool, and its variants (linked to their `Variant Image`
   * where set) in a single transaction, so a group is all-or-nothing. */
  private async createProductFromGroup(
    group: ParsedProductGroup,
    itemNo: string,
    supplierId: string,
    settings: { globalMarginPercent: Prisma.Decimal; globalExchangeRate: Prisma.Decimal },
    actor: { id: string | null; name: string },
    markVerified: boolean
  ): Promise<string> {
    const colours: ColourOptionData[] = group.colours.map((name) => ({ name, color: deriveColorFromName(name) }));
    const status = group.product.status && PRODUCT_STATUS_VALUES.has(group.product.status) ? (group.product.status as SupplierProductStatus) : 'DRAFT';

    return prisma.$transaction(
      async (tx) => {
        const row = await tx.supplierProduct.create({
          data: {
            itemNo,
            handle: group.handle,
            name: group.product.name || group.handle,
            brand: group.product.brand || null,
            category: group.product.category || null,
            description: group.product.description || null,
            sku: itemNo,
            status,
            verified: markVerified,
            sizes: group.sizes,
            colours: colours as unknown as Prisma.InputJsonValue,
            pricing: { create: { currencyCode: 'USD', exchangeRate: Number(settings.globalExchangeRate), marginPercent: Number(settings.globalMarginPercent) } },
            // Bug fix: CSV-imported products previously got the supplierId column set but no
            // SupplierProductSupplier link, making them invisible to Products Count and to the
            // products-table supplier filter.
            supplierLinks: { create: { supplierId } },
          },
        });

        const imageRows =
          group.images.length > 0
            ? await tx.supplierProductImage.createManyAndReturn({
                data: group.images.map((image, index) => ({ supplierProductId: row.id, url: image.url, altText: image.altText, colour: null, position: index })),
                select: { id: true, url: true },
              })
            : [];
        const urlToImageId = new Map(imageRows.map((image) => [image.url, image.id]));

        for (const variantRow of group.rows) {
          const imageId = variantRow.imageUrl ? urlToImageId.get(variantRow.imageUrl) : undefined;
          await tx.supplierProductVariant.create({
            data: {
              supplierProductId: row.id,
              colour: variantRow.colour,
              size: variantRow.size,
              sku: variantRow.sku || null,
              barcode: variantRow.barcode || null,
              stockOnHand: variantRow.stockOnHand,
              sellPrice: variantRow.sellPrice,
              buyPrice: variantRow.buyPrice ?? 0,
              ...(imageId !== undefined && { imageId }),
            },
          });
        }

        await tx.inventoryActivity.create({
          data: { supplierProductId: row.id, type: 'imported', message: `Product "${row.name}" imported`, actorId: actor.id, actorName: actor.name },
        });

        return row.id;
      },
      { timeout: 30_000 }
    );
  }
}
