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
  const [settingImageForVariantId, setSettingImageForVariantId] = useState<string | null>(null);
  const [settingColourForImageId, setSettingColourForImageId] = useState<string | null>(null);

  /** `variantId` links the first uploaded image straight into that variant's image slot. */
  const uploadImages = async (files: File[], variantId?: string) => {
    if (!product || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) formData.append('files', file);
      if (variantId) formData.append('variantId', variantId);

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

  /** Links a variant to one image from the product's own pool, or unlinks it when `imageId` is
   * null — the per-variant "pick from pool" / "unlink" controls in the images modal. */
  const setVariantImage = async (variantId: string, imageId: string | null) => {
    if (!product) return;
    setSettingImageForVariantId(variantId);
    try {
      const res = await fetch(`/api/inventory/catalog/${product.id}/variants/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      });
      const json = await parseApiResponse<ProductRecord>(res);
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update variant image');
      onSaved(json.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update variant image');
    } finally {
      setSettingImageForVariantId(null);
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

  /** Assigns (or clears, `colour: null`) which colour an image belongs to. The server fans this
   * out to every variant of that colour — see updateImageColour — so the matrix, gallery and
   * this modal all pick it up from the single refreshed ProductRecord below. */
  const setImageColour = async (imageId: string, colour: string | null) => {
    if (!product) return;
    setSettingColourForImageId(imageId);
    try {
      const res = await fetch(`/api/inventory/catalog/${product.id}/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colour }),
      });
      const json = await parseApiResponse<ProductRecord>(res);
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update image colour');
      onSaved(json.data);
      toast.success(json.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update image colour');
    } finally {
      setSettingColourForImageId(null);
    }
  };

  return { uploading, removingId, settingImageForVariantId, settingColourForImageId, uploadImages, removeImage, setVariantImage, setImageColour };
}
