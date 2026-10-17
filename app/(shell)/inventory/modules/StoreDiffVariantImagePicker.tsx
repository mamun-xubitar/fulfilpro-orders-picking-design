'use client';

import StoreSystemImageMenu from './StoreSystemImageMenu';
import { ChevronDown } from './icons';

type StoreDiffVariantImagePickerProps = {
  variantLabel: string;
  images: { id: string; url: string; altText: string | null }[];
  selectedImageId: string | null;
  onChange: (imageId: string | null) => void;
};

/** The Differences modal's per-variant image picker: the same thumbnail grid as the "Use a system
 * image" menu on a store tile, but over the store's own gallery, with a "No image" tile to unlink. */
export default function StoreDiffVariantImagePicker({ variantLabel, images, selectedImageId, onChange }: StoreDiffVariantImagePickerProps) {
  const selected = selectedImageId ? images.find((img) => img.id === selectedImageId) : undefined;

  return (
    <StoreSystemImageMenu
      systemImages={images}
      title="Store images"
      emptyText="The store has no images."
      selectedId={selectedImageId}
      onClear={() => onChange(null)}
      onPick={(img) => onChange(img.id)}
      renderTrigger={({ ref, onClick, open }) => (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          disabled={images.length === 0}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Image for ${variantLabel} at the store`}
          className="flex h-[24px] w-full items-center gap-1.5 rounded-[7px] border border-inventory-border-strong px-[6px] text-left text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {selected ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.url} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />
          ) : (
            <div className="h-5 w-5 shrink-0 rounded border border-dashed border-inventory-border-strong" />
          )}
          <span className="min-w-0 flex-1 truncate text-inventory-text-muted">{selected ? selected.altText || selected.url.split('/').pop() || selected.id : images.length === 0 ? 'No images' : '— none —'}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-inventory-text-subtle" />
        </button>
      )}
    />
  );
}
