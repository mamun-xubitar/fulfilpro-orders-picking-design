'use client';

import { ModalShell } from '@/components/ModalShell';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import { formatColourName } from '@/lib/inventory/colour';
import type { useProductImageMutations } from './hooks/useProductImageMutations';
import { Close, Plus, Trash } from './icons';
import type { ColourOption, ProductImage } from './types';
import { makeSwatchResolver } from './utils';

// Mirrors the limits enforced in app/api/inventory/catalog/[id]/images/upload/route.ts
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file

type ImageMutations = ReturnType<typeof useProductImageMutations>;

type EditImagesModalProps = {
  images: ProductImage[];
  colours: ColourOption[];
  imageMutations: ImageMutations;
  onClose: () => void;
};

/** An image is assigned to at most one colour, Shopify-style — assigning it fans out to every
 * variant of that colour on the server (see updateImageColour), and reassigning it away from a
 * colour that already held another image bumps that image back to unassigned. A card with a
 * colour shows it as a removable badge; its dropdown offers every colour not already taken by
 * another image (plus its own, if any), so two images can never claim the same colour from here. */
export default function EditImagesModal({ images, colours, imageMutations, onClose }: EditImagesModalProps) {
  const swatchOf = makeSwatchResolver(colours);
  const takenByOtherImages = new Set(
    images.filter((i) => i.colour).map((i) => i.colour!.toLowerCase())
  );

  return (
    <ModalShell title="Edit images" onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            colours={colours.filter((c) => c.name.toLowerCase() === image.colour?.toLowerCase() || !takenByOtherImages.has(c.name.toLowerCase()))}
            imageMutations={imageMutations}
            swatchOf={swatchOf}
          />
        ))}
        <AddImageTile imageMutations={imageMutations} />
      </div>
    </ModalShell>
  );
}

function ImageCard({
  image,
  colours,
  imageMutations,
  swatchOf,
}: {
  image: ProductImage;
  /** Every colour still assignable from this card — already excludes colours taken by other images. */
  colours: ColourOption[];
  imageMutations: ImageMutations;
  swatchOf: (colour: string) => string;
}) {
  const assigning = imageMutations.settingColourForImageId === image.id;

  return (
    <figure className="overflow-hidden rounded-xl border border-gray-200 flex flex-col justify-between">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={image.altText ?? ''} className="aspect-square w-full object-cover " />
      <figcaption className="space-y-1.5 bg-gray-50 px-2 py-1.5">
        {image.colour && (
          <div className="flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white pl-1.5 pr-1 py-0.5 text-[10px] font-semibold text-gray-700">
              <span className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: swatchOf(image.colour) }} aria-hidden="true" />
              {formatColourName(image.colour)}
              <button
                type="button"
                onClick={() => imageMutations.setImageColour(image.id, null)}
                disabled={assigning}
                aria-label={`Remove ${formatColourName(image.colour)} from this image`}
                title="Remove colour"
                className="rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Close className="h-2.5 w-2.5" />
              </button>
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <select
            value={image.colour ?? ''}
            onChange={(e) => imageMutations.setImageColour(image.id, e.target.value || null)}
            disabled={assigning}
            aria-label="Assign this image to a colour"
            className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">— assign a colour —</option>
            {colours.map((c) => (
              <option key={c.name} value={c.name}>
                {formatColourName(c.name)}
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
