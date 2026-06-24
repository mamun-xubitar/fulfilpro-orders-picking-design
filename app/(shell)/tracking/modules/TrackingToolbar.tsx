'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { PERIODS, TRACKING_STATUSES } from './constants';
import { fmtCalDate } from './utils';
import DateRangeCalendar from './DateRangeCalendar';
import type { StoreOption } from './types';

type TrackingToolbarProps = {
  searchInput: string;
  onSearchChange: (value: string) => void;
  stores: StoreOption[];
  storeIds: string[];
  storeDropdownOpen: boolean;
  setStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  storeDropdownRef: RefObject<HTMLDivElement | null>;
  handleStoreToggle: (id: string) => void;
  statuses: string[];
  statusDropdownOpen: boolean;
  setStatusDropdownOpen: Dispatch<SetStateAction<boolean>>;
  statusDropdownRef: RefObject<HTMLDivElement | null>;
  handleStatusToggle: (status: string) => void;
  period: (typeof PERIODS)[number]['value'];
  dateFrom: string;
  dateTo: string;
  hoverDate: string | null;
  setHoverDate: Dispatch<SetStateAction<string | null>>;
  setDateFrom: Dispatch<SetStateAction<string>>;
  setDateTo: Dispatch<SetStateAction<string>>;
  setPeriod: Dispatch<SetStateAction<(typeof PERIODS)[number]['value']>>;
  periodDropdownOpen: boolean;
  setPeriodDropdownOpen: Dispatch<SetStateAction<boolean>>;
  periodDropdownRef: RefObject<HTMLDivElement | null>;
  calendarNav: { year: number; month: number };
  setCalendarNav: Dispatch<SetStateAction<{ year: number; month: number }>>;
  handlePeriodChange: (value: (typeof PERIODS)[number]['value']) => void;
  handleCalendarDateClick: (date: string) => void;
  hasActiveFilters: boolean;
  handleClearFilters: () => void;
  userIsAdmin: boolean;
  onBulkRegister: () => void;
};

export default function TrackingToolbar({
  searchInput, onSearchChange,
  stores, storeIds, storeDropdownOpen, setStoreDropdownOpen, storeDropdownRef, handleStoreToggle,
  statuses, statusDropdownOpen, setStatusDropdownOpen, statusDropdownRef, handleStatusToggle,
  period, dateFrom, dateTo, hoverDate, setHoverDate, setDateFrom, setDateTo, setPeriod,
  periodDropdownOpen, setPeriodDropdownOpen, periodDropdownRef,
  calendarNav, setCalendarNav,
  handlePeriodChange, handleCalendarDateClick,
  hasActiveFilters, handleClearFilters,
  userIsAdmin, onBulkRegister,
}: TrackingToolbarProps) {
  return (
    <div className="flex flex-wrap items-start gap-2 mb-5">
      {/* Search */}
      <div className="relative flex-1 min-w-48 sm:flex-none sm:w-64">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search order, tracking, customer…"
          className="w-full border border-gray-300 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />
      </div>

      {/* Store multi-select */}
      {stores.length > 1 && (
        <div className="relative" ref={storeDropdownRef}>
          <button
            type="button"
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
                type="button"
                onClick={() => { handleStoreToggle('__all__'); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${storeIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
              >
                All Stores
              </button>
              {stores.length > 0 && <div className="border-t border-gray-100 my-1" />}
              {stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => handleStoreToggle(store.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${storeIds.includes(store.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
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
      )}

      {/* Period + calendar dropdown */}
      <div className="relative" ref={periodDropdownRef}>
        <button
          type="button"
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
                type="button"
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
            {period === 'custom' && (
              <DateRangeCalendar
                dateFrom={dateFrom}
                dateTo={dateTo}
                hoverDate={hoverDate}
                calendarNav={calendarNav}
                onDateClick={handleCalendarDateClick}
                onHover={setHoverDate}
                onNavPrev={() => setCalendarNav((prev) => { const d = new Date(prev.year, prev.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                onNavNext={() => setCalendarNav((prev) => { const d = new Date(prev.year, prev.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                onClear={() => { setDateFrom(''); setDateTo(''); setPeriod('all'); }}
              />
            )}
          </div>
        )}
      </div>

      {/* Delivery status multi-select */}
      <div className="relative" ref={statusDropdownRef}>
        <button
          type="button"
          onClick={() => setStatusDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
        >
          {statuses.length === 0 ? 'All Statuses' : `${statuses.length} Status${statuses.length > 1 ? 'es' : ''}`}
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {statusDropdownOpen && (
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-48 py-1">
            <button
              type="button"
              onClick={() => { handleStatusToggle('__clear__'); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${statuses.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              All Statuses
            </button>
            <div className="border-t border-gray-100 my-1" />
            {TRACKING_STATUSES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleStatusToggle(item.value)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <span className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${statuses.includes(item.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {statuses.includes(item.value) && (
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

      <div className="flex items-center gap-2 sm:ml-auto">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 px-2.5 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
        {userIsAdmin && (
          <button
            type="button"
            onClick={onBulkRegister}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors duration-150 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Register Existing Orders
          </button>
        )}
      </div>
    </div>
  );
}
