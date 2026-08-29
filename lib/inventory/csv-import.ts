import { parse } from 'csv-parse/sync';

export type DetectedFileType = 'product' | 'po' | 'unknown';

/** Reads just the header row, lowercased and trimmed, to decide which importer applies. */
function readHeader(text: string): string[] {
  const rows = parse(text, { bom: true, trim: true, to: 1 }) as string[][];
  return (rows[0] ?? []).map((h) => h.trim().toLowerCase());
}

/** `PO Number` is the unique signature of our own PO CSV; `Handle` + `Variant SKU` is Shopify's
 * own product-CSV signature. Neither present means the file can't be handled. */
export function detectCsvType(text: string): DetectedFileType {
  const header = readHeader(text);
  if (header.includes('po number')) return 'po';
  if (header.includes('handle') && header.includes('variant sku')) return 'product';
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
  colour: string;
  size: string;
  sku: string;
  barcode: string;
  stockOnHand: number;
  buyPrice?: number;
  sellPrice: number;
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

export type ParsedProductImage = { url: string; colour: string | null };

export type ParsedProductImport = { type: 'product'; rows: ParsedProductRow[]; product: ParsedProductFields; images: ParsedProductImage[] };

/** Reads the Shopify-product-CSV format produced by buildShopifyProductCsv, so an exported file
 * can be re-imported directly. There is no trigger column in this format, so it's left undefined
 * rather than defaulted to 0 — the caller preserves the existing value on update instead of wiping
 * it. Cost per item (buy price) is optional too, left undefined when blank/missing so a real
 * Shopify export without it doesn't wipe existing buy prices. */
export function parseShopifyProductCsv(text: string): ParsedProductImport {
  const records = parseRecords(text);
  const rows: ParsedProductRow[] = [];
  const product: ParsedProductFields = {};
  const seenImages = new Set<string>();
  const images: ParsedProductImage[] = [];

  for (const record of records) {
    const get = (name: string) => record[name]?.trim() ?? '';

    if (product.name === undefined && get('title')) product.name = get('title');
    if (product.description === undefined && get('body (html)')) product.description = get('body (html)');
    if (product.brand === undefined && get('vendor')) product.brand = get('vendor');
    if (product.category === undefined && get('type')) product.category = get('type');
    if (product.status === undefined && get('published')) product.status = get('published').toUpperCase() === 'TRUE' ? 'ACTIVE' : 'DRAFT';

    const colour = get('option1 value');
    const imageSrc = get('image src');
    // Dedup by (url, colour) — not url alone — so every colour gets its own image even when a
    // Shopify export repeats the same Image Src across colourways (e.g. a shared placeholder).
    const imageKey = `${imageSrc}::${colour || ''}`;
    if (imageSrc && !seenImages.has(imageKey)) {
      seenImages.add(imageKey);
      images.push({ url: imageSrc, colour: colour || null });
    }

    const costPerItem = get('cost per item');
    rows.push({
      colour,
      size: get('option2 value'),
      sku: get('variant sku'),
      barcode: get('variant barcode'),
      stockOnHand: Number(get('variant inventory qty')) || 0,
      buyPrice: costPerItem !== '' && Number.isFinite(Number(costPerItem)) ? Number(costPerItem) : undefined,
      sellPrice: Number(get('variant price')) || 0,
    });
  }

  return { type: 'product', rows: rows.filter((r) => r.colour && r.size), product, images };
}

export type ParsedPoRow = {
  /** Raw cell — "PO-00042" style numeric reference, or a free-form label grouping new-PO rows. */
  poNumber: string;
  status?: string;
  deliveryDate?: string;
  remark?: string;
  colour: string;
  size: string;
  sku: string;
  quantity: number;
  receivedQuantity?: number;
  unitCost?: number;
};

export type ParsedPoImport = { type: 'po'; rows: ParsedPoRow[] };

/** Reads the PO CSV format produced by buildPoCsv. Received Quantity and Unit Cost are left
 * undefined when blank so an update doesn't wipe an existing value with a zero. */
export function parsePoCsv(text: string): ParsedPoImport {
  const records = parseRecords(text);
  const rows: ParsedPoRow[] = [];

  for (const record of records) {
    const get = (name: string) => record[name]?.trim() ?? '';
    const poNumber = get('po number');
    const colour = get('colour');
    const size = get('size');
    if (!poNumber || !colour || !size) continue;

    const receivedQuantity = get('received quantity');
    const unitCost = get('unit cost');
    rows.push({
      poNumber,
      status: get('status') || undefined,
      deliveryDate: get('delivery date') || undefined,
      remark: get('remark') || undefined,
      colour,
      size,
      sku: get('sku'),
      quantity: Number(get('quantity')) || 0,
      receivedQuantity: receivedQuantity !== '' && Number.isFinite(Number(receivedQuantity)) ? Number(receivedQuantity) : undefined,
      unitCost: unitCost !== '' && Number.isFinite(Number(unitCost)) ? Number(unitCost) : undefined,
    });
  }

  return { type: 'po', rows };
}
