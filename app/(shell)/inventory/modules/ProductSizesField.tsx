'use client';

import { capitaliseFirst } from './utils';

const chipClass =
  'rounded-full border border-inventory-border bg-inventory-surface px-[5px] py-[1px] text-[9px] font-semibold uppercase leading-none text-inventory-text-muted';

/** Shared by SizeChips (multi-line) and OverflowChipRow (single-line, item 6b) — same sort,
 * same chip markup, so both read identically. */
export function sizeChipItems(sizes: string[]): { key: string; label: string; node: React.ReactNode }[] {
  const sorted = [...sizes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return sorted.map((size, index) => ({
    key: `${size}-${index}`,
    label: capitaliseFirst(size),
    node: <span className={chipClass}>{capitaliseFirst(size)}</span>,
  }));
}

export function SizeChips({ sizes }: { sizes: string[] }) {
  return (
    <>
      {sizeChipItems(sizes).map((item) => (
        <span key={item.key}>{item.node}</span>
      ))}
    </>
  );
}
