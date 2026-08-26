'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import type { ProductRecord } from '../types';

type ApiResponse<T> = { success: boolean; message: string; data: T };

/** Some failures (e.g. an unhandled server exception) return a non-JSON body — parse
 * defensively so that surfaces as a readable message instead of a raw SyntaxError. */
async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new Error(res.ok ? 'Unexpected server response' : `Request failed (${res.status})`);
  }
}

type UseProductImageMutationsArgs = {
  product: ProductRecord | null;
  onSaved: (product: ProductRecord) => void;
};

/** File uploads use raw `fetch` with `FormData` — `useRequest` only speaks JSON. */
export function useProductImageMutations({ product, onSaved }: UseProductImageMutationsArgs) {
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [updatingColourId, setUpdatingColourId] = useState<string | null>(null);

  const uploadImages = async (files: File[], colour: string | null) => {
    if (!product || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) formData.append('files', file);
      if (colour) formData.append('colour', colour);

      const res = await fetch(`/api/inventory/catalog/${product.id}/images/upload`, { method: 'POST', body: formData });
      const json = await parseApiResponse<ProductRecord>(res);
      if (!res.ok || !json.success) throw new Error(json.message || 'Upload failed');
      onSaved(json.data);
      toast.success('Image added');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async (imageId: string) => {
    if (!product) return;
    setRemovingId(imageId);
    try {
      const res = await fetch(`/api/inventory/catalog/${product.id}/images/${imageId}`, { method: 'DELETE' });
      const json = await parseApiResponse<ProductRecord>(res);
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to remove image');
      onSaved(json.data);
      toast.success('Image removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove image');
    } finally {
      setRemovingId(null);
    }
  };

  const updateImageColour = async (imageId: string, colour: string | null) => {
    if (!product) return;
    setUpdatingColourId(imageId);
    try {
      const res = await fetch(`/api/inventory/catalog/${product.id}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colour }),
      });
      const json = await parseApiResponse<ProductRecord>(res);
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update image colour');
      onSaved(json.data);
      toast.success('Image colour updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update image colour');
    } finally {
      setUpdatingColourId(null);
    }
  };

  return { uploading, removingId, updatingColourId, uploadImages, removeImage, updateImageColour };
}
