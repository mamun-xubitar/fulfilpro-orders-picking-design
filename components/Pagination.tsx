import type { PaginationItem, PaginationState } from '@/hooks/usePagination';

type Props = {
  pagination: PaginationState;
  loading: boolean;
  pageNumbers: PaginationItem[];
  onPageChange: (page: number) => void;
  itemLabel?: string;
  /** Optional per-page row-count selector, shown next to the "Showing x to y" label. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
};

export default function Pagination({ pagination, loading, pageNumbers, onPageChange, itemLabel = 'orders', pageSizeOptions, onPageSizeChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center gap-3">
        <p className="text-xs text-gray-500">
          Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
          {' '}to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} {itemLabel}
        </p>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            Per page
            <select
              value={pagination.pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-1.5 py-1 text-xs text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(pagination.page - 1)} disabled={!pagination.hasPrev || loading} className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
          Prev
        </button>
        {pageNumbers.map((pageNumber, index) => (
          pageNumber === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-gray-400">...</span>
          ) : (
            <button key={pageNumber} onClick={() => onPageChange(pageNumber)} disabled={loading} className={`px-2.5 py-1.5 text-xs border rounded-lg ${pagination.page === pageNumber ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>
              {pageNumber}
            </button>
          )
        ))}
        <button onClick={() => onPageChange(pagination.page + 1)} disabled={!pagination.hasNext || loading} className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
          Next
        </button>
      </div>
    </div>
  );
}
