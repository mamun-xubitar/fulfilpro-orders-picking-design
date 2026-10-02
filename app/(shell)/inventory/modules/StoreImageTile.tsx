'use client';

import { useState } from 'react';
import StoreSystemImageMenu from './StoreSystemImageMenu';
import { Image as ImageIcon, Trash, Upload } from './icons';
import type { ProductImage } from './types';

export const IMAGE_TILE_SIZE = 'h-[110px] w-[110px]';

type StoreImageTileProps = {
  url: string;
  altText: string | null;
  position: number;
  /** Another store-image action is running — disables this tile's buttons. */
  busy?: boolean;
  /** This tile's own action is running — shows its spinner. */
  saving?: boolean;
  /** System images offered by the "update from system image" dropdown. */
  systemImages?: ProductImage[];
  onUploadUpdate?: () => void;
  onSystemUpdate?: (image: ProductImage) => void;
  onDelete?: () => void;
};

const ICON_BTN =
  'flex h-[24px] w-[24px] items-center justify-center rounded-[6px] bg-inventory-surface/95 text-inventory-text-muted shadow-inventory transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

/** One gallery image at 110×110. A store tile (any of the update / delete handlers) reveals its icon
 * buttons on hover or keyboard focus — and always on touch, where there is no hover: upload a new
 * file over it, pick one of the system images for it, or delete it. A system tile is just the
 * picture and its number. */
export default function StoreImageTile({ url, altText, position, busy, saving, systemImages, onUploadUpdate, onSystemUpdate, onDelete }: StoreImageTileProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const actionable = Boolean(onUploadUpdate || onSystemUpdate || onDelete);
  const disabled = busy || saving;

  return (
    <div className={`group relative ${IMAGE_TILE_SIZE} shrink-0 overflow-hidden rounded-[8px] border border-inventory-border bg-inventory-surface-muted`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={altText ?? `Image ${position}`} className="h-full w-full object-cover" loading="lazy" />
      <span className="absolute left-[4px] top-[4px] rounded-[5px] bg-black/60 px-[5px] py-[2px] text-[9.5px] font-bold leading-none tabular-nums text-white">{position}</span>
      {actionable && (
        <div
          className={`absolute right-[4px] top-[4px] flex gap-[3px] transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {onUploadUpdate && (
            <button type="button" onClick={onUploadUpdate} disabled={disabled} aria-label={`Update image ${position} by uploading a file`} title="Update by upload" className={`${ICON_BTN} hover:text-inventory-primary`}>
              <Upload className="h-3 w-3" />
            </button>
          )}
          {onSystemUpdate && systemImages && (
            <StoreSystemImageMenu
              systemImages={systemImages}
              onOpenChange={setMenuOpen}
              onPick={onSystemUpdate}
              renderTrigger={({ ref, onClick, open }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={onClick}
                  disabled={disabled}
                  aria-haspopup="listbox"
                  aria-expanded={open}
                  aria-label={`Update image ${position} from a system image`}
                  title="Update from system image"
                  className={`${ICON_BTN} hover:text-inventory-primary ${open ? 'text-inventory-primary' : ''}`}
                >
                  <ImageIcon className="h-3 w-3" />
                </button>
              )}
            />
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} disabled={disabled} aria-label={`Delete image ${position}`} title="Delete image" className={`${ICON_BTN} hover:text-inventory-danger`}>
              <Trash className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
      {saving && (
        <div className="absolute inset-0 flex items-center justify-center bg-inventory-surface/70">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-inventory-border-strong border-t-inventory-primary" />
        </div>
      )}
    </div>
  );
}

/** The dashed "+ Add image" tile that ends the store column. */
export function StoreImageAddTile({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Add image to the store"
      className={`flex ${IMAGE_TILE_SIZE} shrink-0 flex-col items-center justify-center gap-[4px] rounded-[8px] border border-dashed border-inventory-border-strong text-[10.5px] font-bold text-inventory-text-subtle transition-colors duration-150 hover:border-inventory-primary hover:bg-inventory-primary/5 hover:text-inventory-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
    >
      {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-inventory-border-strong border-t-inventory-primary" /> : <PlusGlyph />}
      Add image
    </button>
  );
}

function PlusGlyph() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
