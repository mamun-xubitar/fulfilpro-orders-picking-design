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
  showLabelPrint?: boolean;
  selectedLabelCount?: number;
  printableLabelCount?: number;
  bulkPrinting?: boolean;
  onBulkPrint?: () => void;
  onClearLabelSelection?: () => void;
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
  showLabelPrint = false,
  selectedLabelCount = 0,
  printableLabelCount = 0,
  bulkPrinting = false,
  onBulkPrint,
  onClearLabelSelection,
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
      {showLabelPrint && selectedLabelCount > 0 && (
        <div className="ml-auto inline-flex items-center gap-2">
          <button
            type="button"
            onClick={onBulkPrint}
            disabled={bulkPrinting || printableLabelCount === 0}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg px-3 py-1.5 cursor-pointer transition-colors duration-150"
          >
            {bulkPrinting ? (
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" aria-hidden="true" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            )}
            Print Labels ({printableLabelCount})
          </button>
          <button
            type="button"
            onClick={onClearLabelSelection}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={handleToggleExpandAll}
        className={`${showLabelPrint && selectedLabelCount > 0 ? '' : 'ml-auto '}items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-blue-600 border border-gray-300 hover:border-blue-300 rounded-lg px-3 py-1.5 cursor-pointer transition-colors duration-150`}
      >
        {expandAll ? '▲ Collapse all' : '▼ Expand all'}
      </button>
    </div>
  );
}
