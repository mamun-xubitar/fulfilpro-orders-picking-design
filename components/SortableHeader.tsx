'use client';

type SortableHeaderProps<K extends string> = {
  label: string;
  sortKey: K;
  sort: K;
  dir: 'asc' | 'desc';
  onSortChange: (key: K) => void;
  className?: string;
};

/** A sortable `<th>` for server-sorted tables: the arrow pair shows the active column and direction. */
export default function SortableHeader<K extends string>({ label, sortKey, sort, dir, onSortChange, className }: SortableHeaderProps<K>) {
  const active = sort === sortKey;
  const arrow = (direction: 'asc' | 'desc', path: string) => (
    <path
      className={active && dir === direction ? 'text-gray-700' : 'text-gray-300 group-hover:text-gray-500'}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d={path}
    />
  );

  return (
    <th
      className={className ?? 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" onClick={() => onSortChange(sortKey)} className="group inline-flex items-center gap-2 uppercase hover:text-gray-800 cursor-pointer">
        {label}
        <svg className="w-4 h-4 min-w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {arrow('asc', 'M7 10l5-5 5 5')}
          {arrow('desc', 'M7 14l5 5 5-5')}
        </svg>
      </button>
    </th>
  );
}
