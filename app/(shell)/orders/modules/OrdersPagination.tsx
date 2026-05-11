import type { Pagination } from './types';
import type { PaginationItem } from './utils';

type OrdersPaginationProps = {
  pagination: Pagination;
  loading: boolean;
  pageNumbers: PaginationItem[];
  onPageChange: (page: number) => void;
};

export default function OrdersPagination({ pagination, loading, pageNumbers, onPageChange }: OrdersPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
      <p className="text-xs text-gray-500">
        Showing {(pagination.total === 0) ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
        {' '}to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} orders
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrev || loading}
          className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>

        {pageNumbers.map((pageNumber, index) => (
          pageNumber === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-gray-400">...</span>
          ) : (
            <button
              key={pageNumber}
              onClick={() => onPageChange(pageNumber)}
              disabled={loading}
              className={`px-2.5 py-1.5 text-xs border rounded-lg ${pagination.page === pageNumber ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
            >
              {pageNumber}
            </button>
          )
        ))}

        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNext || loading}
          className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
