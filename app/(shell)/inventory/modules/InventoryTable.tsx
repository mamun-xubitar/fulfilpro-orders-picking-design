'use client';

import { COLUMNS } from './constants';
import InventoryTableRow from './InventoryTableRow';
import type { ProductRow } from './types';

type InventoryTableProps = {
  products: ProductRow[];
  loading: boolean;
  error: string;
  sort: string;
  dir: 'asc' | 'desc';
  onSortChange: (key: string) => void;
};

export default function InventoryTable({ products, loading, error, sort, dir, onSortChange }: InventoryTableProps) {
  const colSpan = COLUMNS.length;

  return (
    <table className="min-w-[1000px] w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200">
          {COLUMNS.map((column) => (
            <ColumnHeader key={column.key} column={column} sort={sort} dir={dir} onSortChange={onSortChange} />
          ))}
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr>
            <td colSpan={colSpan} className="text-center text-gray-400 py-12 text-sm">Loading products...</td>
          </tr>
        )}

        {!loading && error && (
          <tr>
            <td colSpan={colSpan} className="text-center text-red-500 py-12 text-sm">{error}</td>
          </tr>
        )}

        {!loading && !error && products.length === 0 && (
          <tr>
            <td colSpan={colSpan} className="text-center text-gray-400 py-16 text-sm">No products found.</td>
          </tr>
        )}

        {!loading && !error && products.map((product) => (
          <InventoryTableRow key={product.id} product={product} />
        ))}
      </tbody>
    </table>
  );
}

type ColumnHeaderProps = {
  column: { key: string; label: string; sortable: boolean };
  sort: string;
  dir: 'asc' | 'desc';
  onSortChange: (key: string) => void;
};

function ColumnHeader({ column, sort, dir, onSortChange }: ColumnHeaderProps) {
  if (!column.sortable) {
    return (
      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {column.label}
      </th>
    );
  }

  const isActive = sort === column.key;

  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
      <button
        onClick={() => onSortChange(column.key)}
        className="flex items-center gap-1 hover:text-gray-800 cursor-pointer"
      >
        {column.label}
        <svg
          className={`w-3 h-3 transition-transform ${isActive ? 'text-gray-700' : 'text-gray-300'} ${isActive && dir === 'desc' ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </th>
  );
}
