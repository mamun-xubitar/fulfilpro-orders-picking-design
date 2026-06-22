'use client';

type OrdersSelectionBarProps = {
  selectAllFilters: boolean;
  handleToggleSelectAllFilters: () => void;
  isCurrentPageAllChecked: boolean;
  handleToggleCurrentPage: () => void;
  nameCountLoading: boolean;
  selectedNameCount: number;
  expandAll: boolean;
  handleToggleExpandAll: () => void;
};

export default function OrdersSelectionBar({
  selectAllFilters,
  handleToggleSelectAllFilters,
  isCurrentPageAllChecked,
  handleToggleCurrentPage,
  nameCountLoading,
  selectedNameCount,
  expandAll,
  handleToggleExpandAll,
}: OrdersSelectionBarProps) {
  return (
    <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200">
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
        <input
          type="checkbox"
          checked={selectAllFilters}
          onChange={handleToggleSelectAllFilters}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all Name attributes matching filters
      </label>
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isCurrentPageAllChecked}
          onChange={handleToggleCurrentPage}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all on this page
      </label>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
        {nameCountLoading ? (
          <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8" />
          </svg>
        ) : (
          <>{selectedNameCount}</>
        )}
        selected
      </span>
      <button
        type="button"
        onClick={handleToggleExpandAll}
        className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 border border-gray-300 hover:border-blue-300 rounded-lg px-3 py-1.5 cursor-pointer transition-colors duration-150"
      >
        {expandAll ? '▲ Collapse all' : '▼ Expand all'}
      </button>
    </div>
  );
}
