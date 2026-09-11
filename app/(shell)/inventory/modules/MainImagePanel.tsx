"use client";

import { resolveSwatch } from "@/lib/inventory/colour";
import GalleryThumbRow from "./GalleryThumbRow";
import type { useProductImages } from "./hooks/useProductImages";
import { Expand, Image as ImageIcon, Pencil } from "./icons";

type MainImagePanelProps = {
  gallery: ReturnType<typeof useProductImages>;
  productName: string;
  onEditImages: () => void;
};

/** `.btn.xs` — 22px tall action button, used at the bottom of several panels. */
export const BTN_XS =
  "flex h-[22px] items-center justify-center gap-1 rounded-[6px] border border-gray-300 px-[6px] text-[10px] font-bold leading-none text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";
export const BTN_XS_PRIMARY =
  "flex h-[22px] items-center justify-center gap-1 rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";
/** Shared footer action-row wrapper — border-top strip housing one or more `.btn.xs` buttons. */
export const BTN_ROW = 'flex gap-[6px] border-t border-gray-100 p-[6px]';
/** `.iconbtn.xs` — 22×22 icon-only button. */
export const ICONBTN_XS =
  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-gray-300 text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer";

export default function MainImagePanel({
  gallery,
  productName,
  onEditImages,
}: MainImagePanelProps) {
  const { images, tiles, active, activeKey, setActiveKey } = gallery;

  return (
    <section className="flex min-w-0 flex-col rounded-[10px] border border-gray-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.05)]">
      <PanelHeading
        icon={<ImageIcon className="h-3 w-3" />}
        title="Main image"
        meta={`${images.length} image${images.length === 1 ? "" : "s"}`}
      />

      <div className="flex flex-col gap-[4px] p-[6px]">
        <div className="min-w-0">
          <button
            type="button"
            onClick={gallery.openLightbox}
            disabled={!active}
            aria-label="Enlarge image"
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] border border-gray-200 bg-gray-50 disabled:cursor-default cursor-zoom-in"
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

        {tiles.length > 0 && (
          <GalleryThumbRow tiles={tiles} activeKey={activeKey} onSelect={setActiveKey} />
        )}
      </div>

      <div className="flex gap-[4px] border-t border-gray-100 p-[6px]">
        <button type="button" onClick={gallery.openLightbox} disabled={!active} className={`flex-1 ${BTN_XS}`}>
          <Expand className="h-3 w-3 min-w-3" />
          Enlarge
        </button>
        <button type="button" onClick={onEditImages} className={`flex-1 ${BTN_XS}`}>
          <Pencil className="h-3 w-3 min-w-3" />
          Edit ({images.length})
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
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-[8px] py-[3px]">
      <div className="flex min-w-0 items-center gap-[5px] text-gray-400" title={title}>
        {icon}
        <h3 className="truncate text-[9.5px] font-bold uppercase leading-none tracking-[0.5px] text-gray-500">{title}</h3>
      </div>
      <div className="flex shrink-0 items-center gap-[5px]">
        {meta && <span className="whitespace-nowrap rounded-full bg-gray-100 px-[6px] py-[1px] text-[9.5px] font-bold leading-none text-gray-600">{meta}</span>}
        {action}
      </div>
    </div>
  );
}
