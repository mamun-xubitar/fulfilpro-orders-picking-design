import prisma from '@/lib/prisma.server';
import { SupplierProductModel } from '@/models/supplier-product.model.server';
import type { ColourOptionData } from '@/models/supplier-product.model.server';
import { SupplierProductStatus } from '@prisma/client';

const model = new SupplierProductModel();
const STATUS_VALUES = new Set<string>(Object.values(SupplierProductStatus));
/** Matches the default swatch used everywhere else a colour is created without a chosen hex
 * (ProductColoursField's NEW_COLOUR, the matrix toolbar's "Add colour" modal). */
const NEW_COLOUR_HEX = '#cbd5e1';

type Session = { user?: { id?: string | null; name?: string | null; email?: string | null; role?: string | null } | null } | null;
type ImportRow = { colour: string; size: string; sku: string | null; barcode: string | null; stockOnHand: number; buyPrice?: number; sellPrice: number; trigger?: number };
/** Pricing (buying price, freight, margin, tax, exchange rate) is deliberately excluded here —
 * import only ever touches product details, images, and per-variant sku/barcode/stock/sell price.
 * itemNo is NOT imported: it's the hub's own style code, and the CSV's Handle is a Shopify URL
 * slug that can collide with another product's itemNo under the same supplier (unique constraint). */
type ImportProductFields = { name?: string; description?: string; brand?: string; category?: string; status?: SupplierProductStatus };
type ImportImage = { url: string; colour: string | null };

function isAdmin(session: Session) {
  return session?.user?.role === 'admin';
}

export class InventoryImportController {
  async importVariants(supplierProductId: string, body: unknown, session: Session) {
    if (!isAdmin(session)) return { error: { message: 'Forbidden', status: 403 } };
    const product = await model.findById(supplierProductId);
    if (!product) return { error: { message: 'Product not found', status: 404 } };

    const value = (body ?? {}) as Record<string, unknown>;
    const rawRows = Array.isArray(value.rows) ? value.rows : [];

    const rows: ImportRow[] = [];
    for (const raw of rawRows) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as Record<string, unknown>;
      const colour = typeof r.colour === 'string' ? r.colour.trim() : '';
      const size = typeof r.size === 'string' ? r.size.trim() : '';
      if (!colour || !size) continue;
      rows.push({
        colour,
        size,
        sku: typeof r.sku === 'string' && r.sku.trim() ? r.sku.trim() : null,
        barcode: typeof r.barcode === 'string' && r.barcode.trim() ? r.barcode.trim() : null,
        stockOnHand: Number.isFinite(Number(r.stockOnHand)) ? Math.max(0, Math.trunc(Number(r.stockOnHand))) : 0,
        buyPrice: r.buyPrice !== undefined && Number.isFinite(Number(r.buyPrice)) ? Number(r.buyPrice) : undefined,
        sellPrice: Number.isFinite(Number(r.sellPrice)) ? Number(r.sellPrice) : 0,
        trigger: r.trigger !== undefined && Number.isFinite(Number(r.trigger)) ? Math.max(0, Math.trunc(Number(r.trigger))) : undefined,
      });
    }
    if (rows.length === 0) return { error: { message: 'rows: No valid rows to import', status: 400 } };

    // Normalise each row's colour/size to the existing casing. The variant's unique key is
    // case-sensitive, so a CSV value that differs only in case from the real variant record
    // (e.g. "Black" vs. a variant stored as "black") would otherwise miss the findUnique lookup
    // below and create a duplicate variant instead of updating the one already on screen.
    // Checked against the actual variant rows first — not just the declared colours/sizes
    // palette, which can drift from them (e.g. after a direct per-variant edit) — falling back
    // to the palette so a genuinely new colour/size still matches the palette's own casing.
    const existingColourByLower = new Map(product.colours.map((c) => [c.name.toLowerCase(), c.name]));
    const existingSizeByLower = new Map(product.sizes.map((s) => [s.toLowerCase(), s]));
    const existingVariantColourByLower = new Map(product.variants.map((v) => [v.colour.toLowerCase(), v.colour]));
    const existingVariantSizeByLower = new Map(product.variants.map((v) => [v.size.toLowerCase(), v.size]));
    for (const row of rows) {
      row.colour = existingVariantColourByLower.get(row.colour.toLowerCase()) ?? existingColourByLower.get(row.colour.toLowerCase()) ?? row.colour;
      row.size = existingVariantSizeByLower.get(row.size.toLowerCase()) ?? existingSizeByLower.get(row.size.toLowerCase()) ?? row.size;
    }

    // Extend the product's declared sizes/colours to the union with what's being imported, so
    // reconcileVariants (which runs inside updateDetails below) creates the new combos instead of
    // deleting them the next time product details are saved — this always runs, even when the
    // "update product details" checkbox was left off, because it only ever adds to the arrays.
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
        unionColours.push({ name: row.colour, hex: NEW_COLOUR_HEX });
        existingColourByLower.set(row.colour.toLowerCase(), row.colour);
      }
    }

    const productFieldsRaw = value.product && typeof value.product === 'object' ? (value.product as Record<string, unknown>) : null;
    const productFields: ImportProductFields = {};
    if (productFieldsRaw) {
      if (typeof productFieldsRaw.name === 'string' && productFieldsRaw.name.trim()) productFields.name = productFieldsRaw.name.trim();
      if (typeof productFieldsRaw.description === 'string' && productFieldsRaw.description.trim()) productFields.description = productFieldsRaw.description;
      if (typeof productFieldsRaw.brand === 'string' && productFieldsRaw.brand.trim()) productFields.brand = productFieldsRaw.brand.trim();
      if (typeof productFieldsRaw.category === 'string' && productFieldsRaw.category.trim()) productFields.category = productFieldsRaw.category.trim();
      if (typeof productFieldsRaw.status === 'string' && STATUS_VALUES.has(productFieldsRaw.status)) productFields.status = productFieldsRaw.status as SupplierProductStatus;
    }

    // Dedup against existing images by (url, colour) — not url alone — so a colour that
    // already has its image is skipped while other colourways sharing the same URL still
    // get theirs (mirrors the client-side parser in useImportExport).
    const existingImageKeys = new Set(product.images.map((i) => `${i.url}::${i.colour ?? ''}`));
    const images: ImportImage[] = [];
    for (const raw of Array.isArray(value.images) ? value.images : []) {
      if (!raw || typeof raw !== 'object') continue;
      const i = raw as Record<string, unknown>;
      const url = typeof i.url === 'string' ? i.url.trim() : '';
      if (!url) continue;
      const colourRaw = typeof i.colour === 'string' ? i.colour.trim() : '';
      const colour = colourRaw ? (existingColourByLower.get(colourRaw.toLowerCase()) ?? colourRaw) : null;
      const key = `${url}::${colour ?? ''}`;
      if (existingImageKeys.has(key)) continue;
      existingImageKeys.add(key);
      images.push({ url, colour });
    }

    // 1. Product details + the extended sizes/colours.
    await model.updateDetails(supplierProductId, { ...productFields, sizes: unionSizes, colours: unionColours });

    // 2. Variant rows — upsert by the (now-normalised) colour/size key.
    let created = 0;
    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const existing = await tx.supplierProductVariant.findUnique({
          where: { supplierProductId_colour_size: { supplierProductId, colour: row.colour, size: row.size } },
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
              ...(row.trigger !== undefined && { trigger: row.trigger }),
            },
          });
          updated++;
        } else {
          await tx.supplierProductVariant.create({
            data: {
              supplierProductId,
              colour: row.colour,
              size: row.size,
              sku: row.sku,
              barcode: row.barcode,
              stockOnHand: row.stockOnHand,
              sellPrice: row.sellPrice,
              buyPrice: row.buyPrice ?? 0,
              trigger: row.trigger ?? 0,
            },
          });
          created++;
        }
      }
      await tx.inventoryActivity.create({
        data: {
          supplierProductId,
          type: 'imported',
          message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'} (${created} created, ${updated} updated)`,
          actorId: session?.user?.id ?? null,
          actorName: session?.user?.name ?? session?.user?.email ?? 'Unknown',
        },
      });
    }, { timeout: 30_000 });

    // 3. Images.
    if (images.length > 0) {
      await model.addImages(
        supplierProductId,
        images.map((image) => ({ url: image.url, altText: null, colour: image.colour }))
      );
    }

    const updatedProduct = await model.findById(supplierProductId);
    return { data: { product: updatedProduct, created, updated }, message: `Imported ${rows.length} row${rows.length === 1 ? '' : 's'}` };
  }
}
