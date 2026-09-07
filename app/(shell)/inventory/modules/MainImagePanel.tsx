"use client";

import { resolveSwatch } from "@/lib/inventory/colour";
import type { useProductImages } from "./hooks/useProductImages";
import { Expand, Image as ImageIcon, Pencil } from "./icons";

type MainImagePanelProps = {
  gallery: ReturnType<typeof useProductImages>;
  productName: string;
  onEditImages: () => void;
};

export default function MainImagePanel({
  gallery,
  productName,
  onEditImages,
}: MainImagePanelProps) {
  const { images, tiles, active, activeKey, setActiveKey } = gallery;

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading
        icon={<ImageIcon className="h-4 w-4" />}
        title="Main image"
        meta={`${images.length} image${images.length === 1 ? "" : "s"}`}
      />

      <div className="flex flex-1 gap-2 p-3">
        {tiles.length > 0 && (
          <div className="max-h-72 w-14 shrink-0 space-y-2 overflow-y-auto pr-1">
            {tiles.map((tile) => {
              const isActive = tile.key === activeKey;
              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() => setActiveKey(tile.key)}
                  title={tile.label}
                  aria-label={`Show ${tile.label}`}
                  aria-pressed={isActive}
                  className={`block w-full overflow-hidden rounded-lg border-2 transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? "border-blue-600"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  {tile.kind === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tile.image.url}
                      alt={tile.image.altText ?? ""}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex aspect-square w-full items-center justify-center text-[9px] font-semibold text-white"
                      style={{
                        backgroundColor: resolveSwatch(tile.color),
                        textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                      }}
                    >
                      {tile.colourName.slice(0, 3).toUpperCase()}
                    </div>
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
              active.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={active.image.url}
                  alt={active.image.altText ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center px-3 text-center "
                  style={{ backgroundColor: resolveSwatch(active.color) }}
                >
                  <span
                    className="text-base font-semibold text-white line-clamp-2"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.35)" }}
                  >
                    {productName || active.label}
                  </span>
                </div>
              )
            ) : (
              <span className="flex flex-col items-center gap-1 text-gray-400">
                <ImageIcon className="h-6 w-6" />
                <span className="text-xs">No images</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={gallery.openLightbox}
          disabled={!active}
          className="px-2 flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-1.5 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Expand className="min-w-4 h-4 w-4" />
          Enlarge
        </button>
        <button
          type="button"
          onClick={onEditImages}
          className="px-2 flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 py-1.5 text-[13px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
        >
          <Pencil className="min-w-4 h-4 w-4" />
          Edit images ({images.length})
        </button>
      </div>
    </section>
  );
}

export function PanelHeading({
  icon,
  title,
  meta,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  /** An optional trailing control (e.g. a "+" button) rendered after the meta badge. */
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-1.5 text-gray-400">
        {icon}
        <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </h3>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {meta && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">{meta}</span>
        )}
        {action}
      </div>
    </div>
  );
}
