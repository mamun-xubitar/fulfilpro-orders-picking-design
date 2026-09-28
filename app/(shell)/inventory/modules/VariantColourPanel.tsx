'use client';

import { deriveColorFromName, formatColourName, resolveSwatch } from '@/lib/inventory/colour';
import type { OptionFilter } from './hooks/useVariantsMatrix';

type VariantColourPanelProps = {
  colour: OptionFilter;
};

/**
 * The Variants / stock table's colour panel — lists every colour declared on the product, with no
 * Find, Save, Add or remove (✕): unlike the Colour & size adjustment modal's Colour column, this
 * never touches the product or its variants — it's a client-side filter over the table's rows,
 * same as the sizes dropdown beside it. Unchecking a colour hides its rows from the table (and the
 * totals below); it doesn't delete anything. Rendered by VariantsMatrixSection at the same height
 * as the table beside it.
 */
export default function VariantColourPanel({ colour }: VariantColourPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
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
        <h4 className="flex-1 text-[9px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Colour</h4>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll">
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
            <span className="truncate text-[10px] leading-none text-inventory-text">{formatColourName(item.name)}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
