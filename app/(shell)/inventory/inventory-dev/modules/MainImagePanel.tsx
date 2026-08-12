'use client';

import { Expand, Image as ImageIcon, Pencil } from './icons';
import { getSwatch } from './utils';
import type { useProductImages } from './hooks/useProductImages';

type MainImagePanelProps = {
  gallery: ReturnType<typeof useProductImages>;
  onEditImages: () => void;
};

export default function MainImagePanel({ gallery, onEditImages }: MainImagePanelProps) {
  const { images, active } = gallery;

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<ImageIcon className="h-4 w-4" />} title="Main image" meta={`${images.length} image${images.length === 1 ? '' : 's'}`} />

      <div className="flex flex-1 gap-2 p-3">
        {images.length > 0 && (
          <div className="max-h-72 w-14 shrink-0 space-y-2 overflow-y-auto pr-1">
            {images.map((image) => {
              const isActive = image.id === gallery.activeId;
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => gallery.setActiveId(image.id)}
                  title={image.colour ?? image.altText ?? 'Image'}
                  aria-label={`Show ${image.colour ?? image.altText ?? 'image'}`}
                  aria-pressed={isActive}
                  className={`block w-full overflow-hidden rounded-lg border-2 transition-colors duration-150 cursor-pointer ${
                    isActive ? 'border-blue-600' : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.altText ?? ''} className="aspect-square w-full object-cover" />
                  {image.colour && (
                    <span className="flex items-center justify-center gap-1 bg-gray-50 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getSwatch(image.colour) }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={gallery.openLightbox}
            disabled={!active}
            aria-label="Enlarge image"
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 disabled:cursor-default cursor-zoom-in"
          >
            {active ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.url} alt={active.altText ?? ''} className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-gray-400">
                <ImageIcon className="h-6 w-6" />
                <span className="text-xs">No images</span>
              </span>
            )}
          </button>
          {active?.colour && <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">{active.colour}</p>}
        </div>
      </div>

      <div className="flex gap-2 border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={gallery.openLightbox}
          disabled={!active}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-1.5 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Expand />
          Enlarge
        </button>
        <button
          type="button"
          onClick={onEditImages}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-1.5 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
        >
          <Pencil />
          Edit images ({images.length})
        </button>
      </div>
    </section>
  );
}

export function PanelHeading({ icon, title, meta }: { icon: React.ReactNode; title: string; meta?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-1.5 text-gray-400">
        {icon}
        <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      </div>
      {meta && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{meta}</span>}
    </div>
  );
}
