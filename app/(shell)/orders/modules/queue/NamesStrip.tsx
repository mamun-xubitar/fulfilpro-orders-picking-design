'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { Icon } from './icons';

/** Name-attribute selection and export (Admin, Staff): tick "Name:" chips on lines, or select by filter. */
export default function NamesStrip({ p }: { p: OrdersPageBundle }) {
  const { exportDropdownRef } = p;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-orders-border bg-orders-surface px-3 py-1 text-[11px] text-orders-text-body shadow-orders">
      <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={p.selectAllFilters} onChange={p.handleToggleSelectAllFilters} className="h-3 w-3 rounded border-orders-border-strong text-orders-primary cursor-pointer" />Select all name attributes matching filters</label>
      <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={p.isCurrentPageAllChecked} onChange={p.handleToggleCurrentPage} className="h-3 w-3 rounded border-orders-border-strong text-orders-primary cursor-pointer" />Select all on this page</label>
      <span className="flex items-center gap-1 rounded-full border border-orders-primary-ring bg-orders-primary-soft px-2 text-[10.5px] font-bold text-orders-primary-ink">
        {p.nameCountLoading ? <Icon name="refresh" className="h-3 w-3 animate-spin" /> : p.selectedNameCount} selected
      </span>
      <div ref={exportDropdownRef} className="relative ml-auto">
        <button type="button" disabled={p.selectedNameCount === 0 || p.exportLoading} title={p.selectedNameCount === 0 ? 'Select name attributes first' : 'Export the selected names'} onClick={() => p.setExportDropdownOpen((prev) => !prev)} className="flex h-6 items-center gap-1 rounded-md border border-orders-primary-ring bg-orders-surface px-2 text-[10.5px] font-semibold text-orders-primary-ink hover:bg-orders-primary-soft disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
          <Icon name={p.exportLoading ? 'refresh' : 'download'} className={`h-3 w-3 ${p.exportLoading ? 'animate-spin' : ''}`} />Export names ({p.selectedNameCount})<Icon name="chevronDown" className="h-2.5 w-2.5" />
        </button>
        {p.exportDropdownOpen && (
          <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg border border-orders-border bg-orders-surface shadow-orders-md">
            <button type="button" onClick={() => void p.runExport('csv')} className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:bg-orders-surface-muted cursor-pointer"><Icon name="download" className="h-3 w-3" />Export as CSV</button>
            <button type="button" onClick={() => void p.runExport('print')} className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left hover:bg-orders-surface-muted cursor-pointer"><Icon name="printer" className="h-3 w-3" />Print</button>
          </div>
        )}
      </div>
    </div>
  );
}
