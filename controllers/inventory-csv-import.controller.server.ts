import prisma from '@/lib/prisma.server';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { detectCsvType, parsePoCsv, parseShopifyProductCsv } from '@/lib/inventory/csv-import';
import type { ParsedPoRow } from '@/lib/inventory/csv-import';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import type { ColourOptionData, SupplierProductRow } from '@/models/supplier-product.model.server';
import { PurchaseOrderModel } from '@/models/purchase-order.model.server';
import { PurchaseOrderStatus, SupplierProductStatus } from '@prisma/client';

const productModel = new SupplierProductModel();
const poModel = new PurchaseOrderModel();
const PRODUCT_STATUS_VALUES = new Set<string>(Object.values(SupplierProductStatus));
const PO_STATUS_VALUES = new Set<string>(Object.values(PurchaseOrderStatus));
const NUMERIC_PO = /^PO-?(\d+)$/i;

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

function actorFromSession(session: Session) {
  return { id: session?.user?.id ?? null, name: session?.user?.name ?? session?.user?.email ?? 'Unknown' };
}

export class InventoryCsvImportController {
  async preview(supplierProductId: string, file: File, session: Session) {
    return this.process(supplierProductId, file, session, false);
  }

  async commit(supplierProductId: string, file: File, session: Session) {
    return this.process(supplierProductId, file, session, true);
  }

  private async process(supplierProductId: string, file: File, session: Session, commit: boolean) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const product = await productModel.findById(supplierProductId);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const text = await file.text();
    const type = detectCsvType(text);
    if (type === 'unknown') {
      return { error: { message: 'Unrecognized file — expected a Shopify product CSV or a purchase-order CSV', status: 400 } };
    }
    if (type === 'product') return this.processProductCsv(product, text, commit, session);
    return this.processPoCsv(product, text, commit, session);
  }

  /** Pricing (buying price, freight, margin, tax, exchange rate) is deliberately excluded here —
   * import only ever touches product details, images, and per-variant sku/barcode/stock/sell price.
   * itemNo is NOT imported: it's the hub's own style code, and the CSV's Handle is a Shopify URL
   * slug that can collide with another product's itemNo under the same supplier (unique constraint). */
  private async processProductCsv(product: SupplierProductRow, text: string, commit: boolean, session: Session) {
    const parsed = parseShopifyProductCsv(text);
    if (parsed.rows.length === 0) {
      return { error: { message: 'rows: No valid rows found — expected Option1 Value (Colour) and Option2 Value (Size) columns', status: 400 } };
    }

    // Normalise each row's colour/size to the existing casing. The variant's unique key is
    // case-sensitive, so a CSV value that differs only in case from the real variant record
    // would otherwise miss the lookup below and create a duplicate instead of updating it.
    const existingColourByLower = new Map(product.colours.map((c) => [c.name.toLowerCase(), c.name]));
    const existingSizeByLower = new Map(product.sizes.map((s) => [s.toLowerCase(), s]));
    const existingVariantColourByLower = new Map(product.variants.map((v) => [v.colour.toLowerCase(), v.colour]));
    const existingVariantSizeByLower = new Map(product.variants.map((v) => [v.size.toLowerCase(), v.size]));
    const rows = parsed.rows.map((row) => ({
      ...row,
      colour: existingVariantColourByLower.get(row.colour.toLowerCase()) ?? existingColourByLower.get(row.colour.toLowerCase()) ?? row.colour,
      size: existingVariantSizeByLower.get(row.size.toLowerCase()) ?? existingSizeByLower.get(row.size.toLowerCase()) ?? row.size,
    }));

    // Extend the product's declared sizes/colours to the union with what's being imported, so
    // reconcileVariants (inside updateDetails) creates the new combos instead of deleting them.
    const unionSizes = [...product.sizes];
    for (const row of rows) {
      if (!existingSizeByLower.has(row.size.toLowerCase())) {
        unionSizes.push(row.size);
        existingSizeByLower.set(row.size.toLowerCase(), row.size);
      }
    }
    const unionColours: ColourOptionData[] = [...product.colours];
    for (const row of rows) {
      if (!existingColourByLower.has(row.colour.toLowerCase())) {
        unionColours.push({ name: row.colour, color: deriveColorFromName(row.colour) });
        existingColourByLower.set(row.colour.toLowerCase(), row.colour);
      }
    }

    if (typeof parsed.product.status === 'string' && !PRODUCT_STATUS_VALUES.has(parsed.product.status)) {
      delete parsed.product.status;
    }

    // Dedup against existing images by (url, colour) — not url alone.
    const existingImageKeys = new Set(product.images.map((i) => `${i.url}::${i.colour ?? ''}`));
    const images = parsed.images
      .map((image) => ({ url: image.url, colour: image.colour ? existingColourByLower.get(image.colour.toLowerCase()) ?? image.colour : null }))
      .filter((image) => !existingImageKeys.has(`${image.url}::${image.colour ?? ''}`));

    if (!commit) {
      return { data: { type: 'product' as const, rows, product: parsed.product, images }, message: 'Preview ready' };
    }

    await productModel.updateDetails(product.id, { ...parsed.product, sizes: unionSizes, colours: unionColours });

    let created = 0;
    let updated = 0;
    await prisma.$transaction(
      async (tx) => {
        for (const row of rows) {
          const existing = await tx.supplierProductVariant.findUnique({
            where: { supplierProductId_colour_size: { supplierProductId: product.id, colour: row.colour, size: row.size } },
          });
          if (existing) {
            await tx.supplierProductVariant.update({
              where: { id: existing.id },
              data: {
                sku: row.sku,
                barcode: row.barcode,
                stockOnHand: row.stockOnHand,
                sellPrice: row.sellPrice,
                ...(row.buyPrice !== undefined && { buyPrice: row.buyPrice }),
              },
            });
            updated++;
          } else {
            await tx.supplierProductVariant.create({
              data: {
                supplierProductId: product.id,
                colour: row.colour,
                size: row.size,
                sku: row.sku,
                barcode: row.barcode,
                stockOnHand: row.stockOnHand,
                sellPrice: row.sellPrice,
                buyPrice: row.buyPrice ?? 0,
              },
            });
            created++;
          }
        }
        await tx.inventoryActivity.create({
          data: {
            supplierProductId: product.id,
            type: 'imported',
            message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'} (${created} created, ${updated} updated)`,
            actorId: session?.user?.id ?? null,
            actorName: session?.user?.name ?? session?.user?.email ?? 'Unknown',
          },
        });
      },
      { timeout: 30_000 }
    );

    if (images.length > 0) {
      await productModel.addImages(
        product.id,
        images.map((image) => ({ url: image.url, altText: null, colour: image.colour }))
      );
    }

    const updatedProduct = await productModel.findById(product.id);
    return { data: { product: updatedProduct, created, updated }, message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'}` };
  }

  /** Groups rows by PO Number: a numeric "PO-00042" cell must match a real, existing PO for this
   * product (import never fabricates a value in the DB's own autoincrement sequence); any other
   * label groups its rows into one brand-new PO. Every row must resolve to a real variant (by SKU,
   * falling back to Colour+Size) — PO import never creates a variant. All-or-nothing: any invalid
   * row rejects the whole file. */
  private async processPoCsv(product: SupplierProductRow, text: string, commit: boolean, session: Session) {
    const parsed = parsePoCsv(text);
    if (parsed.rows.length === 0) {
      return { error: { message: 'rows: No valid rows found — expected PO Number, Colour, Size and Quantity columns', status: 400 } };
    }

    const groupedRows = new Map<string, ParsedPoRow[]>();
    for (const row of parsed.rows) {
      const list = groupedRows.get(row.poNumber) ?? [];
      list.push(row);
      groupedRows.set(row.poNumber, list);
    }

    const variantBySku = new Map(product.variants.filter((v) => v.sku).map((v) => [v.sku!.toLowerCase(), v]));
    const variantByColourSize = new Map(product.variants.map((v) => [`${v.colour.toLowerCase()}::${v.size.toLowerCase()}`, v]));

    type ResolvedItem = { variantId: string; variantTitle: string; sku: string | null; quantity: number; receivedQuantity: number; unitCost: number | null };
    type ResolvedGroup = {
      poNumber: string;
      existingId: string | null;
      status?: PurchaseOrderStatus;
      deliveryDate?: Date;
      remark?: string;
      items: ResolvedItem[];
    };

    const errors: string[] = [];
    const groups: ResolvedGroup[] = [];

    for (const [poNumber, rows] of groupedRows) {
      let existingId: string | null = null;
      const numericMatch = poNumber.match(NUMERIC_PO);
      if (numericMatch) {
        const existing = await poModel.findByNumber(parseInt(numericMatch[1], 10));
        if (!existing) {
          errors.push(`${poNumber}: No purchase order with this number exists`);
          continue;
        }
        if (existing.supplierProductId !== product.id) {
          errors.push(`${poNumber}: This purchase order belongs to a different product`);
          continue;
        }
        existingId = existing.id;
      }

      const first = rows[0];
      let status: PurchaseOrderStatus | undefined;
      if (first.status) {
        const upper = first.status.toUpperCase();
        if (PO_STATUS_VALUES.has(upper)) status = upper as PurchaseOrderStatus;
        else errors.push(`${poNumber}: Invalid status "${first.status}"`);
      }

      let deliveryDate: Date | undefined;
      if (first.deliveryDate) {
        const parsedDate = new Date(first.deliveryDate);
        if (Number.isNaN(parsedDate.getTime())) errors.push(`${poNumber}: Invalid delivery date "${first.deliveryDate}"`);
        else deliveryDate = parsedDate;
      }

      const items: ResolvedItem[] = [];
      for (const row of rows) {
        const variant = (row.sku && variantBySku.get(row.sku.toLowerCase())) || variantByColourSize.get(`${row.colour.toLowerCase()}::${row.size.toLowerCase()}`);
        if (!variant) {
          errors.push(`${poNumber}: No variant found for ${row.sku || `${row.colour} / ${row.size}`}`);
          continue;
        }
        if (!Number.isFinite(row.quantity) || row.quantity < 0) {
          errors.push(`${poNumber}: Invalid quantity for ${variant.colour} / ${variant.size}`);
          continue;
        }
        items.push({
          variantId: variant.id,
          variantTitle: `${variant.colour} / ${variant.size}`,
          sku: variant.sku,
          quantity: Math.trunc(row.quantity),
          receivedQuantity: row.receivedQuantity !== undefined ? Math.trunc(row.receivedQuantity) : 0,
          unitCost: row.unitCost ?? null,
        });
      }

      groups.push({ poNumber, existingId, status, deliveryDate, remark: first.remark, items });
    }

    if (errors.length > 0) return { error: { message: 'Validation failed', errors, status: 400 } };

    if (!commit) {
      return {
        data: {
          type: 'po' as const,
          groups: groups.map((g) => ({ poNumber: g.poNumber, isNew: !g.existingId, status: g.status, deliveryDate: g.deliveryDate?.toISOString(), remark: g.remark, items: g.items })),
        },
        message: 'Preview ready',
      };
    }

    const actor = actorFromSession(session);
    let supplierInfo: { id: string; name: string; poEmail: string } | null = null;
    let poCreated = 0;
    let poUpdated = 0;

    for (const group of groups) {
      let poId = group.existingId;
      if (poId) {
        poUpdated++;
      } else {
        if (!supplierInfo) {
          supplierInfo = await prisma.supplier.findUnique({ where: { id: product.supplierId }, select: { id: true, name: true, poEmail: true } });
          if (!supplierInfo) return { error: { message: 'This product has no supplier configured', status: 400 } };
        }
        const created = await poModel.create({
          supplierId: supplierInfo.id,
          supplierName: supplierInfo.name,
          poEmail: supplierInfo.poEmail,
          supplierProductId: product.id,
          productTitle: product.name,
          deliveryDate: group.deliveryDate ?? null,
          remark: group.remark ?? null,
          createdById: actor.id ?? '',
          createdByName: actor.name,
          items: [],
        });
        poId = created.id;
        poCreated++;
      }

      await poModel.updateFields(poId, {
        ...(group.status && { status: group.status }),
        ...(group.deliveryDate !== undefined && { deliveryDate: group.deliveryDate }),
        ...(group.remark !== undefined && { remark: group.remark }),
      });
      await poModel.upsertItems(poId, group.items);
    }

    const updatedProduct = await productModel.findById(product.id);
    return {
      data: { product: updatedProduct, poCreated, poUpdated },
      message: `Imported ${groups.length} purchase order${groups.length === 1 ? '' : 's'}`,
    };
  }
}
