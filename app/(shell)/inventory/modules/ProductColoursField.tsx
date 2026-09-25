'use client';

import { formatColourName, isValidCssColor, resolveSwatch } from '@/lib/inventory/colour';
import type { ColourOption } from './types';

function colourChipNode(colour: ColourOption): React.ReactNode {
  const recognized = isValidCssColor(colour.color);
  return (
    <span className="inline-flex items-center gap-[3px] rounded-full border border-inventory-border bg-inventory-surface px-[5px] py-[1px] text-[9px] font-semibold uppercase leading-none text-inventory-text-muted">
      <span
        className={`h-[6px] w-[6px] rounded-full ${recognized ? 'ring-1 ring-black/10' : 'border border-dashed border-inventory-warning/60'}`}
        style={{ backgroundColor: resolveSwatch(colour.color) }}
        title={recognized ? undefined : `"${colour.color}" isn't a recognized colour — showing a placeholder swatch`}
      />
      {formatColourName(colour.name)}
    </span>
  );
}

/** Shared by ColourChips (multi-line) and OverflowChipRow (single-line, item 6b) — same sort,
 * same chip markup, so both read identically. */
export function colourChipItems(colours: ColourOption[]): { key: string; label: string; node: React.ReactNode }[] {
  const sorted = [...colours].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return sorted.map((colour, index) => ({
    key: `${colour.name}-${index}`,
    label: formatColourName(colour.name),
    node: colourChipNode(colour),
  }));
}

export function ColourChips({ colours }: { colours: ColourOption[] }) {
  return (
    <>
      {colourChipItems(colours).map((item) => (
        <span key={item.key}>{item.node}</span>
      ))}
    </>
  );
}
