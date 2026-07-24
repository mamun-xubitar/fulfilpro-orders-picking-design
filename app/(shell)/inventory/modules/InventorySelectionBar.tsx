'use client';

import type { BulkJob } from './types';

type InventorySelectionBarProps = {
  selectedCount: number;
  selectAllFilters: boolean;
  onToggleSelectAllFilters: () => void;
  isCurrentPageAllSelected: boolean;
  onToggleCurrentPage: () => void;
  bulkRunning: boolean;
  bulkJob: BulkJob | null;
  onArchive: () => void;
  onSetDraft: () => void;
  onOpenTagModal: (mode: 'add' | 'remove') => void;
  onOpenChannelModal: (mode: 'include' | 'exclude') => void;
  onOpenDelete: () => void;
  onClear: () => void;
};

export default function InventorySelectionBar({
  selectedCount,
  selectAllFilters,
  onToggleSelectAllFilters,
  isCurrentPageAllSelected,
  onToggleCurrentPage,
  bulkRunning,
  bulkJob,
  onArchive,
  onSetDraft,
  onOpenTagModal,
  onOpenChannelModal,
  onOpenDelete,
  onClear,
}: InventorySelectionBarProps) {
  const progress = bulkJob?.progress;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-3 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200">
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isCurrentPageAllSelected}
          onChange={onToggleCurrentPage}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all on this page
      </label>
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-700">
        <input
          type="checkbox"
          checked={selectAllFilters}
          onChange={onToggleSelectAllFilters}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
        />
        Select all matching filters
      </label>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
        {selectAllFilters ? 'All matching filters' : `${selectedCount} selected`}
      </span>

      {bulkRunning && (
        <span className="text-xs text-gray-500">
          {progress ? `Processing ${progress.done}/${progress.total}${progress.errors.length > 0 ? ` (${progress.errors.length} errors)` : ''}...` : 'Queuing...'}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2 ml-auto">
        <button onClick={onArchive} disabled={bulkRunning} className="text-sm border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Archive
        </button>
        <button onClick={onSetDraft} disabled={bulkRunning} className="text-sm border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Set Draft
        </button>
        <button onClick={() => onOpenTagModal('add')} disabled={bulkRunning} className="text-sm border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Add Tags
        </button>
        <button onClick={() => onOpenTagModal('remove')} disabled={bulkRunning} className="text-sm border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Remove Tags
        </button>
        <button onClick={() => onOpenChannelModal('include')} disabled={bulkRunning} className="text-sm border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Include Channel
        </button>
        <button onClick={() => onOpenChannelModal('exclude')} disabled={bulkRunning} className="text-sm border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Exclude Channel
        </button>
        <button onClick={onOpenDelete} disabled={bulkRunning} className="text-sm border border-red-200 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Delete
        </button>
        <button onClick={onClear} disabled={bulkRunning} className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
          Clear
        </button>
      </div>
    </div>
  );
}
