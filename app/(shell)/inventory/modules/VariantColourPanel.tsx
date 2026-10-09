'use client';

import { useLayoutEffect, useRef } from 'react';

import { deriveColorFromName, formatColourName, resolveSwatch } from '@/lib/inventory/colour';
import type { OptionFilter } from './hooks/useVariantsMatrix';

type VariantColourPanelProps = {
  colour: OptionFilter;
  /** Reported after measuring the widest colour label; clamped 100–170. */
  onWidthChange: (width: number) => void;
};

// Fixed horizontal chrome of one colour row — px-[6px]×2 + checkbox w-3 + gap-[5px]×2 + swatch
// w-[7px] — plus the wrapper's 1px border-r, which the absolute-inset-0 panel doesn't get.
const ROW_CHROME = 42;

/**
 * The Variants / stock table's colour panel — lists every colour declared on the product, with no
 * Find, Save, Add or remove (✕): unlike the Colour & size adjustment modal's Colour column, this
 * never touches the product or its variants — it's a client-side filter over the table's rows,
 * same as the sizes dropdown beside it. Unchecking a colour hides its rows from the table (and the
 * totals below); it doesn't delete anything. Rendered by VariantsMatrixSection at the same height
 * as the table beside it. The panel measures its widest colour label and reports a width clamped
 * to 100–170px via onWidthChange; VariantsMatrixSection applies it, and labels past the cap wrap
 * onto a second line instead of truncating.
 */
export default function VariantColourPanel({ colour, onWidthChange }: VariantColourPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef(170);

  // buildOptionFilter rebuilds `items` with a new identity every render, so key the effect on the
  // joined names rather than the array.
  const namesKey = colour.items.map((item) => item.name).join('\n');

  useLayoutEffect(() => {
    const list = listRef.current;
    const measure = measureRef.current;
    if (!list || !measure) return;

    const recalc = () => {
      const scrollbar = list.offsetWidth - list.clientWidth;
      // getBoundingClientRect + ceil (not offsetWidth) — offsetWidth rounds to nearest and can
      // under-read by a fraction, wrapping a label that would have just fit.
      const maxText = Math.ceil(
        Math.max(0, ...Array.from(measure.children).map((el) => (el as HTMLElement).getBoundingClientRect().width)),
      );
      const next = Math.min(170, Math.max(100, maxText + ROW_CHROME + scrollbar));
      if (next !== lastWidthRef.current) {
        lastWidthRef.current = next;
        onWidthChange(next);
      }
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(list);
    return () => observer.disconnect();
  }, [namesKey, onWidthChange]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center gap-[6px] border-b border-inventory-border bg-inventory-surface-muted px-[6px] py-[4px]">
        <input
          type="checkbox"
          checked={colour.allChecked}
          ref={(el) => {
            if (el) el.indeterminate = colour.someChecked && !colour.allChecked;
          }}
          onChange={(e) => colour.toggleAll(e.target.checked)}
          aria-label="Select all colours"
          className="h-3 w-3 cursor-pointer accent-inventory-primary"
        />
        <h4 className="flex-1 text-[9px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Colours</h4>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto thin-scroll">
        {colour.items.length === 0 && <p className="px-[6px] py-[8px] text-[10px] text-inventory-text-subtle">No colours on this product.</p>}
        {colour.items.map((item) => (
          <label
            key={item.name}
            className="flex cursor-pointer items-center gap-[5px] border-b border-inventory-border px-[6px] py-[3px] last:border-b-0 hover:bg-inventory-surface-hover"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => colour.toggle(item.name)}
              aria-label={item.name}
              className="h-3 w-3 shrink-0 cursor-pointer accent-inventory-primary"
            />
            <span className="h-[7px] w-[7px] shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: resolveSwatch(deriveColorFromName(item.name)) }} />
            <span className="min-w-0 break-words text-[10px] leading-none text-inventory-text">{formatColourName(item.name)}</span>
          </label>
        ))}
      </div>

      {/* Hidden measuring layer — one non-wrapping label per colour, invisible; the effect above
          reads each span's real width to size the panel. */}
      <div ref={measureRef} aria-hidden inert className="pointer-events-none absolute left-0 top-0 -translate-y-full whitespace-nowrap opacity-0">
        {colour.items.map((item) => (
          <span key={item.name} className="block text-[10px] leading-none">{formatColourName(item.name)}</span>
        ))}
      </div>
    </div>
  );
}
