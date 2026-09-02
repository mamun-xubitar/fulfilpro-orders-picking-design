'use client';

import { ModalShell } from '@/components/ModalShell';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import type { useProductImageMutations } from './hooks/useProductImageMutations';
import { Close, Plus, Trash } from './icons';
import type { ProductImage, VariantRow } from './types';
import { variantTitle } from './utils';

// Mirrors the limits enforced in app/api/inventory/catalog/[id]/images/upload/route.ts
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file

type ImageMutations = ReturnType<typeof useProductImageMutations>;

type EditImagesModalProps = {
  images: ProductImage[];
  variants: VariantRow[];
  imageMutations: ImageMutations;
  onClose: () => void;
};

/** One variant links to at most one image from the product's pool, Shopify-style, and an image
 * may be shared by several variants. Each pool card shows the variants currently linked to it as
 * removable chips, plus a dropdown of every still-unassigned variant to link next — so a variant
 * can never end up on two images at once. */
export default function EditImagesModal({ images, variants, imageMutations, onClose }: EditImagesModalProps) {
  const unassignedVariants = variants.filter((v) => !v.imageId);

  return (
    <ModalShell title="Edit images" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            linkedVariants={variants.filter((v) => v.imageId === image.id)}
            unassignedVariants={unassignedVariants}
            imageMutations={imageMutations}
          />
        ))}
        <AddImageTile imageMutations={imageMutations} />
      </div>
    </ModalShell>
  );
}

function ImageCard({
  image,
  linkedVariants,
  unassignedVariants,
  imageMutations,
}: {
  image: ProductImage;
  linkedVariants: VariantRow[];
  unassignedVariants: VariantRow[];
  imageMutations: ImageMutations;
}) {
  const assigning = unassignedVariants.some((v) => v.id === imageMutations.settingImageForVariantId);

  return (
    <figure className="overflow-hidden rounded-xl border border-gray-200 flex flex-col justify-between">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={image.altText ?? ''} className="aspect-square w-full object-cover " />
      <figcaption className="space-y-1.5 bg-gray-50 px-2 py-1.5">
        {linkedVariants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {linkedVariants.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-700"
              >
                {variantTitle(v)}
                <button
                  type="button"
                  onClick={() => imageMutations.setVariantImage(v.id, null)}
                  disabled={imageMutations.settingImageForVariantId === v.id}
                  aria-label={`Unlink ${variantTitle(v)}`}
                  title="Unlink"
                  className="text-gray-400 hover:text-red-600 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Close className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) imageMutations.setVariantImage(e.target.value, image.id);
            }}
            disabled={assigning || unassignedVariants.length === 0}
            aria-label={`Assign a variant to this image`}
            className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{unassignedVariants.length === 0 ? 'No unassigned variants' : 'Assign variants'}</option>
            {unassignedVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {variantTitle(v)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => imageMutations.removeImage(image.id)}
            disabled={imageMutations.removingId === image.id}
            aria-label="Remove image"
            title="Remove image"
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

function AddImageTile({ imageMutations }: { imageMutations: ImageMutations }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={imageMutations.uploading}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-500 text-gray-700 transition-colors duration-150 hover:border-blue-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        <Plus className="h-5 w-5" />
        <span className="text-[11px] font-semibold">{imageMutations.uploading ? 'Uploading…' : 'Add image'}</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (files.length === 0) return;
          if (files.length > MAX_FILES) {
            toast.error(`You can upload at most ${MAX_FILES} files at once`);
            return;
          }
          const nonImage = files.find((f) => !f.type.startsWith('image/'));
          if (nonImage) {
            toast.error(`${nonImage.name} is not an image`);
            return;
          }
          const oversized = files.find((f) => f.size > MAX_SIZE);
          if (oversized) {
            toast.error(`${oversized.name} exceeds the 10 MB limit`);
            return;
          }
          void imageMutations.uploadImages(files);
        }}
      />
    </>
  );
}
