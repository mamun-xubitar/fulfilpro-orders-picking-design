'use client';

import { getShopifyThumbnailUrl } from '../../modules/utils';
import type { GalleryEntry } from './types';

type GalleryThumbRailProps = {
  entries: GalleryEntry[];
  activeKey: string | undefined;
  onSelect: (key: string) => void;
  expanded?: boolean;
};

export default function GalleryThumbRail({ entries, activeKey, onSelect, expanded }: GalleryThumbRailProps) {
  const colorEntries = entries.filter((e) => e.kind === 'color');
  const otherEntries = entries.filter((e) => e.kind !== 'color');

  const thumbSize = expanded ? 80 : 56;
  const thumbClass = expanded ? 'w-14 h-14' : 'w-10 h-10';
  const headerClass = expanded ? 'text-xs font-semibold text-white/70 px-1' : 'text-xs font-semibold text-gray-500 px-1';
  const labelClass = expanded ? 'text-[10px] text-white/70 truncate w-full text-center' : 'text-[10px] text-gray-500 truncate w-full text-center';

  const renderThumb = (entry: GalleryEntry) => (
    <button key={entry.key} onClick={() => onSelect(entry.key)} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
      <div
        className={`${thumbClass} rounded-lg overflow-hidden border-2 ${entry.key === activeKey ? 'border-blue-500' : 'border-transparent'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getShopifyThumbnailUrl(entry.url, thumbSize)} alt={entry.altText ?? entry.label} className="w-full h-full object-cover" />
      </div>
      {entry.kind === 'color' && <span className={labelClass}>{entry.label}</span>}
    </button>
  );

  return (
    <div className={`flex flex-col gap-3 overflow-y-auto ${expanded ? 'max-h-full' : 'max-h-40'}`}>
      {colorEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={headerClass}>Colors</span>
          <div className="flex flex-col gap-2">{colorEntries.map(renderThumb)}</div>
        </div>
      )}
      {otherEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={headerClass}>Other</span>
          <div className="flex flex-col gap-2">{otherEntries.map(renderThumb)}</div>
        </div>
      )}
    </div>
  );
}
