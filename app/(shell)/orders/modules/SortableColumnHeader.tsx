'use client';

type SortKey = 'number' | 'customer' | 'orderedAt';

type SortableColumnHeaderProps = {
  label: string;
  sortKey: SortKey;
  sort: SortKey | null;
  dir: 'asc' | 'desc';
  onSortChange: (key: SortKey) => void;
  className?: string;
};

export default function SortableColumnHeader({ label, sortKey, sort, dir, onSortChange, className }: SortableColumnHeaderProps) {
  const isActive = sort === sortKey;

  return (
    <th className={className ?? 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'}>
      <button
        onClick={() => onSortChange(sortKey)}
        className="group flex items-center gap-2 uppercase hover:text-gray-800 cursor-pointer"
      >
        {label}
        <svg className="w-4 h-4 min-w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            className={isActive && dir === 'asc' ? 'text-gray-700' : 'text-gray-300 group-hover:text-gray-500'}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M7 10l5-5 5 5"
          />
          <path
            className={isActive && dir === 'desc' ? 'text-gray-700' : 'text-gray-300 group-hover:text-gray-500'}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M7 14l5 5 5-5"
          />
        </svg>
      </button>
    </th>
  );
}
