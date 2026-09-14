'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { resolveSwatch } from '@/lib/inventory/colour';
import { ChevronLeft, ChevronRight } from './icons';
import type { GalleryTile } from './utils';

type GalleryThumbRowProps = {
  tiles: GalleryTile[];
  activeKey: string | null;
  onSelect: (key: string) => void;
};

const DRAG_THRESHOLD_PX = 5;
const ARROW_SCROLL_PX = 120;

/**
 * Scrollable thumbnail rail — left/right arrow buttons, click-and-drag scrolling, and a functional
 * custom scrollbar below the row. The viewport's native scrollbar is hidden (`no-scrollbar`);
 * wheel/touch/drag scrolling still work, and the custom track below handles click-to-jump plus
 * drag-the-thumb scrolling. Shared by the panel (`MainImagePanel`) and the lightbox
 * (`InventoryModals`) — the `{ tiles, activeKey, onSelect }` contract is unchanged.
 */
export default function GalleryThumbRow({ tiles, activeKey, onSelect }: GalleryThumbRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, startX: 0, startScrollLeft: 0, moved: false });
  const thumbDrag = useRef<{ startX: number; startScrollLeft: number; trackWidth: number } | null>(null);
  const viewportId = useId();
  const [scrollState, setScrollState] = useState({ atStart: true, atEnd: true, trackLeft: 0, trackWidth: 100 });

  const updateScrollState = () => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setScrollState({ atStart: true, atEnd: true, trackLeft: 0, trackWidth: 100 });
      return;
    }
    setScrollState({
      atStart: scrollLeft <= 0,
      atEnd: scrollLeft >= maxScroll - 1,
      trackLeft: (scrollLeft / scrollWidth) * 100,
      trackWidth: (clientWidth / scrollWidth) * 100,
    });
  };

  useEffect(() => {
    updateScrollState();
    const el = viewportRef.current;
    if (!el) return;
    window.addEventListener('resize', updateScrollState);
    if (typeof ResizeObserver === 'undefined') return () => window.removeEventListener('resize', updateScrollState);
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [tiles.length]);

  if (tiles.length === 0) return null;

  const scrollByStep = (direction: 1 | -1) => {
    viewportRef.current?.scrollBy({ left: direction * ARROW_SCROLL_PX, behavior: 'smooth' });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const el = viewportRef.current;
    if (!el) return;
    dragState.current = { dragging: true, startX: e.clientX, startScrollLeft: el.scrollLeft, moved: false };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const el = viewportRef.current;
    const drag = dragState.current;
    if (!el || !drag.dragging) return;
    const delta = e.clientX - drag.startX;
    if (Math.abs(delta) > DRAG_THRESHOLD_PX) drag.moved = true;
    el.scrollLeft = drag.startScrollLeft - delta;
  };

  const endDrag = () => {
    dragState.current.dragging = false;
  };

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    thumbDrag.current = { startX: e.clientX, startScrollLeft: viewport.scrollLeft, trackWidth: track.clientWidth };
  };

  const onThumbPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = thumbDrag.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.trackWidth <= 0) return;
    const dx = e.clientX - drag.startX;
    viewport.scrollLeft = drag.startScrollLeft + dx * (viewport.scrollWidth / drag.trackWidth);
  };

  const endThumbDrag = () => {
    thumbDrag.current = null;
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Clicks on the thumb itself are handled by the thumb drag — only jump when the track is hit.
    if (e.target !== e.currentTarget) return;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    viewport.scrollTo({ left: ratio * viewport.scrollWidth - viewport.clientWidth / 2, behavior: 'smooth' });
  };

  // A drag release can land the mouseup directly on a thumbnail button, which would otherwise
  // fire that button's onClick right after — swallow just that one click in the capture phase.
  const onClickCapture = (e: React.MouseEvent) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => scrollByStep(-1)}
          disabled={scrollState.atStart}
          aria-label="Scroll thumbnails left"
          className="flex h-[26px] w-[22px] shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/85 text-gray-900 shadow-md backdrop-blur-sm transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div
          ref={viewportRef}
          id={viewportId}
          onScroll={updateScrollState}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onClickCapture={onClickCapture}
          className="no-scrollbar flex flex-1 cursor-grab gap-[4px] overflow-x-auto overflow-y-hidden px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden active:cursor-grabbing"
        >
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
                className={`h-[26px] w-[26px] shrink-0 overflow-hidden rounded-[5px] border-2 transition-colors duration-150 cursor-pointer ${
                  isActive ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                }`}
              >
                {tile.kind === 'photo' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tile.image.url} alt={tile.image.altText ?? ''} className="h-full w-full object-cover" draggable={false} />
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
        <button
          type="button"
          onClick={() => scrollByStep(1)}
          disabled={scrollState.atEnd}
          aria-label="Scroll thumbnails right"
          className="flex h-[26px] w-[22px] shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/85 text-gray-900 shadow-md backdrop-blur-sm transition-colors duration-150 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      {!(scrollState.atStart && scrollState.atEnd) && (
        <div
          ref={trackRef}
          role="scrollbar"
          aria-orientation="horizontal"
          aria-controls={viewportId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrollState.trackLeft)}
          aria-valuetext={`${Math.round(scrollState.trackLeft)} percent scrolled`}
          aria-label="Scroll thumbnails"
          onPointerDown={onTrackPointerDown}
          className="relative h-[4px] cursor-pointer rounded-full bg-gray-100"
        >
          <div
            role="presentation"
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={endThumbDrag}
            onPointerCancel={endThumbDrag}
            className="absolute inset-y-0 min-w-[16px] cursor-grab touch-none rounded-full bg-gray-300 transition-colors hover:bg-gray-400 active:cursor-grabbing"
            style={{ left: `${scrollState.trackLeft}%`, width: `${scrollState.trackWidth}%` }}
          />
        </div>
      )}
    </div>
  );
}
