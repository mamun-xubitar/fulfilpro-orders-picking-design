'use client';

import { useState } from 'react';
import { Image as ImageIcon, Trash } from './icons';

type StoreDraftImageCardProps = {
  image: { id: string; url: string; altText: string | null };
  excluded: boolean;
  altValue: string;
  onToggleInclude: () => void;
  onAltChange: (value: string) => void;
  /** Removes this image from the store's draft — never a hub delete, just like every other field
   * here. Variant assignment/upload/delete of the hub gallery stays on the "Edit images" modal. */
  onRemove: () => void;
};

/** One image in a store's Media grid — this store's own draft copy (Include + alt-text + remove),
 * temporary until Save. Excluded images are visibly dimmed and ringed so "not going to this store"
 * reads at a glance. */
export default function StoreDraftImageCard({ image, excluded, altValue, onToggleInclude, onAltChange, onRemove }: StoreDraftImageCardProps) {
  const [broken, setBroken] = useState(false);

  return (
    <figure className={`overflow-hidden rounded-xl border transition-opacity duration-150 ${excluded ? 'border-inventory-border opacity-50' : 'border-inventory-border-strong'}`}>
      {broken ? (
        <div className="flex aspect-square w-full flex-col items-center justify-center gap-1 bg-inventory-danger/10 text-inventory-danger">
          <ImageIcon className="h-5 w-5" />
          <span className="text-[10px] font-semibold">File missing</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={altValue || image.altText || ''} className="aspect-square w-full object-cover" onError={() => setBroken(true)} />
      )}
      <figcaption className="space-y-1.5 bg-inventory-surface-muted px-2 py-1.5">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove image from this store"
            title="Remove from this store"
            className="shrink-0 rounded p-1 text-inventory-text-subtle hover:bg-inventory-danger/10 hover:text-inventory-danger-hover cursor-pointer"
          >
            <Trash className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 border-t border-inventory-border pt-1.5">
          <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[11px] font-medium text-inventory-text-muted">
            <input type="checkbox" checked={!excluded} onChange={onToggleInclude} className="rounded border-inventory-border-strong text-inventory-secondary" />
            Include
          </label>
          <input
            type="text"
            value={altValue}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Alt text"
            aria-label="Alt text for image"
            className="min-w-0 flex-1 rounded border border-inventory-border px-1.5 py-1 text-[11px] outline-none focus:border-inventory-primary"
          />
        </div>
      </figcaption>
    </figure>
  );
}
