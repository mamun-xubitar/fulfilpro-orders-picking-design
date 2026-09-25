'use client';

import { DIFF_TONE_CLASSES } from './StoreDiffFieldRow';
import type { StoreImagesDiff } from './storeDiff';
import type { ProductImage } from './types';
import type { StoreListingImage } from './types';

type StoreDiffImagesRowProps = {
  diff: StoreImagesDiff;
  systemImages: ProductImage[];
  storeImages: StoreListingImage[];
  onSave: () => void;
  saving: boolean;
};

/** Product-level image count mismatch (item 4) — individual images aren't diffed (Shopify
 * rewrites URLs on every publish, so a false-positive rate isn't worth it), only how many the
 * gallery holds on each side. Save pushes the whole hub gallery to the store. */
export default function StoreDiffImagesRow({ diff, systemImages, storeImages, onSave, saving }: StoreDiffImagesRowProps) {
  const t = DIFF_TONE_CLASSES.details;

  return (
    <div className={`rounded-[8px] border ${t.border} ${t.tint} p-[8px]`}>
      <div className="flex items-center justify-between gap-[8px]">
        <span className={`text-[10px] font-bold uppercase leading-none tracking-[0.3px] ${t.text}`}>Images</span>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex h-[22px] shrink-0 items-center rounded-[6px] bg-inventory-primary px-[8px] text-[10px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="mt-[6px] grid grid-cols-2 gap-[8px]">
        <ImageStrip label={`Store (${diff.storeCount})`} images={storeImages} />
        <ImageStrip label={`System (${diff.systemCount})`} images={systemImages} />
      </div>
    </div>
  );
}

function ImageStrip({ label, images }: { label: string; images: { id: string; url: string }[] }) {
  return (
    <div className="min-w-0">
      <p className="mb-[3px] text-[9px] font-semibold uppercase tracking-[0.3px] text-inventory-text-subtle">{label}</p>
      <div className="flex flex-wrap gap-[4px]">
        {images.slice(0, 8).map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={img.id} src={img.url} alt="" className="h-[32px] w-[32px] shrink-0 rounded-[4px] border border-inventory-border object-cover" />
        ))}
        {images.length === 0 && <span className="text-[10px] text-inventory-text-subtle">No images</span>}
      </div>
    </div>
  );
}
