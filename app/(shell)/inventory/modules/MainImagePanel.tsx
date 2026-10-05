"use client";

import { resolveSwatch } from "@/lib/inventory/colour";
import GalleryThumbRow from "./GalleryThumbRow";
import { useInventoryAccess } from "./InventoryAccess";
import type { useProductImages } from "./hooks/useProductImages";
import { Expand, Image as ImageIcon, Pencil } from "./icons";

type MainImagePanelProps = {
  gallery: ReturnType<typeof useProductImages>;
  productName: string;
  onEditImages: () => void;
};

/** `.btn.xs` — 22px tall action button, used at the bottom of several panels. */
export const BTN_XS =
  "flex h-[22px] items-center justify-center gap-1 rounded-[6px] border border-inventory-border-strong px-[6px] text-[10px] font-bold leading-none text-inventory-text-muted transition-[color,background-color,border-color,box-shadow] duration-200 ease-out hover:border-inventory-primary/40 hover:bg-inventory-surface-hover hover:text-inventory-primary disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";
export const BTN_XS_PRIMARY =
  "flex h-[22px] items-center justify-center gap-1 rounded-[6px] bg-inventory-primary px-[6px] text-[10px] font-bold leading-none text-white transition-[background-color,box-shadow] duration-200 ease-out hover:bg-inventory-primary-hover hover:shadow-inventory-md disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer";
/** Shared footer action-row wrapper — border-top strip housing one or more `.btn.xs` buttons. */
export const BTN_ROW = 'flex gap-[6px] border-t border-inventory-divider p-[6px]';
/** Height cap shared by the five top-row panels; each scrolls its own body past this. */
export const PANEL_MAX_H = 'max-h-[285px]';
/** `.iconbtn.xs` — 22×22 icon-only button. */
export const ICONBTN_XS =
  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] border border-inventory-border-strong text-inventory-text-muted transition-[color,background-color,border-color] duration-200 ease-out hover:border-inventory-primary/40 hover:bg-inventory-surface-hover hover:text-inventory-primary cursor-pointer";

export default function MainImagePanel({
  gallery,
  productName,
  onEditImages,
}: MainImagePanelProps) {
  const { images, tiles, active, activeKey, setActiveKey } = gallery;
  const { canEdit } = useInventoryAccess();

  return (
    <section className={`flex min-w-0 flex-col rounded-[10px] border ${panelBorderClass("image")} bg-inventory-surface shadow-inventory ${PANEL_MAX_H}`}>
      <PanelHeading
        tone="image"
        icon={<ImageIcon className="h-3 w-3" />}
        title="Main image"
        meta={`${images.length} image${images.length === 1 ? "" : "s"}`}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-[4px] overflow-y-auto thin-scroll p-[6px]">
        <div className="min-w-0">
          <button
            type="button"
            onClick={gallery.openLightbox}
            disabled={!active}
            aria-label="Enlarge image"
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[8px] border border-inventory-border bg-inventory-surface-muted disabled:cursor-default cursor-zoom-in"
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
              <span className="flex flex-col items-center gap-1 text-inventory-text-subtle">
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

      <div className="flex gap-[4px] border-t border-inventory-divider p-[6px]">
        <button type="button" onClick={gallery.openLightbox} disabled={!active} className={`flex-1 ${BTN_XS}`}>
          <Expand className="h-3 w-3 min-w-3" />
          Enlarge
        </button>
        {canEdit && (
          <button type="button" onClick={onEditImages} className={`flex-1 ${BTN_XS}`}>
            <Pencil className="h-3 w-3 min-w-3" />
            Edit ({images.length})
          </button>
        )}
      </div>
    </section>
  );
}

/** One accent hue per panel (see app/globals.css `--color-inventory-sec-*`) so sections stay
 * visually distinguishable at a glance without changing any layout. Written as a static lookup
 * (rather than a template-built class name) so Tailwind can see every class at build time. */
export type PanelTone =
  | "image"
  | "details"
  | "pricing"
  | "stock"
  | "stores"
  | "variants"
  | "po"
  | "stocktake"
  | "adjust"
  | "import"
  | "activity"
  | "toolbar"
  | "subtabs";

const TONE_CLASSES: Record<PanelTone, { bar: string; text: string; border: string; cardBorder: string; tint: string; chip: string }> = {
  image: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-image)]", text: "text-inventory-sec-image", border: "border-inventory-sec-image/25", cardBorder: "border-inventory-sec-image/45", tint: "bg-inventory-sec-image/[7%]", chip: "ring-inventory-sec-image/30" },
  details: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-details)]", text: "text-inventory-sec-details", border: "border-inventory-sec-details/25", cardBorder: "border-inventory-sec-details/45", tint: "bg-inventory-sec-details/[7%]", chip: "ring-inventory-sec-details/30" },
  pricing: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-pricing)]", text: "text-inventory-sec-pricing", border: "border-inventory-sec-pricing/25", cardBorder: "border-inventory-sec-pricing/45", tint: "bg-inventory-sec-pricing/[7%]", chip: "ring-inventory-sec-pricing/30" },
  stock: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-stock)]", text: "text-inventory-sec-stock", border: "border-inventory-sec-stock/25", cardBorder: "border-inventory-sec-stock/45", tint: "bg-inventory-sec-stock/[7%]", chip: "ring-inventory-sec-stock/30" },
  stores: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-stores)]", text: "text-inventory-sec-stores", border: "border-inventory-sec-stores/25", cardBorder: "border-inventory-sec-stores/45", tint: "bg-inventory-sec-stores/[7%]", chip: "ring-inventory-sec-stores/30" },
  variants: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-variants)]", text: "text-inventory-sec-variants", border: "border-inventory-sec-variants/25", cardBorder: "border-inventory-sec-variants/45", tint: "bg-inventory-sec-variants/[7%]", chip: "ring-inventory-sec-variants/30" },
  po: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-po)]", text: "text-inventory-sec-po", border: "border-inventory-sec-po/25", cardBorder: "border-inventory-sec-po/45", tint: "bg-inventory-sec-po/[7%]", chip: "ring-inventory-sec-po/30" },
  stocktake: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-stocktake)]", text: "text-inventory-sec-stocktake", border: "border-inventory-sec-stocktake/25", cardBorder: "border-inventory-sec-stocktake/45", tint: "bg-inventory-sec-stocktake/[7%]", chip: "ring-inventory-sec-stocktake/30" },
  adjust: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-adjust)]", text: "text-inventory-sec-adjust", border: "border-inventory-sec-adjust/25", cardBorder: "border-inventory-sec-adjust/45", tint: "bg-inventory-sec-adjust/[7%]", chip: "ring-inventory-sec-adjust/30" },
  import: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-import)]", text: "text-inventory-sec-import", border: "border-inventory-sec-import/25", cardBorder: "border-inventory-sec-import/45", tint: "bg-inventory-sec-import/[7%]", chip: "ring-inventory-sec-import/30" },
  activity: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-activity)]", text: "text-inventory-sec-activity", border: "border-inventory-sec-activity/25", cardBorder: "border-inventory-sec-activity/45", tint: "bg-inventory-sec-activity/[7%]", chip: "ring-inventory-sec-activity/30" },
  toolbar: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-toolbar)]", text: "text-inventory-sec-toolbar", border: "border-inventory-sec-toolbar/25", cardBorder: "border-inventory-sec-toolbar/45", tint: "bg-inventory-sec-toolbar/[7%]", chip: "ring-inventory-sec-toolbar/30" },
  subtabs: { bar: "shadow-[inset_3px_0_0_0_var(--color-inventory-sec-subtabs)]", text: "text-inventory-sec-subtabs", border: "border-inventory-sec-subtabs/25", cardBorder: "border-inventory-sec-subtabs/45", tint: "bg-inventory-sec-subtabs/[7%]", chip: "ring-inventory-sec-subtabs/30" },
};

/** Border color for a panel's outer card, matching its heading's tone but at higher opacity
 * than the heading's own border — the heading sits on a tinted strip so a lighter line already
 * reads, but the outer edge sits on plain white/surface and needs more contrast to register as
 * "this section's color" rather than a generic gray card border. */
export function panelBorderClass(tone: PanelTone) {
  return TONE_CLASSES[tone].cardBorder;
}

export function PanelHeading({
  icon,
  title,
  meta,
  action,
  tone = "details",
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  action?: React.ReactNode;
  tone?: PanelTone;
}) {
  const c = TONE_CLASSES[tone];
  return (
    <div className={`flex items-center justify-between gap-2 border-b px-[8px] py-[3px] ${c.bar} ${c.border} ${c.tint}`}>
      <div className={`flex min-w-0 items-center gap-[5px] ${c.text}`} title={title}>
        {icon}
        <h3 className={`truncate text-[9.5px] font-bold uppercase leading-none tracking-[0.5px] ${c.text}`}>{title}</h3>
      </div>
      <div className="flex shrink-0 items-center gap-[5px]">
        {meta && (
          <span className={`whitespace-nowrap rounded-full bg-inventory-surface px-[6px] py-[1px] text-[9.5px] font-bold leading-none ring-1 ring-inset ${c.text} ${c.chip}`}>
            {meta}
          </span>
        )}
        {action}
      </div>
    </div>
  );
}
