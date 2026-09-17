'use client';

import { capitaliseFirst } from './utils';

export function SizeChips({ sizes }: { sizes: string[] }) {
  const sorted = [...sizes].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  return (
    <>
      {sorted.map((size, index) => (
        <span key={`${size}-${index}`} className="rounded-full border border-inventory-border bg-inventory-surface px-[5px] py-[1px] text-[9px] font-semibold uppercase leading-none text-inventory-text-muted">
          {capitaliseFirst(size)}
        </span>
      ))}
    </>
  );
}
