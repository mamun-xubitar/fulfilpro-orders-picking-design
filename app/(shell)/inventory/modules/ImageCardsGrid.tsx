'use client';

import { formatColourName } from '@/lib/inventory/colour';
import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type { useProductImageMutations } from './hooks/useProductImageMutations';
import { Close, Image as ImageIcon, Plus, Trash } from './icons';
import type { ColourOption, ProductImage } from './types';
import { makeSwatchResolver } from './utils';

// Mirrors the limits enforced in app/api/inventory/catalog/[id]/images/upload/route.ts
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
/** Mirrors the total-gallery cap enforced server-side in supplier-product.controller.server.ts. */
export const MAX_IMAGES = 250;

type ImageMutations = ReturnType<typeof useProductImageMutations>;

type ImageCardsGridProps = {
  images: ProductImage[];
  colours: ColourOption[];
  imageMutations: ImageMutations;
};

/**
 * The Assigned / Unassigned image grid shared by the Edit images modal and the New Product
 * wizard's Images step. An image is assigned to at most one colour, Shopify-style — assigning it
 * fans out to every variant of that colour on the server (see updateImageColour), and reassigning
 * it away from a colour that already held another image bumps that image back to unassigned.
 * Unassigned images get their own labelled section so they're never lost among the assigned ones.
 */
export default function ImageCardsGrid({ images, colours, imageMutations }: ImageCardsGridProps) {
  const swatchOf = makeSwatchResolver(colours);
  const assigned = images.filter((i) => i.colour);
  // Newest first (matches the Main image gallery) — `images` itself stays position-ascending
  // since Assigned above, and the product-list thumbnail, still want oldest-first.
  const unassigned = images.filter((i) => !i.colour).reverse();
  const takenByOtherImages = new Set(assigned.map((i) => i.colour!.toLowerCase()));

  const availableColoursFor = (image: ProductImage) =>
    colours.filter((c) => c.name.toLowerCase() === image.colour?.toLowerCase() || !takenByOtherImages.has(c.name.toLowerCase()));

  // Hoisted out of AddImageTile (and kept mounted at this top level, not inside the Assigned /
  // Unassigned sections that reshuffle every time an image's colour changes) — a file input that
  // gets remounted mid-dialog can silently drop the browser's native file-picker selection on the
  // first attempt, which matched the reported "first pick does nothing, second pick works" bug.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_IMAGES - images.length;

  const onFilesSelected = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    if (files.length > MAX_FILES) {
      toast.error(`You can upload at most ${MAX_FILES} files at once`);
      return;
    }
    if (files.length > remaining) {
      toast.error(`This product can hold at most ${MAX_IMAGES} images — only ${remaining} more can be added`);
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
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-inventory-text-subtle">
          {images.length} / {MAX_IMAGES} images
        </span>
      </div>

      {assigned.length > 0 && (
        <section>
          <h4 className="z-10 -mx-1 mb-2 bg-inventory-surface/95 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-inventory-text-subtle">
            Assigned ({assigned.length})
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {assigned.map((image) => (
              <ImageCard key={image.id} image={image} colours={availableColoursFor(image)} imageMutations={imageMutations} swatchOf={swatchOf} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="z-10 -mx-1 mb-2 bg-inventory-surface/95 px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-inventory-text-subtle">
          Unassigned ({unassigned.length})
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {unassigned.map((image) => (
            <ImageCard key={image.id} image={image} colours={availableColoursFor(image)} imageMutations={imageMutations} swatchOf={swatchOf} />
          ))}
          <AddImageTile fileInputRef={fileInputRef} uploading={imageMutations.uploading} remaining={remaining} />
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFilesSelected(e.target.files)}
      />
    </div>
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
  const [broken, setBroken] = useState(false);

  return (
    <figure className="overflow-hidden rounded-xl border border-inventory-border flex flex-col justify-between">
      {broken ? (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-inventory-danger/10 text-inventory-danger">
          <ImageIcon className="h-5 w-5" />
          <span className="text-[10px] font-semibold">File missing</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={image.altText ?? ''} className="aspect-square w-full object-cover " onError={() => setBroken(true)} />
      )}
      <figcaption className="space-y-1.5 bg-inventory-surface-muted px-2 py-1.5">
        {image.colour && (
          <div className="flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-inventory-border bg-inventory-surface pl-1.5 pr-1 py-0.5 text-[10px] font-semibold text-inventory-text-muted">
              <span className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: swatchOf(image.colour) }} aria-hidden="true" />
              {formatColourName(image.colour)}
              <button
                type="button"
                onClick={() => imageMutations.setImageColour(image.id, null)}
                disabled={assigning}
                aria-label={`Remove ${formatColourName(image.colour)} from this image`}
                title="Remove colour"
                className="rounded-full p-0.5 text-inventory-text-subtle hover:bg-inventory-surface-hover hover:text-inventory-text-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
            className="min-w-0 flex-1 rounded border border-inventory-border bg-inventory-surface px-1.5 py-0.5 text-[11px] font-medium text-inventory-text-muted outline-none focus:ring-2 focus:ring-inventory-primary-ring disabled:cursor-not-allowed disabled:opacity-50"
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
            className="shrink-0 rounded p-1 text-inventory-text-subtle hover:bg-inventory-danger/10 hover:text-inventory-danger-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>
      </figcaption>
    </figure>
  );
}

function AddImageTile({
  fileInputRef,
  uploading,
  remaining,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  remaining: number;
}) {
  const full = remaining <= 0;

  return (
    <button
      type="button"
      onClick={() => {
        // Reset before opening the dialog (not in onChange after) — the standard, reliable
        // ordering: it clears any previous selection up front instead of mutating the input's
        // value while it may still be mid-dispatch of its own change event.
        if (fileInputRef.current) fileInputRef.current.value = '';
        fileInputRef.current?.click();
      }}
      disabled={uploading || full}
      title={full ? `Gallery full (${MAX_IMAGES})` : undefined}
      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-inventory-border-strong text-inventory-text-muted transition-colors duration-150 hover:border-inventory-primary hover:text-inventory-secondary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
    >
      <Plus className="h-5 w-5" />
      <span className="text-[11px] font-semibold">{full ? `Gallery full (${MAX_IMAGES})` : uploading ? 'Uploading…' : 'Add image'}</span>
    </button>
  );
}
