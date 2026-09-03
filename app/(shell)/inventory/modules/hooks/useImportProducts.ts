'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ProductRecord } from '../types';

export type ProductImportPreviewGroup = {
  handle: string;
  title: string;
  variantCount: number;
  imageCount: number;
  exists: boolean;
};

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

async function postImportFile<T>(file: File, supplierId: string, commit: boolean, options: { overwrite: boolean; markVerified: boolean }): Promise<ApiEnvelope<T>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('supplierId', supplierId);
  formData.append('commit', String(commit));
  formData.append('overwrite', String(options.overwrite));
  formData.append('markVerified', String(options.markVerified));
  const res = await fetch('/api/inventory/catalog/import', { method: 'POST', body: formData });
  const json = await parseApiResponse<T>(res);
  if (!res.ok || !json.success) throw new Error(json.message || 'Import failed');
  return json;
}

type UseImportProductsArgs = {
  supplierOptions: { id: string; name: string }[];
  /** Called once after a successful commit — the catalogue is server-paginated now, so a bulk
   * import (which can create or update many products at once) just triggers a refetch of
   * whatever view is on screen instead of patching a client-held list. */
  onImported: () => void;
};

/** Bulk "Import products" — creates one product per Handle group in a Shopify product CSV; with
 * "Overwrite" ticked, a handle that already exists updates that product in place instead of
 * being skipped. Mirrors useImportExport's two-phase preview/commit flow against the separate
 * bulk endpoint. */
export function useImportProducts({ supplierOptions, onImported }: UseImportProductsArgs) {
  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreviewGroup[] | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  // Both default unchecked — a bulk import only touches existing products, or marks them
  // verified, when the admin explicitly opts in.
  const [overwrite, setOverwriteState] = useState(false);
  const [markVerified, setMarkVerified] = useState(false);

  const openModal = () => {
    setSupplierId(supplierOptions[0]?.id ?? '');
    setPendingFile(null);
    setPreview(null);
    setOverwriteState(false);
    setMarkVerified(false);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const previewFile = async (file: File, opts: { overwrite: boolean; markVerified: boolean }) => {
    if (!supplierId) {
      toast.error('Choose a supplier first');
      return;
    }
    setPendingFile(file);
    setPreview(null);
    setPreviewing(true);
    try {
      const json = await postImportFile<{ groups: ProductImportPreviewGroup[] }>(file, supplierId, false, opts);
      setPreview(json.data.groups);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read this file');
      setPendingFile(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleFile = (file: File) => previewFile(file, { overwrite, markVerified });

  // create/update/skip is derived at render time from `exists` + this flag (see
  // ImportProductsModal), so toggling "Overwrite" is a plain state update — no re-preview.
  const setOverwrite = (value: boolean) => setOverwriteState(value);

  const commitImport = async () => {
    if (!pendingFile || !preview) return;
    setImporting(true);
    try {
      const json = await postImportFile<{ created: ProductRecord[]; updated: ProductRecord[]; createdCount: number; updatedCount: number; skipped: string[] }>(
        pendingFile,
        supplierId,
        true,
        { overwrite, markVerified }
      );
      toast.success(json.message);
      onImported();
      setModalOpen(false);
      setPendingFile(null);
      setPreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return {
    modalOpen,
    openModal,
    closeModal,
    supplierId,
    setSupplierId,
    pendingFile,
    preview,
    previewing,
    handleFile,
    importing,
    commitImport,
    overwrite,
    setOverwrite,
    markVerified,
    setMarkVerified,
  };
}
