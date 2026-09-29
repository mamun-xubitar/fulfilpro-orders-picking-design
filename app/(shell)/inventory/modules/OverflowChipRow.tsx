'use client';

import { useLayoutEffect, useRef, useState } from 'react';

type OverflowChipRowProps = {
  /** One entry per chip, in already-sorted display order. `label` is the plain-text name, used
   * only to build the "+N" badge's title tooltip. */
  items: { key: string; label: string; node: React.ReactNode }[];
  /** Opens the Colour & size adjustment modal — same handler the field's own "+" button uses. */
  onShowMore: () => void;
  emptyLabel?: string;
};

/**
 * Single-line chip row (item 6b) for the Product details panel only — never used inside the
 * Colour & size adjustment modal itself, which keeps its own multi-line list. Renders every chip
 * once into a hidden, non-wrapping measuring layer to read each chip's real width via a
 * ResizeObserver on the visible container, then shows however many fit plus a "+N" badge for the
 * rest. The badge opens the same modal as the field's existing "+" edit button.
 */
export default function OverflowChipRow({ items, onShowMore, emptyLabel = '—' }: OverflowChipRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const badgeMeasureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const recalc = () => {
      const available = container.clientWidth;
      if (available <= 0 || items.length === 0) {
        setVisibleCount(items.length);
        return;
      }
      const chipEls = Array.from(measure.children) as HTMLElement[];
      const gap = 4; // matches gap-[4px] below
      const badgeWidth = badgeMeasureRef.current?.offsetWidth ?? 28;

      let used = 0;
      let count = 0;
      for (let i = 0; i < chipEls.length; i++) {
        const w = chipEls[i].offsetWidth;
        const isLast = i === chipEls.length - 1;
        // Reserve room for the "+N" badge unless this chip is the very last one (nothing left
        // to collapse, so no badge is needed).
        const reserve = isLast ? 0 : badgeWidth + gap;
        const next = used + (count > 0 ? gap : 0) + w;
        if (next + reserve > available) break;
        used = next;
        count++;
      }
      setVisibleCount(Math.max(count, items.length > 0 ? 1 : 0));
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(container);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) {
    return <span className="text-[11px] leading-none text-inventory-text-subtle">{emptyLabel}</span>;
  }

  const shown = items.slice(0, visibleCount);
  const hiddenCount = items.length - shown.length;

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1 items-center gap-[4px] overflow-hidden">
      {shown.map((item) => (
        <span key={item.key} className="shrink-0">
          {item.node}
        </span>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            // Stops the click reaching a clickable parent (the Suppliers trigger toggles its
            // dropdown on click, which would immediately undo this open).
            e.stopPropagation();
            onShowMore();
          }}
          aria-label={`Show ${hiddenCount} more`}
          title={items.slice(visibleCount).map((i) => i.label).join(', ')}
          className="inline-flex shrink-0 items-center rounded-full border border-inventory-border-strong bg-inventory-surface-muted px-[6px] py-[1px] text-[9px] font-bold leading-none text-inventory-text-muted hover:bg-inventory-surface-hover cursor-pointer"
        >
          +{hiddenCount}
        </button>
      )}

      {/* Hidden measuring layer — same chips, non-wrapping, off-screen. Widths are read via
          offsetWidth in the effect above; never shown to the user. `inert` keeps any focusable
          chip content (e.g. a supplier chip's remove control) out of the tab order. */}
      <div ref={measureRef} aria-hidden inert className="pointer-events-none absolute left-0 top-0 flex -translate-y-full gap-[4px] opacity-0">
        {items.map((item) => (
          <span key={item.key}>{item.node}</span>
        ))}
      </div>
      <span
        ref={badgeMeasureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -translate-y-full rounded-full border border-inventory-border-strong px-[6px] py-[1px] text-[9px] font-bold leading-none opacity-0"
      >
        +99
      </span>
    </div>
  );
}
