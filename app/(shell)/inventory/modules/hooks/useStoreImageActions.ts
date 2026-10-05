'use client';

import { useState } from 'react';
import type { ProductImage, StoreListingImage } from '../types';
import type { ImageColourGroup } from '../storeDiff';
import type { StoreActionConfirm } from './useStoreActionConfirm';
import type { StoreEditRunner } from './useStoreEditRunner';

/** Where a new/replacement image comes from — a hub gallery image (resolved server-side) or an
 * uploaded file. Never a raw URL. */
export type ImageSource = { hubImageId: string } | { file: File };

/** Which image dialog is open: the "add" chooser, or the "update by upload" confirmation for one image. */
export type ImagePicker = { mode: 'add' } | { mode: 'upload'; image: StoreListingImage & { position: number } };

type Args = {
  storeImages: StoreListingImage[];
  run: StoreEditRunner;
  confirm: StoreActionConfirm;
  /** The existing full push of the system gallery — what "Replace all with system images" does. */
  replaceAllWithSystem: () => Promise<unknown>;
  /** Shows `url` on a store image immediately (before Shopify has finished processing it); `null`
   * clears it once the refreshed listing carries the real picture. */
  setPreview: (mediaId: string, url: string | null) => void;
};

function toRequest(source: ImageSource, fields: Record<string, unknown>) {
  if ('file' in source) {
    const form = new FormData();
    form.set('file', source.file);
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null) form.set(k, String(v));
    return { form };
  }
  return { json: { ...fields, hubImageId: source.hubImageId } };
}

/** Every image-level action in the differences modal. Each one goes straight to Shopify; deleting
 * (one image, a colour, or all), replacing everything, and updating from a system image ask first,
 * while an upload is confirmed by its own modal. A replaced image shows its new picture at once. */
export function useStoreImageActions({ storeImages, run, confirm, replaceAllWithSystem, setPreview }: Args) {
  const [picker, setPicker] = useState<ImagePicker | null>(null);

  const remove = (ids: string[], key: string, message: string) => run(key, { path: 'media', method: 'DELETE', json: { mediaIds: ids } }, message);

  const removeOne = (image: StoreListingImage & { position: number }) =>
    confirm.ask({
      title: `Delete image ${image.position}?`,
      body: 'Removes this image from the store\'s product. Variants using it lose their image.',
      confirmLabel: 'Delete image',
      tone: 'danger',
      run: () => remove([image.id], `image:${image.id}`, 'Image removed from the store'),
    });

  const removeColour = (group: ImageColourGroup<StoreListingImage>) =>
    confirm.ask({
      title: `Delete all ${group.label} images?`,
      body: `Removes ${group.images.length} image${group.images.length === 1 ? '' : 's'} from this store's product. Variants using them lose their image.`,
      confirmLabel: `Delete ${group.images.length}`,
      tone: 'danger',
      run: () => remove(group.images.map((i) => i.id), 'images:remove', `${group.label} images removed`),
    });

  const removeAll = () =>
    confirm.ask({
      title: 'Delete every image?',
      body: `Removes all ${storeImages.length} images from this store's product. The listing will show no photos until you add or replace them.`,
      confirmLabel: 'Delete all',
      tone: 'danger',
      run: () => remove(storeImages.map((i) => i.id), 'images:remove', 'All images removed'),
    });

  const replaceAll = () =>
    confirm.ask({
      title: 'Replace all with system images?',
      body: "Pushes the system product's whole gallery to this store, replacing every image it has now.",
      confirmLabel: 'Replace all',
      tone: 'primary',
      run: () => replaceAllWithSystem(),
    });

  /** Swaps one store image's picture in place (same media id, so position and variant links stay). */
  const replaceImage = async (image: StoreListingImage, source: ImageSource, previewUrl: string): Promise<boolean> => {
    setPreview(image.id, previewUrl);
    try {
      return await run(`image:${image.id}`, { path: 'media', method: 'PATCH', ...toRequest(source, { action: 'replace', mediaId: image.id }) }, 'Image updated');
    } finally {
      setPreview(image.id, null);
    }
  };

  const updateFromSystem = (image: StoreListingImage & { position: number }, systemImage: ProductImage) =>
    confirm.ask({
      title: `Update image ${image.position} from the system?`,
      body: 'Replaces this picture on the store with the system image you picked. Its position and variant links are kept.',
      confirmLabel: 'Update image',
      tone: 'primary',
      run: () => replaceImage(image, { hubImageId: systemImage.id }, systemImage.url),
    });

  /** Moves a store image to a 1-based position in the gallery (Shopify shifts the others). */
  const move = (image: StoreListingImage & { position: number }, position: number) => {
    if (position === image.position) return;
    return run(`image:${image.id}`, { path: 'media', method: 'PATCH', json: { action: 'reorder', mediaId: image.id, position } }, 'Image moved');
  };

  const submitUpload = (file: File) => {
    if (picker?.mode !== 'upload') return;
    const { image } = picker;
    // Close straight away: the tile shows the new picture with a spinner while Shopify processes it.
    setPicker(null);
    const previewUrl = URL.createObjectURL(file);
    void replaceImage(image, { file }, previewUrl).finally(() => URL.revokeObjectURL(previewUrl));
  };

  const submitAdd = async (source: ImageSource): Promise<void> => {
    const ok = await run('images:add', { path: 'media', method: 'POST', ...toRequest(source, {}) }, 'Image added to the store');
    if (ok) setPicker(null);
  };

  return {
    picker,
    openAdd: () => setPicker({ mode: 'add' }),
    openUpload: (image: StoreListingImage & { position: number }) => setPicker({ mode: 'upload', image }),
    closePicker: () => setPicker(null),
    submitAdd,
    submitUpload,
    updateFromSystem,
    move,
    removeOne,
    removeColour,
    removeAll,
    replaceAll,
  };
}

export type StoreImageActions = ReturnType<typeof useStoreImageActions>;
