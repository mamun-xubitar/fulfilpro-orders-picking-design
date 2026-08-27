'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildShopifyProductCsv, downloadCsv } from '../utils';
import type { ProductRecord, ProductStatusValue, PurchaseOrderRecord, VariantRow } from '../types';

type ImportRow = { colour: string; size: string; sku: string; barcode: string; stockOnHand: number; buyPrice?: number; sellPrice: number; trigger?: number };

/** Product-level fields read from the CSV — pricing (buying price, freight, margin, tax) is
 * deliberately excluded; only details and images are updated by import. itemNo is NOT imported:
 * it's the hub's own style code, and the CSV's Handle is a Shopify URL slug that can collide
 * with another product's itemNo under the same supplier (unique constraint). */
type ImportProductFields = {
  name?: string;
  description?: string;
  brand?: string;
  category?: string;
  status?: ProductStatusValue;
};

type ImportImage = { url: string; colour: string | null };

type ParsedImport = { rows: ImportRow[]; product: ImportProductFields; images: ImportImage[] };

/** Splits one CSV line on commas, respecting double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/** Reads the Shopify-product-CSV format produced by `buildShopifyProductCsv`, so an exported
 * file can be re-imported directly. There is no trigger column in this format, so it's left
 * `undefined` rather than defaulted to 0 — the backend preserves the existing value on update
 * instead of wiping it. Cost per item (buy price) is optional too, left `undefined` when the
 * column is missing or blank so a real Shopify export without it doesn't wipe existing buy
 * prices. Product-level fields (title, description, vendor, type, published, image) are read
 * from the first row that has them, and every distinct Image Src is collected against its row's
 * colour. */
function parseCsv(text: string): ParsedImport {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return { rows: [], product: {}, images: [] };
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const rows: ImportRow[] = [];
  const product: ImportProductFields = {};
  const seenImages = new Set<string>();
  const images: ImportImage[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const get = (name: string) => cells[idx(name)]?.trim() ?? '';

    if (product.name === undefined && get('title')) product.name = get('title');
    if (product.description === undefined && get('body (html)')) product.description = get('body (html)');
    if (product.brand === undefined && get('vendor')) product.brand = get('vendor');
    if (product.category === undefined && get('type')) product.category = get('type');
    if (product.status === undefined && get('published')) product.status = get('published').toUpperCase() === 'TRUE' ? 'ACTIVE' : 'DRAFT';

    const colour = get('option1 value');
    const imageSrc = get('image src');
    // Dedup by (url, colour) — not url alone — so every colour gets its own image even
    // when a Shopify export repeats the same Image Src across colourways (e.g. a shared
    // placeholder). Multiple sizes of one colour still collapse to a single image.
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

  return { rows: rows.filter((r) => r.colour && r.size), product, images };
}

type UseImportExportArgs = {
  product: ProductRecord | null;
  refreshCatalog: () => void;
};

export function useImportExport({ product, refreshCatalog }: UseImportExportArgs) {
  const [importOpen, setImportOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
  const [previewProduct, setPreviewProduct] = useState<ImportProductFields>({});
  const [previewImages, setPreviewImages] = useState<ImportImage[]>([]);
  const [updateProductDetails, setUpdateProductDetails] = useState(true);
  const { request, loading: importing } = useRequest<{ created: number; updated: number }>();

  const exportVariants = (rows: VariantRow[]) => {
    if (!product) return;
    downloadCsv(`${product.itemNo}-shopify-import.csv`, buildShopifyProductCsv(product, rows));
  };

  const exportPurchaseOrders = (purchaseOrders: PurchaseOrderRecord[]) => {
    if (!product) return;
    const lines = ['PO Number,Status,Delivery date,Variant,SKU,Quantity,Received'];
    for (const po of purchaseOrders) {
      for (const item of po.items) {
        lines.push(
          [String(po.number), po.status, po.deliveryDate ?? '', item.variantTitle, item.sku ?? '', String(item.quantity), String(item.receivedQuantity)]
            .map((f) => (/[",\n]/.test(f) ? `"${f.replaceAll('"', '""')}"` : f))
            .join(',')
        );
      }
    }
    downloadCsv(`${product.itemNo}-purchase-orders.csv`, lines.join('\r\n'));
  };

  const openImport = () => {
    setPreviewRows([]);
    setPreviewProduct({});
    setPreviewImages([]);
    setUpdateProductDetails(true);
    setImportOpen(true);
  };
  const closeImport = () => setImportOpen(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.rows.length === 0) {
      toast.error('No valid rows found — expected a Shopify product CSV with Option1 Value (Colour) and Option2 Value (Size) columns');
      return;
    }
    setPreviewRows(parsed.rows);
    setPreviewProduct(parsed.product);
    setPreviewImages(parsed.images);
  };

  const commitImport = () => {
    if (!product || previewRows.length === 0) return;
    request({
      url: `/api/inventory/catalog/${product.id}/import`,
      method: 'POST',
      data: {
        rows: previewRows as unknown as Record<string, unknown>[],
        ...(updateProductDetails ? { product: previewProduct, images: previewImages } : {}),
      },
      successMessage: 'Import complete',
      onSuccess: () => {
        setImportOpen(false);
        setPreviewRows([]);
        setPreviewProduct({});
        setPreviewImages([]);
        refreshCatalog();
      },
    });
  };

  return {
    importOpen,
    openImport,
    closeImport,
    previewRows,
    previewProduct,
    previewImages,
    updateProductDetails,
    setUpdateProductDetails,
    handleFile,
    importing,
    commitImport,
    exportVariants,
    exportPurchaseOrders,
  };
}
