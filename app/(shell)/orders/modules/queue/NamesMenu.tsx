'use client';

import type { OrdersPageBundle } from '../ordersPageContext';
import { Icon } from './icons';
import { MenuCheck, MenuHeading } from './FilterChip';

/** "Export names (n)" menu (Admin, Staff): tick "Name:" chips on lines, or select by filter, then export. */
export default function NamesMenu({ p }: { p: OrdersPageBundle }) {
  const { exportDropdownRef } = p;
  const none = p.selectedNameCount === 0;
  return (
    <div ref={exportDropdownRef} className="relative">
      <button type="button" disabled={p.exportLoading} onClick={() => p.setExportDropdownOpen((prev) => !prev)} aria-haspopup="menu" aria-expanded={p.exportDropdownOpen} title="Export name attributes as CSV or print" className="flex h-8 items-center gap-1.5 rounded-lg border border-orders-border-strong bg-orders-surface px-2.5 text-[11px] font-semibold text-orders-text-body shadow-orders hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
        <Icon name={p.exportLoading ? 'refresh' : 'download'} className={`h-3.5 w-3.5 ${p.exportLoading ? 'animate-spin' : ''}`} />
        Export names ({p.nameCountLoading ? '…' : p.selectedNameCount})<Icon name="chevronDown" className="h-3 w-3" />
      </button>
      {p.exportDropdownOpen && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl border border-orders-border bg-orders-surface py-1 shadow-orders-md">
          <MenuHeading>Select names</MenuHeading>
          <MenuCheck checked={p.selectAllFilters} onClick={p.handleToggleSelectAllFilters}>Select all name attributes matching filters</MenuCheck>
          <MenuCheck checked={p.isCurrentPageAllChecked} onClick={p.handleToggleCurrentPage}>Select all on this page</MenuCheck>
          <div className="my-1 border-t border-orders-divider" />
          <button type="button" role="menuitem" disabled={none} onClick={() => void p.runExport('csv')} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-orders-text-body hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"><Icon name="download" className="h-3 w-3" />Export as CSV</button>
          <button type="button" role="menuitem" disabled={none} onClick={() => void p.runExport('print')} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-orders-text-body hover:bg-orders-surface-muted disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"><Icon name="printer" className="h-3 w-3" />Print</button>
          {none && <p className="px-3 pb-1 pt-0.5 text-[10px] text-orders-text-subtle">Tick a “Name:” chip on a line, or select by filter.</p>}
        </div>
      )}
    </div>
  );
}
