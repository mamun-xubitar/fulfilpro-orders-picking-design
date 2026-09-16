'use client';

import { resolveSwatch } from '@/lib/inventory/colour';
import { Image as ImageIcon } from './icons';
import { deriveImageFilename } from './utils';
import type { GalleryTile } from './utils';

type GalleryPreviewProps = {
  active: GalleryTile | null;
  productName: string;
};

export default function GalleryPreview({ active, productName }: GalleryPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex max-h-[65vh] items-center justify-center">
        {active ? (
          active.kind === 'photo' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={active.image.url} alt={active.image.altText ?? ''} className="max-h-[65vh] max-w-full object-contain" />
          ) : (
            <div
              className="flex aspect-square max-h-[65vh] w-[65vh] max-w-full items-center justify-center rounded-xl px-6 text-center"
              style={{ backgroundColor: resolveSwatch(active.color) }}
            >
              <span className="text-lg font-semibold text-white line-clamp-2" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
                {productName || active.label}
              </span>
            </div>
          )
        ) : (
          <span className="flex flex-col items-center gap-1 text-inventory-text-subtle">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">No images</span>
          </span>
        )}
      </div>

      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-white/80">{captionFor(active, productName)}</p>
    </div>
  );
}

function captionFor(active: GalleryTile | null, productName: string): string {
  if (!active) return '';
  if (active.kind === 'placeholder') return productName ? `${productName} — ${active.colourName}` : active.colourName;
  if (productName) return productName;
  return active.image.altText || deriveImageFilename(active.image.url) || active.label;
}
