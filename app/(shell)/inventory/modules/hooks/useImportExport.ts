'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import useRequest from '@/hooks/useRequest';
import { buildShopifyProductCsv, downloadCsv } from '../utils';
import type { ProductRecord, PurchaseOrderRecord, VariantRow } from '../types';

type ImportRow = { colour: string; size: string; sku: string; barcode: string; stockOnHand: number; buyPrice?: number; sellPrice: number; trigger?: number };

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

/** Reads the Shopify-product-CSV format produced by `buildShopifyProductCsv`, so an
 * exported file can be re-imported directly. There is no buy price / trigger column
 * in this format, so those are left `undefined` rather than defaulted to 0 — the
 * backend preserves the existing value on update instead of wiping it. */
function parseCsv(text: string): ImportRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const get = (name: string) => cells[idx(name)]?.trim() ?? '';
    return {
      colour: get('option1 value'),
      size: get('option2 value'),
      sku: get('variant sku'),
      barcode: get('variant barcode'),
      stockOnHand: Number(get('variant inventory qty')) || 0,
      sellPrice: Number(get('variant price')) || 0,
    };
  });
}

type UseImportExportArgs = {
  product: ProductRecord | null;
  refreshCatalog: () => void;
};

export function useImportExport({ product, refreshCatalog }: UseImportExportArgs) {
  const [importOpen, setImportOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<ImportRow[]>([]);
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
    setImportOpen(true);
  };
  const closeImport = () => setImportOpen(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCsv(text).filter((r) => r.colour && r.size);
    if (rows.length === 0) {
      toast.error('No valid rows found — expected a Shopify product CSV with Option1 Value (Colour) and Option2 Value (Size) columns');
      return;
    }
    setPreviewRows(rows);
  };

  const commitImport = () => {
    if (!product || previewRows.length === 0) return;
    request({
      url: `/api/inventory/catalog/${product.id}/import`,
      method: 'POST',
      data: { rows: previewRows as unknown as Record<string, unknown>[] },
      successMessage: 'Import complete',
      onSuccess: () => {
        setImportOpen(false);
        setPreviewRows([]);
        refreshCatalog();
      },
    });
  };

  return { importOpen, openImport, closeImport, previewRows, handleFile, importing, commitImport, exportVariants, exportPurchaseOrders };
}
