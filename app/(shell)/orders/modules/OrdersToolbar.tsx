'use client';

import { useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { FULFILLMENT_STATUSES, PACKING_STATUSES, PERIODS, SEARCH_FIELDS } from './constants';
import type { Pagination, StoreOption } from './types';
import { DAY_LABELS, fmtCalDate, getMonthDays, MONTH_LABELS } from './utils';

type OrdersToolbarProps = {
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  searchField: string;
  setSearchField: Dispatch<SetStateAction<string>>;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: Dispatch<SetStateAction<boolean>>;
  searchDropdownRef: RefObject<HTMLDivElement | null>;
  stores: StoreOption[];
  storeIds: string[];
  setStoreIds: Dispatch<SetStateAction<string[]>>;
  storeDropdownOpen: boolean;
  setStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  storeDropdownRef: RefObject<HTMLDivElement | null>;
  period: (typeof PERIODS)[number]['value'];
  dateFrom: string;
  dateTo: string;
  periodDropdownOpen: boolean;
  setPeriodDropdownOpen: Dispatch<SetStateAction<boolean>>;
  periodDropdownRef: RefObject<HTMLDivElement | null>;
  calendarNav: { year: number; month: number };
  setCalendarNav: Dispatch<SetStateAction<{ year: number; month: number }>>;
  setHoverDate: Dispatch<SetStateAction<string | null>>;
  handlePeriodChange: (value: (typeof PERIODS)[number]['value']) => void;
  handleCalendarDateClick: (date: string) => void;
  fulfillmentStatuses: string[];
  setFulfillmentStatuses: Dispatch<SetStateAction<string[]>>;
  statusDropdownOpen: boolean;
  setStatusDropdownOpen: Dispatch<SetStateAction<boolean>>;
  statusDropdownRef: RefObject<HTMLDivElement | null>;
  packingStatuses: string[];
  packingStatusDropdownOpen: boolean;
  setPackingStatusDropdownOpen: Dispatch<SetStateAction<boolean>>;
  packingStatusDropdownRef: RefObject<HTMLDivElement | null>;
  handlePackingStatusToggle: (status: string) => void;
  hasActiveFilters: boolean;
  handleClearFilters: () => void;
  handleStoreToggle: (id: string) => void;
  handleStatusToggle: (status: string) => void;
  syncStoreDropdownRef: RefObject<HTMLDivElement | null>;
  syncStoreDropdownOpen: boolean;
  setSyncStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  handleSync: () => void;
  syncing: boolean;
  loading: boolean;
  syncActive: boolean;
  syncStoreIds: string[];
  setSyncStoreIds: Dispatch<SetStateAction<string[]>>;
  handleSyncStoreToggle: (id: string) => void;
  handleRefresh: () => void;
  syncRefreshNeeded: boolean;
  refreshRotation: number;
  syncMessage: string;
  setPagination: Dispatch<SetStateAction<Pagination>>;
  hoverDate: string | null;
  setDateFrom: Dispatch<SetStateAction<string>>;
  setDateTo: Dispatch<SetStateAction<string>>;
  setPeriod: Dispatch<SetStateAction<(typeof PERIODS)[number]['value']>>;
  selectedNameCount: number;
  exportLoading: boolean;
  exportDropdownOpen: boolean;
  setExportDropdownOpen: Dispatch<SetStateAction<boolean>>;
  exportDropdownRef: RefObject<HTMLDivElement | null>;
  onExportCsv: () => void;
  onExportPrint: () => void;
};

export default function OrdersToolbar({
  searchInput,
  setSearchInput,
  searchField,
  setSearchField,
  searchDropdownOpen,
  setSearchDropdownOpen,
  searchDropdownRef,
  stores,
  storeIds,
  setStoreIds,
  storeDropdownOpen,
  setStoreDropdownOpen,
  storeDropdownRef,
  period,
  dateFrom,
  dateTo,
  periodDropdownOpen,
  setPeriodDropdownOpen,
  periodDropdownRef,
  calendarNav,
  setCalendarNav,
  setHoverDate,
  handlePeriodChange,
  handleCalendarDateClick,
  fulfillmentStatuses,
  setFulfillmentStatuses,
  statusDropdownOpen,
  setStatusDropdownOpen,
  statusDropdownRef,
  packingStatuses,
  packingStatusDropdownOpen,
  setPackingStatusDropdownOpen,
  packingStatusDropdownRef,
  handlePackingStatusToggle,
  hasActiveFilters,
  handleClearFilters,
  handleStoreToggle,
  handleStatusToggle,
  syncStoreDropdownRef,
  syncStoreDropdownOpen,
  setSyncStoreDropdownOpen,
  handleSync,
  syncing,
  loading,
  syncActive,
  syncStoreIds,
  setSyncStoreIds,
  handleSyncStoreToggle,
  handleRefresh,
  syncRefreshNeeded,
  refreshRotation,
  syncMessage,
  setPagination,
  hoverDate,
  setDateFrom,
  setDateTo,
  setPeriod,
  selectedNameCount,
  exportLoading,
  exportDropdownOpen,
  setExportDropdownOpen,
  exportDropdownRef,
  onExportCsv,
  onExportPrint,
}: OrdersToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeSearchField = SEARCH_FIELDS.find((f) => f.value === searchField);
  const filteredSearchFields = SEARCH_FIELDS.filter((f) =>
    f.label.toLowerCase().includes(searchInput.trim().toLowerCase())
  );

  const selectSearchField = (value: string) => {
    setSearchField(value);
    setSearchInput('');
    setSearchDropdownOpen(false);
    setPagination((prev) => ({ ...prev, page: 1 }));
    searchInputRef.current?.focus();
  };

  const clearSearchField = () => {
    setSearchField('');
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearchDropdownOpen(true);
    searchInputRef.current?.focus();
  };

  return (
  <div className="flex flex-wrap items-start gap-2 mb-5">
    {/* Search */}
    <div ref={searchDropdownRef} className="relative flex-1 min-w-48 sm:flex-none sm:w-64">
      <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
        <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {activeSearchField && (
          <span className="flex items-center gap-1 ml-1.5 pl-2 pr-1 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-md whitespace-nowrap flex-shrink-0">
            {activeSearchField.label}
            <button
              type="button"
              onClick={clearSearchField}
              className="text-blue-400 hover:text-blue-600 cursor-pointer"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}
        <input
          ref={searchInputRef}
          type="text"
          placeholder={activeSearchField ? `Search by ${activeSearchField.label.toLowerCase()}…` : 'Search orders…'}
          value={searchInput}
          onFocus={() => { if (!searchField) setSearchDropdownOpen(true); }}
          onChange={(e) => {
            setSearchInput(e.target.value);
            if (!searchField) {
              const hasMatch = SEARCH_FIELDS.some((f) => f.label.toLowerCase().includes(e.target.value.trim().toLowerCase()));
              setSearchDropdownOpen(hasMatch);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && searchInput === '' && searchField) {
              clearSearchField();
            }
          }}
          className="flex-1 px-2 py-2 text-sm focus:outline-none min-w-0"
        />
      </div>
      {searchDropdownOpen && !searchField && filteredSearchFields.length > 0 && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg w-full py-1">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Search by</div>
          {filteredSearchFields.map((field) => (
            <button
              key={field.value}
              onClick={() => selectSearchField(field.value)}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {field.label}
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Store multi-select */}
    <div className="relative" ref={storeDropdownRef}>
      <button
        onClick={() => setStoreDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
      >
        {storeIds.length === 0 ? 'All Stores' : `${storeIds.length} Store${storeIds.length > 1 ? 's' : ''}`}
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {storeDropdownOpen && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-44 py-1">
          <button
            onClick={() => { setStoreIds([]); setPagination((prev) => ({ ...prev, page: 1 })); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${storeIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
          >
            All Stores
          </button>
          {stores.length > 0 && <div className="border-t border-gray-100 my-1" />}
          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => handleStoreToggle(store.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${storeIds.includes(store.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {storeIds.includes(store.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-gray-700">{store.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Period + calendar dropdown */}
    <div className="relative" ref={periodDropdownRef}>
      <button
        onClick={() => setPeriodDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
      >
        {period === 'custom'
          ? dateFrom && dateTo
            ? `${fmtCalDate(dateFrom)} – ${fmtCalDate(dateTo)}`
            : dateFrom
              ? `From ${fmtCalDate(dateFrom)}`
              : 'Custom Range'
          : PERIODS.find((p) => p.value === period)?.label ?? 'All Time'}
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {periodDropdownOpen && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-max min-w-40">
          {PERIODS.map((item) => (
            <button
              key={item.value}
              onClick={() => handlePeriodChange(item.value)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${period === item.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              {item.label}
              {period === item.value && (
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}

          {/* Calendar — shown when Custom is active */}
          {period === 'custom' && (
            <div className="border-t border-gray-100 p-3" onMouseLeave={() => setHoverDate(null)}>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); setCalendarNav((prev) => { const d = new Date(prev.year, prev.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }}
                  className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex gap-10 text-xs font-semibold text-gray-700 select-none">
                  {[0, 1].map((offset) => {
                    const d = new Date(calendarNav.year, calendarNav.month + offset, 1);
                    return <span key={offset}>{MONTH_LABELS[d.getMonth()]} {d.getFullYear()}</span>;
                  })}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setCalendarNav((prev) => { const d = new Date(prev.year, prev.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }}
                  className="p-1 rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Two-month grid */}
              <div className="flex gap-5">
                {[0, 1].map((offset) => {
                  const d = new Date(calendarNav.year, calendarNav.month + offset, 1);
                  const yr = d.getFullYear();
                  const mo = d.getMonth();
                  const days = getMonthDays(yr, mo);
                  const today = new Date().toISOString().split('T')[0];
                  const effTo = !dateTo && hoverDate ? hoverDate : dateTo;
                  const rStart = dateFrom && effTo ? (dateFrom <= effTo ? dateFrom : effTo) : dateFrom;
                  const rEnd = dateFrom && effTo ? (dateFrom <= effTo ? effTo : dateFrom) : effTo;

                  return (
                    <div key={offset}>
                      <div className="grid grid-cols-7 mb-1">
                        {DAY_LABELS.map((dl) => (
                          <div key={dl} className="w-8 h-6 flex items-center justify-center text-xs text-gray-400 font-medium select-none">{dl}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7">
                        {days.map((date, i) => {
                          if (!date) return <div key={i} className="w-8 h-8" />;
                          const isStart = date === dateFrom;
                          const isEnd = !!dateTo && date === dateTo;
                          const inRange = !!(rStart && rEnd && date > rStart && date < rEnd);
                          const isToday = date === today;
                          let cls = 'w-8 h-8 flex items-center justify-center text-xs select-none transition-colors cursor-pointer ';
                          if (isStart || isEnd) cls += 'bg-blue-600 text-white rounded-full font-semibold';
                          else if (inRange) cls += 'bg-blue-100 text-blue-800 hover:bg-blue-200';
                          else if (isToday) cls += 'font-bold text-blue-500 hover:bg-gray-100 rounded-full';
                          else cls += 'text-gray-700 hover:bg-gray-100 rounded-full';
                          return (
                            <div
                              key={date}
                              className={cls}
                              onClick={(e) => { e.stopPropagation(); handleCalendarDateClick(date); }}
                              onMouseEnter={() => !dateTo && setHoverDate(date)}
                            >
                              {new Date(date + 'T00:00:00').getDate()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clear date range link */}
              {(dateFrom || dateTo) && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {dateFrom && dateTo ? `${fmtCalDate(dateFrom)} – ${fmtCalDate(dateTo)}` : dateFrom ? `From ${fmtCalDate(dateFrom)}` : ''}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDateFrom(''); setDateTo(''); setPeriod('all'); }}
                    className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    Clear dates
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Fulfillment status multi-select */}
    <div className="relative" ref={statusDropdownRef}>
      <button
        onClick={() => setStatusDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
      >
        {fulfillmentStatuses.length === 0 ? 'All Statuses' : `${fulfillmentStatuses.length} Status${fulfillmentStatuses.length > 1 ? 'es' : ''}`}
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {statusDropdownOpen && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-44 py-1">
          <button
            onClick={() => { setFulfillmentStatuses([]); setPagination((prev) => ({ ...prev, page: 1 })); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${fulfillmentStatuses.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
          >
            All Statuses
          </button>
          <div className="border-t border-gray-100 my-1" />
          {FULFILLMENT_STATUSES.map((item) => (
            <button
              key={item.value}
              onClick={() => handleStatusToggle(item.value)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${fulfillmentStatuses.includes(item.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {fulfillmentStatuses.includes(item.value) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Packing status multi-select */}
    <div className="relative" ref={packingStatusDropdownRef}>
      <button
        onClick={() => setPackingStatusDropdownOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
      >
        {packingStatuses.length === 0 ? 'All Packed' : `${packingStatuses.length} Packed`}
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {packingStatusDropdownOpen && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-44 py-1">
          <button
            onClick={() => { setPackingStatusDropdownOpen(false); handlePackingStatusToggle('__clear__'); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${packingStatuses.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
          >
            All
          </button>
          <div className="border-t border-gray-100 my-1" />
          {PACKING_STATUSES.map((item) => (
            <button
              key={item.value}
              onClick={() => handlePackingStatusToggle(item.value)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${packingStatuses.includes(item.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {packingStatuses.includes(item.value) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-gray-700">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>

    {/* Sync / Refresh */}
    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 px-2.5 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear filters
        </button>
      )}
      {selectedNameCount > 0 && (
        <div ref={exportDropdownRef} className="relative">
          <button
            onClick={() => setExportDropdownOpen((prev) => !prev)}
            disabled={exportLoading}
            className="flex items-center gap-1.5 bg-white border border-blue-300 text-blue-700 text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Export attributes ({selectedNameCount})
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {exportDropdownOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
              <button
                onClick={onExportCsv}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as CSV
              </button>
              <button
                onClick={onExportPrint}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Print
              </button>
            </div>
          )}
        </div>
      )}
      <div ref={syncStoreDropdownRef} className="relative">
        <div className="flex items-stretch gap-0">
          <button
            onClick={handleSync}
            disabled={syncing || loading || syncActive}
            className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-l-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border-r-0"
          >
            <svg
              className={`w-4 h-4 ${syncing || syncActive ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5m0 0h-5m5 0v5M19 5A9 9 0 005 19m0 0h5m-5 0v-5" />
            </svg>
            {syncActive ? 'Syncing...' : syncing ? 'Queueing...' : 'Sync'}
          </button>
          <button
            onClick={() => setSyncStoreDropdownOpen((prev) => !prev)}
            disabled={syncing || loading || syncActive}
            className="flex items-center bg-white border border-gray-300 text-gray-600 text-sm px-2 py-2 rounded-r-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {syncStoreDropdownOpen && (
          <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Select Stores to Sync
            </div>
            <button
              onClick={() => { setSyncStoreIds([]); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${syncStoreIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              All Stores
            </button>
            {stores.length > 0 && <div className="border-t border-gray-100 my-1" />}
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleSyncStoreToggle(store.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${syncStoreIds.includes(store.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {syncStoreIds.includes(store.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="text-gray-700 truncate">{store.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={handleRefresh}
        disabled={syncing}
        className={`flex items-center gap-1.5 border text-sm px-3 py-2 rounded-lg transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${syncRefreshNeeded
            ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ transition: 'transform .6s ease', transform: `rotate(${refreshRotation}deg)` }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
      <span className="min-w-0 flex-1 text-xs text-gray-400 sm:flex-none sm:whitespace-nowrap">{syncMessage}</span>
    </div>
  </div>
  );
}
