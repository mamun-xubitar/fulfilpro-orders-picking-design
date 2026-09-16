'use client';

import ProductsTableRow from './ProductsTableRow';
import type { ProductsSortKey, useProductsTable } from './hooks/useProductsTable';
import { formatCurrencyValue, formatNumber } from './utils';

type ProductsTableProps = {
  table: ReturnType<typeof useProductsTable>;
  loading: boolean;
};

const COLUMNS: { key: ProductsSortKey | null; label: string; align: 'left' | 'right' | 'center' }[] = [
  { key: 'name', label: 'Product', align: 'left' },
  { key: null, label: 'Supplier', align: 'left' },
  { key: 'brand', label: 'Brand', align: 'left' },
  { key: 'category', label: 'Category', align: 'left' },
  { key: 'sku', label: 'SKU', align: 'left' },
  { key: 'status', label: 'Status', align: 'center' },
  { key: null, label: 'Verified', align: 'center' },
  { key: 'variants', label: 'Variants', align: 'right' },
  { key: 'stock', label: 'Stock on hand', align: 'right' },
  { key: null, label: 'Available', align: 'right' },
  { key: 'stockValue', label: 'Stock value', align: 'right' },
  { key: 'createdAt', label: 'Created', align: 'left' },
];

export default function ProductsTable({ table, loading }: ProductsTableProps) {
  const colSpan = COLUMNS.length + 2; // + select + actions

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1020px] text-[11px] leading-none">
        <thead>
          <tr className="border-b border-inventory-border bg-inventory-surface-muted">
            <th className="w-10 px-2 py-1">
              <input
                type="checkbox"
                checked={table.isCurrentPageAllSelected}
                onChange={table.toggleSelectAllOnPage}
                className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
                aria-label="Select all on this page"
              />
            </th>
            {COLUMNS.map((column) => (
              <ColumnHeader key={column.label} column={column} sort={table.sort} dir={table.dir} onSortChange={table.handleSortChange} />
            ))}
            <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading && <SkeletonRows rowCount={table.products.length || 8} colSpan={colSpan} />}
          {!loading && table.products.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="py-12 text-center text-[11px] text-inventory-text-subtle">
                No products found.
              </td>
            </tr>
          )}
          {!loading &&
            table.products.map((product) => (
              <ProductsTableRow
                key={product.id}
                product={product}
                selected={table.selectedIds.includes(product.id)}
                onToggleSelect={table.toggleSelect}
                onView={table.onView}
                onRequestDelete={(id, name) => table.setDeleteConfirm({ kind: 'single', id, name })}
                onToggleOmit={table.toggleOmitted}
              />
            ))}
        </tbody>
        {!loading && table.products.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-inventory-border bg-inventory-surface-muted font-bold text-inventory-text">
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                Total <span className="normal-case text-inventory-text-subtle">({formatNumber(table.pagination.total)} matching)</span>
              </td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5 text-right tabular-nums">{formatNumber(table.totals.stockOnHand)}</td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5 text-right tabular-nums text-inventory-success-hover">{formatCurrencyValue(table.totals.stockValue)}</td>
              <td className="px-2 py-1.5" />
              <td className="px-2 py-1.5" />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function ColumnHeader({
  column,
  sort,
  dir,
  onSortChange,
}: {
  column: { key: ProductsSortKey | null; label: string; align: 'left' | 'right' | 'center' };
  sort: ProductsSortKey;
  dir: 'asc' | 'desc';
  onSortChange: (key: ProductsSortKey) => void;
}) {
  const alignment = column.align === 'left' ? 'text-left' : column.align === 'right' ? 'text-right' : 'text-center';

  if (!column.key) {
    return <th className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle ${alignment}`}>{column.label}</th>;
  }

  const isActive = sort === column.key;
  return (
    <th className={`whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle ${alignment}`}>
      <button
        type="button"
        onClick={() => onSortChange(column.key!)}
        className={`inline-flex items-center gap-1 uppercase hover:text-inventory-text cursor-pointer ${column.align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {column.label}
        <svg className={`h-2.5 w-2.5 transition-transform ${isActive ? 'text-inventory-text-muted' : 'text-inventory-border-strong'} ${isActive && dir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </th>
  );
}

function SkeletonRows({ rowCount, colSpan }: { rowCount: number; colSpan: number }) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={i} className="border-b border-inventory-divider last:border-0">
          {Array.from({ length: colSpan }).map((__, j) => (
            <td key={j} className="px-2 py-1.5">
              <div className="h-3 animate-pulse rounded bg-inventory-surface-muted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
