'use client';

import { resolveSwatch } from '@/lib/inventory/colour';
import type { GalleryGroup } from './utils';

type GalleryThumbRowProps = {
  groups: GalleryGroup[];
  activeKey: string | null;
  onSelect: (key: string) => void;
};

export default function GalleryThumbRow({ groups, activeKey, onSelect }: GalleryThumbRowProps) {
  if (groups.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-1">
      {groups.map((group) => {
        const isActive = group.key === activeKey;
        const label = group.colourName ?? 'Unassigned';
        return (
          <button
            key={group.key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(group.key);
            }}
            title={label}
            aria-label={`Show ${label}`}
            aria-pressed={isActive}
            className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition-colors duration-150 cursor-pointer ${
              isActive ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
            }`}
          >
            {group.kind === 'photo' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.image.url} alt={group.image.altText ?? ''} className="h-full w-full object-cover" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-white"
                style={{ backgroundColor: resolveSwatch(group.color), textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
              >
                {group.colourName.slice(0, 3).toUpperCase()}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
