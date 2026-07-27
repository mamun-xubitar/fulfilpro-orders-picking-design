'use client';

import GalleryThumbRail from './GalleryThumbRail';
// import GallerySizeBreakdown from './GallerySizeBreakdown';
import type { GalleryEntry, SizeCount } from './types';

type GalleryLightboxProps = {
  entries: GalleryEntry[];
  active: GalleryEntry;
  activeKey: string | undefined;
  onSelect: (key: string) => void;
  breakdown: SizeCount[];
  heading: string;
  title: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function GalleryLightbox({
  entries,
  active,
  activeKey,
  onSelect,
  breakdown,
  heading,
  title,
  onClose,
  onPrev,
  onNext,
}: GalleryLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button className="absolute top-4 right-4 text-white/80 hover:text-white cursor-pointer" onClick={onClose} aria-label="Close">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="w-28 shrink-0 overflow-y-auto max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <GalleryThumbRail entries={entries} activeKey={activeKey} onSelect={onSelect} expanded />
      </div>

      {entries.length > 1 && (
        <button
          className="absolute left-4 text-white/80 hover:text-white cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active.url} alt={active.altText ?? title} className="max-h-[75vh] max-w-full object-contain" />
        {/* <GallerySizeBreakdown heading={heading} breakdown={breakdown} dark /> */}
      </div>

      {entries.length > 1 && (
        <button
          className="absolute right-4 text-white/80 hover:text-white cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
