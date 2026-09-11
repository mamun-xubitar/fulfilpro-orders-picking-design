'use client';

import { useZoom } from './ZoomContext';

/** Compact zoom-out / reset-to-100% / zoom-in trio for the shell header, shown only on the
 * Inventory page (the only page that currently consumes `useZoom()`'s value). */
export default function ZoomControl() {
  const { zoomPercent, defaultZoom, zoomIn, zoomOut, resetZoom } = useZoom();

  return (
    <div role="group" aria-label="Page zoom" className="flex items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
      <button
        type="button"
        onClick={zoomOut}
        title="Zoom out (Ctrl -)"
        aria-label="Zoom out"
        className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer"
      >
        <ZoomOutIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={resetZoom}
        title={`Reset zoom to ${defaultZoom}% (Ctrl 0)`}
        aria-label="Reset zoom"
        className="flex h-7 items-center gap-1 border-x border-gray-200 bg-gray-50 px-1.5 text-gray-600 hover:bg-gray-100 cursor-pointer"
      >
        <ResetIcon className="h-3.5 w-3.5" />
        <span className="text-[10.5px] font-bold tabular-nums">{zoomPercent}%</span>
      </button>
      <button
        type="button"
        onClick={zoomIn}
        title="Zoom in (Ctrl +)"
        aria-label="Zoom in"
        className="flex h-7 w-7 items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer"
      >
        <ZoomInIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  );
}

function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
