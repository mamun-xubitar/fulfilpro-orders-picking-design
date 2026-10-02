'use client';

export type SortDir = 'asc' | 'desc';

type SortableThProps<K extends string> = {
  label: string;
  /** Omit for a column that can't be sorted. */
  sortKey?: K;
  align?: 'left' | 'right' | 'center';
  sort: K;
  dir: SortDir;
  onSortChange: (key: K) => void;
};

/** A table header cell with a click-to-sort chevron — same look as the Products table's
 * ColumnHeader, shared by the Purchase Orders and Payments tabs. */
export default function SortableTh<K extends string>({ label, sortKey, align = 'left', sort, dir, onSortChange }: SortableThProps<K>) {
  const alignment = align === 'left' ? 'text-left' : align === 'right' ? 'text-right' : 'text-center';
  const base = `whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle ${alignment}`;
  if (!sortKey) return <th className={base}>{label}</th>;

  const active = sort === sortKey;
  return (
    <th className={base} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        onClick={() => onSortChange(sortKey)}
        className={`inline-flex items-center gap-1 uppercase hover:text-inventory-text cursor-pointer ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <svg
          className={`h-2.5 w-2.5 transition-transform ${active ? 'text-inventory-text-muted' : 'text-inventory-border-strong'} ${active && dir === 'desc' ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </th>
  );
}
