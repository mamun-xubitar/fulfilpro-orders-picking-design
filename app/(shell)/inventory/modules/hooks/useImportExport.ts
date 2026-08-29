'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { buildPoCsv, buildShopifyProductCsv, downloadCsv } from '../utils';
import type { ProductRecord, ProductStatusValue, PurchaseOrderRecord, VariantRow } from '../types';

export type ProductImportPreviewRow = { colour: string; size: string; sku: string; barcode: string; stockOnHand: number; buyPrice?: number; sellPrice: number };

/** Pricing (buying price, freight, margin, tax) is deliberately excluded — only details and
 * images are updated by import. itemNo is never imported: it's the hub's own style code, and the
 * CSV's Handle is a Shopify URL slug that can collide with another product's itemNo. */
export type ProductImportPreviewFields = { name?: string; description?: string; brand?: string; category?: string; status?: ProductStatusValue };
export type ProductImportPreviewImage = { url: string; colour: string | null };

export type PoImportPreviewItem = { variantId: string; variantTitle: string; sku: string | null; quantity: number; receivedQuantity: number; unitCost: number | null };
export type PoImportPreviewGroup = { poNumber: string; isNew: boolean; status?: string; deliveryDate?: string; remark?: string; items: PoImportPreviewItem[] };

export type ImportPreview =
  | { type: 'product'; rows: ProductImportPreviewRow[]; product: ProductImportPreviewFields; images: ProductImportPreviewImage[] }
  | { type: 'po'; groups: PoImportPreviewGroup[] };

type ApiEnvelope<T> = { success: boolean; message: string; data: T };

/** Some failures (e.g. an unhandled server exception) return a non-JSON body — parse
 * defensively so that surfaces as a readable message instead of a raw SyntaxError. */
async function parseApiResponse<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(res.ok ? 'Unexpected server response' : `Request failed (${res.status})`);
  }
}

/** File uploads use raw `fetch` with `FormData` — `useRequest` only speaks JSON. Auto-detects
 * Shopify product CSV vs. our own PO CSV server-side; `commit` distinguishes preview from apply. */
async function postImportFile<T>(productId: string, file: File, commit: boolean): Promise<ApiEnvelope<T>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('commit', String(commit));
  const res = await fetch(`/api/inventory/catalog/${productId}/import`, { method: 'POST', body: formData });
  const json = await parseApiResponse<T>(res);
  if (!res.ok || !json.success) throw new Error(json.message || 'Import failed');
  return json;
}

type UseImportExportArgs = {
  product: ProductRecord | null;
  refreshCatalog: () => void;
  /** Called after a PO-type import commits, so the Purchase Orders panel's own list refreshes too. */
  onPoImported: () => void;
};

export function useImportExport({ product, refreshCatalog, onPoImported }: UseImportExportArgs) {
  const [importOpen, setImportOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportVariants = (rows: VariantRow[]) => {
    if (!product) return;
    downloadCsv(`${product.itemNo}-product.csv`, buildShopifyProductCsv(product, rows));
  };

  const exportPurchaseOrders = (purchaseOrders: PurchaseOrderRecord[]) => {
    if (!product) return;
    downloadCsv(`${product.itemNo}-purchase-orders.csv`, buildPoCsv(purchaseOrders));
  };

  const openImport = () => {
    setPendingFile(null);
    setPreview(null);
    setImportOpen(true);
  };
  const closeImport = () => setImportOpen(false);

  const handleFile = async (file: File) => {
    if (!product) return;
    setPendingFile(file);
    setPreview(null);
    setPreviewing(true);
    try {
      const json = await postImportFile<ImportPreview>(product.id, file, false);
      setPreview(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read this file');
      setPendingFile(null);
    } finally {
      setPreviewing(false);
    }
  };

  const commitImport = async () => {
    if (!product || !pendingFile || !preview) return;
    setImporting(true);
    try {
      const json = await postImportFile<unknown>(product.id, pendingFile, true);
      toast.success(json.message);
      setImportOpen(false);
      setPendingFile(null);
      setPreview(null);
      refreshCatalog();
      if (preview.type === 'po') onPoImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return {
    importOpen,
    openImport,
    closeImport,
    preview,
    previewing,
    handleFile,
    importing,
    commitImport,
    exportVariants,
    exportPurchaseOrders,
  };
}
