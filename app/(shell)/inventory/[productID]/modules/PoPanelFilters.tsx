'use client';

import type { PurchaseOrderStatus } from './types';

const STATUS_OPTIONS: Array<{ value: PurchaseOrderStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'PARTIALLY_RECEIVED', label: 'Partially received' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

type PoPanelFiltersProps = {
  statusFilter: PurchaseOrderStatus | '';
  onStatusFilterChange: (status: PurchaseOrderStatus | '') => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
};

export default function PoPanelFilters({ statusFilter, onStatusFilterChange, dateTo, onDateToChange }: PoPanelFiltersProps) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="flex-1 min-w-0">
        <label htmlFor="po-filter-status" className="block text-xs font-medium text-gray-600 mb-1">
          Status
        </label>
        <select
          id="po-filter-status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as PurchaseOrderStatus | '')}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor="po-filter-date-before" className="block text-xs font-medium text-gray-600 mb-1">
          Date before
        </label>
        <input
          id="po-filter-date-before"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none"
        />
      </div>
    </div>
  );
}
