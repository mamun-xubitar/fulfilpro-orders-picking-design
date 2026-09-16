'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { buildPoCsv, buildShopifyProductCsv, downloadCsv } from '../utils';
import type { ProductRecord, ProductStatusValue, PurchaseOrderRecord, SupplierOption, VariantRow } from '../types';

export type ProductImportPreviewRow = { colour: string; size: string; sku: string; barcode: string; stockOnHand: number; buyPrice?: number; sellPrice: number };

/** Pricing (buying price, freight, margin, tax) is deliberately excluded — only details and
 * images are updated by import. itemNo is never imported: it's the hub's own style code, and the
 * CSV's Handle is a Shopify URL slug that can collide with another product's itemNo. */
export type ProductImportPreviewFields = { name?: string; description?: string; brand?: string; category?: string; status?: ProductStatusValue };
export type ProductImportPreviewImage = { url: string; altText: string | null };

export type PoImportPreviewItem = { variantId: string; variantTitle: string; sku: string | null; quantity: number; receivedQuantity: number; unitCost: number | null };
export type PoImportPreviewGroup = { poNumber: string; isNew: boolean; status?: string; deliveryDate?: string; poRemark?: string; items: PoImportPreviewItem[] };

export type ImportPreview =
  | { type: 'product'; rows: ProductImportPreviewRow[]; product: ProductImportPreviewFields; images: ProductImportPreviewImage[]; handleMatches: boolean }
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
 * Shopify product CSV vs. our own PO CSV server-side; `commit` distinguishes preview from apply.
 * `overwrite` / `markVerified` only affect a product CSV — a PO CSV ignores them — and are sent
 * on the preview call too, so a refused overwrite surfaces before the user commits. `poSupplierId`
 * only affects a PO CSV — it's the supplier a brand-new PO the file creates gets attributed to. */
async function postImportFile<T>(
  productId: string,
  file: File,
  commit: boolean,
  options: { overwrite: boolean; markVerified: boolean; poSupplierId: string }
): Promise<ApiEnvelope<T>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('commit', String(commit));
  formData.append('overwrite', String(options.overwrite));
  formData.append('markVerified', String(options.markVerified));
  formData.append('supplierId', options.poSupplierId);
  const res = await fetch(`/api/inventory/catalog/${productId}/import`, { method: 'POST', body: formData });
  const json = await parseApiResponse<T>(res);
  if (!res.ok || !json.success) throw new Error(json.message || 'Import failed');
  return json;
}

type UseImportExportArgs = {
  product: ProductRecord | null;
  /** Patches the product in place with the server's response — no full-catalogue refetch. */
  onSaved: (product: ProductRecord) => void;
  /** Called after a PO-type import commits, so the Purchase Orders panel's own list refreshes too. */
  onPoImported: () => void;
  /** Every supplier in the system — for the PO-CSV import's supplier dropdown, same list the
   * Create PO modal offers. */
  supplierOptions: SupplierOption[];
};

export function useImportExport({ product, onSaved, onPoImported, supplierOptions }: UseImportExportArgs) {
  const [importOpen, setImportOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  // Overwrite defaults checked — matches today's always-replace behaviour.
  const [overwrite, setOverwrite] = useState(true);
  const [markVerified, setMarkVerified] = useState(false);
  // PO-CSV only: which supplier a brand-new PO the file creates gets attributed to. Defaults to
  // the product's own first linked supplier, falling back to the first supplier in the system.
  const [poSupplierId, setPoSupplierId] = useState('');

  const exportVariants = (rows: VariantRow[]) => {
    if (!product) return;
    // Belt and braces against any variant that's already partial in the database (blank colour or
    // size on an axis the product otherwise declares) — every write path now rejects these going
    // forward, but a row from before that fix could still be sitting here. Exporting it as-is
    // would produce a CSV Shopify rejects with "Each variant must have exactly one option value
    // for each product option", so it's dropped from the export and the admin is told to fix it.
    const hasColourAxis = product.colours.length > 0;
    const hasSizeAxis = product.sizes.length > 0;
    const valid = rows.filter((v) => !((hasColourAxis && v.colour === '') || (hasSizeAxis && v.size === '')));
    const skippedCount = rows.length - valid.length;
    if (skippedCount > 0) {
      toast.warning(
        `${skippedCount} variant${skippedCount === 1 ? '' : 's'} skipped — missing colour or size. Fix ${skippedCount === 1 ? 'it' : 'them'} in the matrix and export again.`
      );
    }
    downloadCsv(`${product.handle}-product.csv`, buildShopifyProductCsv(product, valid));
  };

  const exportPurchaseOrders = (purchaseOrders: PurchaseOrderRecord[]) => {
    if (!product) return;
    downloadCsv(`${product.itemNo}-purchase-orders.csv`, buildPoCsv(purchaseOrders));
  };

  const openImport = () => {
    setPendingFile(null);
    setPreview(null);
    setOverwrite(true);
    setMarkVerified(false);
    setPoSupplierId(product?.suppliers[0]?.id ?? supplierOptions[0]?.id ?? '');
    setImportOpen(true);
  };
  const closeImport = () => setImportOpen(false);

  const previewFile = async (file: File, opts: { overwrite: boolean; markVerified: boolean; poSupplierId: string }) => {
    if (!product) return;
    setPendingFile(file);
    setPreview(null);
    setPreviewing(true);
    try {
      const json = await postImportFile<ImportPreview>(product.id, file, false, opts);
      setPreview(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read this file');
      setPendingFile(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleFile = (file: File) => previewFile(file, { overwrite, markVerified, poSupplierId });

  // Neither option changes what the preview itself shows — "Overwrite" only gates whether commit
  // is allowed (surfaced via `preview.handleMatches`, checked at render time) and "Mark verified"
  // has no effect until commit — so toggling either is a plain state update with no re-upload.
  const toggleOverwrite = (value: boolean) => setOverwrite(value);
  const toggleMarkVerified = (value: boolean) => setMarkVerified(value);

  const commitImport = async () => {
    if (!product || !pendingFile || !preview) return;
    setImporting(true);
    try {
      const json = await postImportFile<{ product: ProductRecord }>(product.id, pendingFile, true, { overwrite, markVerified, poSupplierId });
      toast.success(json.message);
      setImportOpen(false);
      setPendingFile(null);
      setPreview(null);
      onSaved(json.data.product);
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
    pendingFile,
    handleFile,
    importing,
    commitImport,
    exportVariants,
    exportPurchaseOrders,
    overwrite,
    setOverwrite: toggleOverwrite,
    markVerified,
    setMarkVerified: toggleMarkVerified,
    poSupplierId,
    setPoSupplierId,
    poSupplierOptions: supplierOptions,
  };
}
