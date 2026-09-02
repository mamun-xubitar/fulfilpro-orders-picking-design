'use client';

import { resolveSwatch } from '@/lib/inventory/colour';
import type { GalleryTile } from './utils';

type GalleryThumbRowProps = {
  tiles: GalleryTile[];
  activeKey: string | null;
  onSelect: (key: string) => void;
};

export default function GalleryThumbRow({ tiles, activeKey, onSelect }: GalleryThumbRowProps) {
  if (tiles.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-1">
      {tiles.map((tile) => {
        const isActive = tile.key === activeKey;
        return (
          <button
            key={tile.key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(tile.key);
            }}
            title={tile.label}
            aria-label={`Show ${tile.label}`}
            aria-pressed={isActive}
            className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-colors duration-150 cursor-pointer ${
              isActive ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
            }`}
          >
            {tile.kind === 'photo' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tile.image.url} alt={tile.image.altText ?? ''} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-white"
                style={{ backgroundColor: resolveSwatch(tile.color), textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
              >
                {tile.colourName.slice(0, 3).toUpperCase()}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
