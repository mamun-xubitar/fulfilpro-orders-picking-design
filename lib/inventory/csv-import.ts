import { parse } from 'csv-parse/sync';
import { deriveColorFromName } from '@/lib/inventory/colour';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { Prisma } from '@prisma/client';
import { setVariantTotal } from '@/lib/inventory-stock.server';

export type DetectedFileType = 'product' | 'po' | 'unknown';

/** Reads just the header row, lowercased and trimmed, to decide which importer applies. */
function readHeader(text: string): string[] {
  const rows = parse(text, { bom: true, trim: true, to: 1 }) as string[][];
  return (rows[0] ?? []).map((h) => h.trim().toLowerCase());
}

/** `PO Number` is the unique signature of our own PO CSV. `Handle` plus any Shopify variant
 * column is a product CSV — `Variant SKU` is often blank (e.g. a single-option product with no
 * SKUs entered yet), so any one of these three is enough rather than requiring all three. */
export function detectCsvType(text: string): DetectedFileType {
  const header = readHeader(text);
  if (header.includes('po number')) return 'po';
  if (header.includes('handle') && (header.includes('variant sku') || header.includes('option1 value') || header.includes('variant price'))) return 'product';
  return 'unknown';
}

function parseRecords(text: string): Record<string, string>[] {
  return parse(text, {
    bom: true,
    trim: true,
    skip_empty_lines: true,
    columns: (headerRow: string[]) => headerRow.map((h) => h.trim().toLowerCase()),
  }) as Record<string, string>[];
}

export type ParsedProductRow = {
  /** '' when the product has no colour axis. */
  colour: string;
  /** '' when the product has no size axis. */
  size: string;
  sku: string;
  barcode: string;
  stockOnHand: number;
  buyPrice?: number;
  sellPrice: number;
  /** The row's `Variant Image` URL, resolved against `images` at commit time. Null when unset. */
  imageUrl: string | null;
};

/** Pricing (buying price, freight, margin, tax) is deliberately excluded — import only ever
 * touches product details, images, and per-variant sku/barcode/stock/sell price. */
export type ParsedProductFields = {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  status?: 'ACTIVE' | 'DRAFT';
};

export type ParsedProductImage = { url: string; position: number; altText: string | null; colour: string | null };

/** One Shopify `Handle` group — i.e. one product — parsed out of a (possibly multi-product) CSV. */
export type ParsedProductGroup = {
  handle: string;
  product: ParsedProductFields;
  /** Distinct colour values, in first-seen order. */
  colours: string[];
  /** Distinct size values, in first-seen order. */
  sizes: string[];
  rows: ParsedProductRow[];
  images: ParsedProductImage[];
};

type AxisRole = 'colour' | 'size' | null;

/** Reads Option1/Option2 Name and assigns each to the colour or size axis. `colou?r`/`size`
 * (case-insensitive) map directly; any other real name (not blank, not "Title" — Shopify's
 * marker for a product with no real options) takes the first still-free axis, so a custom
 * option name like "Choose Variant" still lands somewhere sensible. */
function classifyAxes(names: (string | undefined)[]): AxisRole[] {
  const roles: AxisRole[] = names.map(() => null);
  const assigned = new Set<AxisRole>();

  names.forEach((raw, i) => {
    const name = (raw ?? '').trim().toLowerCase();
    if (/^colou?r$/.test(name)) {
      roles[i] = 'colour';
      assigned.add('colour');
    } else if (name === 'size') {
      roles[i] = 'size';
      assigned.add('size');
    }
  });

  names.forEach((raw, i) => {
    if (roles[i] !== null) return;
    const name = (raw ?? '').trim().toLowerCase();
    if (!name || name === 'title') return;
    if (!assigned.has('colour')) {
      roles[i] = 'colour';
      assigned.add('colour');
    } else if (!assigned.has('size')) {
      roles[i] = 'size';
      assigned.add('size');
    }
  });

  return roles;
}

function buildGroup(handle: string, records: Record<string, string>[]): ParsedProductGroup {
  const get = (record: Record<string, string>, name: string) => record[name]?.trim() ?? '';

  // Option names are written once per group (Shopify's convention is the group's first row),
  // so the first non-empty value for each slot wins.
  let name1: string | undefined;
  let name2: string | undefined;
  for (const record of records) {
    if (name1 === undefined && get(record, 'option1 name')) name1 = get(record, 'option1 name');
    if (name2 === undefined && get(record, 'option2 name')) name2 = get(record, 'option2 name');
  }
  const [role1, role2] = classifyAxes([name1, name2]);

  const product: ParsedProductFields = {};
  for (const record of records) {
    if (product.name === undefined && get(record, 'title')) product.name = get(record, 'title');
    if (product.description === undefined && get(record, 'body (html)')) product.description = sanitizeHtml(get(record, 'body (html)'));
    if (product.brand === undefined && get(record, 'vendor')) product.brand = get(record, 'vendor');
    if (product.category === undefined && get(record, 'product category')) product.category = get(record, 'product category');
    if (product.status === undefined && get(record, 'published')) product.status = get(record, 'published').toUpperCase() === 'TRUE' ? 'ACTIVE' : 'DRAFT';
  }

  // A file with no `Variant Image` column at all (a simple one-image-per-row export, unlike our
  // own — which always writes a `Variant Image` cell, empty or not, for every linked/unlinked
  // row) falls back to each row's own `Image Src` for the variant link below. Gating on the
  // column being entirely absent — rather than per-row — avoids mislinking a row that's
  // genuinely unlinked in a file (like ours) that does track `Variant Image` explicitly.
  const hasVariantImageColumn = records.some((record) => get(record, 'variant image'));

  const seenImageUrls = new Set<string>();
  const images: ParsedProductImage[] = [];
  const colours: string[] = [];
  const seenColours = new Set<string>();
  const sizes: string[] = [];
  const seenSizes = new Set<string>();
  const rows: ParsedProductRow[] = [];
  let anyAxisValue = false;
  let firstRowFields: ParsedProductRow | null = null;

  records.forEach((record, index) => {
    const opt1 = get(record, 'option1 value');
    const opt2 = get(record, 'option2 value');
    const opt3 = get(record, 'option3 value');

    let colour = role1 === 'colour' ? opt1 : role2 === 'colour' ? opt2 : '';
    let size = role1 === 'size' ? opt1 : role2 === 'size' ? opt2 : '';
    // Shopify has no third axis of its own — fold Option3 Value into the size string so the
    // combo stays unique and round-trips, instead of dropping it.
    if (opt3) size = size ? `${size} / ${opt3}` : opt3;
    // A literal "Default Title" (written under an Option Name of "Title" for products with no
    // real options) means "no axis", not a colour/size value of "Default Title".
    if (colour.toLowerCase() === 'default title') colour = '';
    if (size.toLowerCase() === 'default title') size = '';

    const hasAxisValue = !!(colour || size);
    if (hasAxisValue) anyAxisValue = true;

    const imageSrc = get(record, 'image src');
    if (imageSrc && !seenImageUrls.has(imageSrc)) {
      seenImageUrls.add(imageSrc);
      const position = Number(get(record, 'image position')) || images.length + 1;
      // Images are variant-linked (via `Variant Image` / `imageUrl` below), not colour-tagged.
      images.push({ url: imageSrc, position, altText: get(record, 'image alt text') || null, colour: null });
    }

    const costPerItem = get(record, 'cost per item');
    const variantImage = get(record, 'variant image');
    const rowData: ParsedProductRow = {
      colour,
      size,
      sku: get(record, 'variant sku'),
      barcode: get(record, 'variant barcode') || get(record, 'variant barcodes'),
      stockOnHand: Number(get(record, 'variant inventory qty')) || 0,
      buyPrice: costPerItem !== '' && Number.isFinite(Number(costPerItem)) ? Number(costPerItem) : undefined,
      sellPrice: Number(get(record, 'variant price')) || 0,
      imageUrl: variantImage || (!hasVariantImageColumn && imageSrc) || null,
    };
    if (index === 0) firstRowFields = rowData;

    if (hasAxisValue) {
      rows.push(rowData);
      if (colour && !seenColours.has(colour.toLowerCase())) {
        seenColours.add(colour.toLowerCase());
        colours.push(colour);
      }
      if (size && !seenSizes.has(size.toLowerCase())) {
        seenSizes.add(size.toLowerCase());
        sizes.push(size);
      }
    }
  });

  // No row ever carried an option value — a single "Default Title" variant, taking its
  // sku/price/stock from the group's first row.
  if (!anyAxisValue && firstRowFields) rows.push(firstRowFields);

  // Image Position is the gallery order; rows needn't list images in that order.
  images.sort((a, b) => a.position - b.position);

  return { handle, product, colours, sizes, rows, images };
}

/** Reads the Shopify product-CSV format (also produced by buildShopifyProductCsv, so an
 * exported file can be re-imported directly), grouped by Handle — a file may describe more than
 * one product. Colour and size roles come from Option1/Option2 Name rather than a fixed
 * position, so a colour-only, size-only, or "Default Title" (no options) product all parse to a
 * group with the axes it actually has, instead of being dropped for missing the other one. */
export function parseShopifyProductCsv(text: string): ParsedProductGroup[] {
  const records = parseRecords(text);
  const order: string[] = [];
  const byHandle = new Map<string, Record<string, string>[]>();

  for (const record of records) {
    const handle = record['handle']?.trim() ?? '';
    if (!handle) continue; // Shopify always writes Handle on every row; skip a stray blank row defensively
    if (!byHandle.has(handle)) {
      byHandle.set(handle, []);
      order.push(handle);
    }
    byHandle.get(handle)!.push(record);
  }

  return order.map((handle) => buildGroup(handle, byHandle.get(handle)!));
}

/** An existing product's colour/size vocabulary, in the shape both import controllers already
 * carry it in (`SupplierProductRow` and its variants) — kept minimal here so this module doesn't
 * need to import the Prisma-backed model type. */
export type ExistingProductAxes = {
  sizes: string[];
  colours: { name: string; color: string }[];
  variants: { colour: string; size: string }[];
};

/**
 * Normalises each parsed row's colour/size to the existing casing on the product — the variant's
 * unique key is case-sensitive, so a CSV value differing only in case from the real record would
 * otherwise miss the lookup and create a duplicate instead of updating it — and extends the
 * product's declared sizes/colours to the union with what's being imported (never the ''
 * "no axis" sentinel), so a reconcile step downstream creates the new combos instead of deleting
 * them. Shared by both the single-product and bulk product importers.
 */
export function normalizeParsedProductRows(existing: ExistingProductAxes, parsedRows: ParsedProductRow[]) {
  const existingColourByLower = new Map(existing.colours.map((c) => [c.name.toLowerCase(), c.name]));
  const existingSizeByLower = new Map(existing.sizes.map((s) => [s.toLowerCase(), s]));
  const existingVariantColourByLower = new Map(existing.variants.map((v) => [v.colour.toLowerCase(), v.colour]));
  const existingVariantSizeByLower = new Map(existing.variants.map((v) => [v.size.toLowerCase(), v.size]));

  const rows = parsedRows.map((row) => ({
    ...row,
    colour: row.colour ? existingVariantColourByLower.get(row.colour.toLowerCase()) ?? existingColourByLower.get(row.colour.toLowerCase()) ?? row.colour : '',
    size: row.size ? existingVariantSizeByLower.get(row.size.toLowerCase()) ?? existingSizeByLower.get(row.size.toLowerCase()) ?? row.size : '',
  }));

  const unionSizes = [...existing.sizes];
  for (const row of rows) {
    if (row.size && !existingSizeByLower.has(row.size.toLowerCase())) {
      unionSizes.push(row.size);
      existingSizeByLower.set(row.size.toLowerCase(), row.size);
    }
  }
  const unionColours: { name: string; color: string }[] = [...existing.colours];
  for (const row of rows) {
    if (row.colour && !existingColourByLower.has(row.colour.toLowerCase())) {
      unionColours.push({ name: row.colour, color: deriveColorFromName(row.colour) });
      existingColourByLower.set(row.colour.toLowerCase(), row.colour);
    }
  }

  return { rows, unionSizes, unionColours };
}

/**
 * A row is only valid against a declared axis if it actually carries a value on that axis — a
 * blank `colour` (or `size`) on one row while the product/group otherwise has that axis declared
 * is exactly the malformed shape Shopify's own CSV importer rejects with "Each variant must have
 * exactly one option value for each product option." Call with the *union* axes a row is about to
 * be reconciled against (post `normalizeParsedProductRows`) — a row importing the product's first
 * ever colour or size doesn't count as "declared" until it's in that union. Returns one message
 * per incomplete row, `[]` when every row is complete.
 */
export function findIncompleteAxisRows(rows: ParsedProductRow[], colours: string[], sizes: string[]): string[] {
  const describe = (row: ParsedProductRow) => row.sku || [row.colour, row.size].filter(Boolean).join(' / ') || 'a row';
  const errors: string[] = [];
  for (const row of rows) {
    if (colours.length > 0 && !row.colour) errors.push(`${describe(row)}: missing a Colour value`);
    if (sizes.length > 0 && !row.size) errors.push(`${describe(row)}: missing a Size value`);
  }
  return errors;
}

/**
 * Upserts one variant row per CSV row against an existing product, in a single transaction so
 * the import is all-or-nothing. Shared by both product importers' "overwrite an existing
 * product" path.
 */
export async function upsertParsedProductVariants(
  tx: Prisma.TransactionClient,
  supplierProductId: string,
  rows: ReturnType<typeof normalizeParsedProductRows>['rows'],
  urlToImageId: Map<string, string>
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  // New variants follow the CSV row order, after any the product already has.
  const maxPosition = await tx.supplierProductVariant.aggregate({ where: { supplierProductId }, _max: { position: true } });
  let nextPosition = (maxPosition._max.position ?? -1) + 1;
  for (const row of rows) {
    const imageId = row.imageUrl ? urlToImageId.get(row.imageUrl) : undefined;
    const existing = await tx.supplierProductVariant.findUnique({
      where: { supplierProductId_colour_size: { supplierProductId, colour: row.colour, size: row.size } },
    });
    if (existing) {
      await tx.supplierProductVariant.update({
        where: { id: existing.id },
        data: {
          sku: row.sku,
          barcode: row.barcode,
          sellPrice: row.sellPrice,
          ...(row.buyPrice !== undefined && { buyPrice: row.buyPrice }),
          ...(imageId !== undefined && { imageId }),
        },
      });
      // The file only carries a total: a located variant gets the difference at its locations.
      await setVariantTotal(tx, existing.id, row.stockOnHand);
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
          position: nextPosition++,
          ...(imageId !== undefined && { imageId }),
        },
      });
      created++;
    }
  }
  return { created, updated };
}
