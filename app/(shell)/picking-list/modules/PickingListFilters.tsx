'use client';

import { useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { StoreOption, PaginationState } from './usePickingListPage';

const PACKED_FILTERS = [{ value: 'not_packed', label: 'Not Packed' }, { value: 'partially_packed', label: 'Partial Packed' }, { value: 'packed', label: 'Packed' }, { value: 'late_unpacked', label: 'Late Unpacked' }, { value: 'shipped_delayed', label: 'Shipped Delayed' }] as const;
const PRINT_FILTERS = [{ value: 'not_printed', label: 'Slip Not Printed' }, { value: 'printed', label: 'Slip Printed' }] as const;
const PERIODS = [{ value: 'all', label: 'All Time' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'year', label: 'This Year' }, { value: 'custom', label: 'Custom' }] as const;
const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const SEARCH_FIELDS = [
  { label: 'Order number', value: 'number' },
  { label: 'Customer name', value: 'customer' },
  { label: 'Customer address', value: 'address' },
  { label: 'Product', value: 'lineItem' },
  { label: 'Barcode', value: 'barcode' },
] as const;

export type PeriodValue = (typeof PERIODS)[number]['value'];

type Props = {
  isPicker: boolean;
  stores: StoreOption[];
  storeIds: string[];
  storeDropdownOpen: boolean;
  setStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  storeDropdownRef: RefObject<HTMLDivElement | null>;
  packedStatuses: string[];
  setPackedStatuses: Dispatch<SetStateAction<string[]>>;
  packedStatusDropdownOpen: boolean;
  setPackedStatusDropdownOpen: Dispatch<SetStateAction<boolean>>;
  packedStatusDropdownRef: RefObject<HTMLDivElement | null>;
  printStatuses: string[];
  setPrintStatuses: Dispatch<SetStateAction<string[]>>;
  printStatusDropdownOpen: boolean;
  setPrintStatusDropdownOpen: Dispatch<SetStateAction<boolean>>;
  printStatusDropdownRef: RefObject<HTMLDivElement | null>;
  period: PeriodValue;
  dateFrom: string;
  dateTo: string;
  periodDropdownOpen: boolean;
  setPeriodDropdownOpen: Dispatch<SetStateAction<boolean>>;
  periodDropdownRef: RefObject<HTMLDivElement | null>;
  calendarNav: { year: number; month: number };
  setCalendarNav: Dispatch<SetStateAction<{ year: number; month: number }>>;
  hoverDate: string | null;
  setHoverDate: Dispatch<SetStateAction<string | null>>;
  syncStoreIds: string[];
  syncStoreDropdownOpen: boolean;
  setSyncStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  syncStoreDropdownRef: RefObject<HTMLDivElement | null>;
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  searchField: string;
  setSearchField: Dispatch<SetStateAction<string>>;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: Dispatch<SetStateAction<boolean>>;
  searchDropdownRef: RefObject<HTMLDivElement | null>;
  hasActiveFilters: boolean;
  syncing: boolean;
  loading: boolean;
  syncActive: boolean;
  syncRefreshNeeded: boolean;
  syncMessage: string;
  refreshRotation: number;
  toggleStore: (id: string) => void;
  toggleFilter: (value: string, setter: Dispatch<SetStateAction<string[]>>) => void;
  toggleSyncStore: (id: string) => void;
  handlePeriodChange: (value: PeriodValue) => void;
  handleCalendarDateClick: (date: string) => void;
  clearFilters: () => void;
  refreshList: () => void;
  handleSync: () => void;
  setSyncStoreIds: Dispatch<SetStateAction<string[]>>;
  setPagination: Dispatch<SetStateAction<PaginationState>>;
};

export default function PickingListFilters({ isPicker, stores, storeIds, storeDropdownOpen, setStoreDropdownOpen, storeDropdownRef, packedStatuses, setPackedStatuses, packedStatusDropdownOpen, setPackedStatusDropdownOpen, packedStatusDropdownRef, printStatuses, setPrintStatuses, printStatusDropdownOpen, setPrintStatusDropdownOpen, printStatusDropdownRef, period, dateFrom, dateTo, periodDropdownOpen, setPeriodDropdownOpen, periodDropdownRef, calendarNav, setCalendarNav, hoverDate, setHoverDate, syncStoreIds, setSyncStoreIds, syncStoreDropdownOpen, setSyncStoreDropdownOpen, syncStoreDropdownRef, searchInput, setSearchInput, searchField, setSearchField, searchDropdownOpen, setSearchDropdownOpen, searchDropdownRef, hasActiveFilters, syncing, loading, syncActive, syncRefreshNeeded, syncMessage, refreshRotation, toggleStore, toggleFilter, toggleSyncStore, handlePeriodChange, handleCalendarDateClick, clearFilters, refreshList, handleSync, setPagination }: Props) {
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
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div ref={searchDropdownRef} className="relative flex-1 min-w-48 sm:flex-none sm:w-64">
        <div className="flex items-center overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
          <svg className="ml-3 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {activeSearchField && (
            <span className="ml-1.5 flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 py-0.5 pl-2 pr-1 text-xs font-medium text-blue-700">
              {activeSearchField.label}
              <button type="button" onClick={clearSearchField} className="cursor-pointer text-blue-400 hover:text-blue-600">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          )}
          <input
            ref={searchInputRef}
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
            placeholder={activeSearchField ? `Search by ${activeSearchField.label.toLowerCase()}…` : 'Search order...'}
            className="min-w-0 flex-1 px-2 py-2 text-sm outline-none"
          />
        </div>
        {searchDropdownOpen && !searchField && filteredSearchFields.length > 0 && (
          <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Search by</div>
            {filteredSearchFields.map((field) => (
              <button key={field.value} onClick={() => selectSearchField(field.value)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                {field.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!isPicker && (
        <MultiSelectDropdown refEl={storeDropdownRef} open={storeDropdownOpen} setOpen={setStoreDropdownOpen} buttonLabel={storeIds.length === 0 ? 'All Stores' : `${storeIds.length} Store${storeIds.length > 1 ? 's' : ''}`} allLabel="All Stores" allActive={storeIds.length === 0} onClear={() => { setStoreDropdownOpen(false); setPagination((p) => ({ ...p, page: 1 })); }} options={stores.map((s) => ({ value: s.id, label: s.name }))} selectedValues={storeIds} onToggle={toggleStore} />
      )}

      {!isPicker && (
        <div className="relative" ref={periodDropdownRef}>
          <button onClick={() => setPeriodDropdownOpen((p) => !p)} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50">
            {period === 'custom' ? (dateFrom && dateTo ? `${fmtCalDate(dateFrom)} - ${fmtCalDate(dateTo)}` : dateFrom ? `From ${fmtCalDate(dateFrom)}` : 'Custom Range') : PERIODS.find((p) => p.value === period)?.label ?? 'All Time'}
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {periodDropdownOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-max min-w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
              {PERIODS.map((item) => <button key={item.value} onClick={() => handlePeriodChange(item.value)} className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${period === item.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>{item.label}{period === item.value && <span className="text-blue-600">✓</span>}</button>)}
              {period === 'custom' && (
                <div className="border-t border-gray-100 p-3" onMouseLeave={() => setHoverDate(null)}>
                  <div className="mb-3 flex items-center justify-between">
                    <button onClick={(e) => { e.stopPropagation(); setCalendarNav((p) => { const d = new Date(p.year, p.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <div className="flex gap-10 select-none text-xs font-semibold text-gray-700">{[0, 1].map((offset) => { const d = new Date(calendarNav.year, calendarNav.month + offset, 1); return <span key={offset}>{MONTH_LABELS[d.getMonth()]} {d.getFullYear()}</span>; })}</div>
                    <button onClick={(e) => { e.stopPropagation(); setCalendarNav((p) => { const d = new Date(p.year, p.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; }); }} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                  </div>
                  <div className="flex gap-5">
                    {[0, 1].map((offset) => { const d = new Date(calendarNav.year, calendarNav.month + offset, 1); return <CalendarMonth key={offset} year={d.getFullYear()} month={d.getMonth()} dateFrom={dateFrom} dateTo={dateTo} hoverDate={hoverDate} onDateClick={handleCalendarDateClick} onHoverDate={(date) => !dateTo && setHoverDate(date)} />; })}
                  </div>
                  {(dateFrom || dateTo) && (
                    <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="text-xs text-gray-400">{dateFrom && dateTo ? `${fmtCalDate(dateFrom)} - ${fmtCalDate(dateTo)}` : dateFrom ? `From ${fmtCalDate(dateFrom)}` : ''}</span>
                      <button onClick={(e) => { e.stopPropagation(); handlePeriodChange('all'); }} className="text-xs text-gray-400 hover:text-red-500">Clear dates</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <MultiSelectDropdown refEl={packedStatusDropdownRef} open={packedStatusDropdownOpen} setOpen={setPackedStatusDropdownOpen} buttonLabel={packedStatuses.length === 0 ? 'All Packed Statuses' : `${packedStatuses.length} Packed Status${packedStatuses.length > 1 ? 'es' : ''}`} allLabel="All Packed Statuses" allActive={packedStatuses.length === 0} onClear={() => { setPackedStatuses([]); setPagination((p) => ({ ...p, page: 1 })); }} options={PACKED_FILTERS.map((f) => ({ value: f.value, label: f.label }))} selectedValues={packedStatuses} onToggle={(v) => toggleFilter(v, setPackedStatuses)} />
      <MultiSelectDropdown refEl={printStatusDropdownRef} open={printStatusDropdownOpen} setOpen={setPrintStatusDropdownOpen} buttonLabel={printStatuses.length === 0 ? 'All Print Statuses' : `${printStatuses.length} Print Status${printStatuses.length > 1 ? 'es' : ''}`} allLabel="All Print Statuses" allActive={printStatuses.length === 0} onClear={() => { setPrintStatuses([]); setPagination((p) => ({ ...p, page: 1 })); }} options={PRINT_FILTERS.map((f) => ({ value: f.value, label: f.label }))} selectedValues={printStatuses} onToggle={(v) => toggleFilter(v, setPrintStatuses)} />

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {hasActiveFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>Clear filters
          </button>
        )}
        {!isPicker && (
          <div ref={syncStoreDropdownRef} className="relative">
            <div className="flex items-stretch gap-0">
              <button onClick={handleSync} disabled={syncing || loading || syncActive} className="flex items-center gap-1.5 rounded-l-lg border border-r-0 border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                <svg className={`h-4 w-4 ${syncing || syncActive ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M5 19A9 9 0 0119 5m0 0h-5m5 0v5M19 5A9 9 0 005 19m0 0h5m-5 0v-5" /></svg>
                {syncActive ? 'Syncing...' : syncing ? 'Queueing...' : 'Sync'}
              </button>
              <button onClick={() => setSyncStoreDropdownOpen((p) => !p)} disabled={syncing || loading || syncActive} className="flex items-center rounded-r-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {syncStoreDropdownOpen && (
              <div className="absolute right-0 z-50 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Select Stores to Sync</div>
                <button onClick={() => setSyncStoreIds([])} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${syncStoreIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>All Stores</button>
                {stores.length > 0 && <div className="my-1 border-t border-gray-100" />}
                {stores.map((store) => <CheckOption key={store.id} label={store.name} selected={syncStoreIds.includes(store.id)} onClick={() => toggleSyncStore(store.id)} />)}
              </div>
            )}
          </div>
        )}
        <button onClick={refreshList} disabled={syncing} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${syncRefreshNeeded ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'}`}>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transition: 'transform .6s ease', transform: `rotate(${refreshRotation}deg)` }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Refresh
        </button>
        {!isPicker && <span className="min-w-0 flex-1 text-xs text-gray-400 sm:flex-none sm:whitespace-nowrap">{syncMessage}</span>}
      </div>
    </div>
  );
}

function MultiSelectDropdown({ refEl, open, setOpen, buttonLabel, allLabel, allActive, onClear, options, selectedValues, onToggle }: { refEl: RefObject<HTMLDivElement | null>; open: boolean; setOpen: Dispatch<SetStateAction<boolean>>; buttonLabel: string; allLabel: string; allActive: boolean; onClear: () => void; options: Array<{ value: string; label: string }>; selectedValues: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="relative" ref={refEl}>
      <button onClick={() => setOpen((p) => !p)} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50">
        {buttonLabel}<svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          <button onClick={onClear} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${allActive ? 'font-semibold text-blue-600' : 'text-gray-700'}`}>{allLabel}</button>
          {options.length > 0 && <div className="my-1 border-t border-gray-100" />}
          {options.map((o) => <CheckOption key={o.value} label={o.label} selected={selectedValues.includes(o.value)} onClick={() => onToggle(o.value)} />)}
        </div>
      )}
    </div>
  );
}

function CheckOption({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
      <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>{selected && <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}</span>
      <span className="truncate text-gray-700">{label}</span>
    </button>
  );
}

function CalendarMonth({ year, month, dateFrom, dateTo, hoverDate, onDateClick, onHoverDate }: { year: number; month: number; dateFrom: string; dateTo: string; hoverDate: string | null; onDateClick: (date: string) => void; onHoverDate: (date: string) => void }) {
  const days = getMonthDays(year, month);
  const today = new Date().toISOString().split('T')[0];
  const effectiveTo = !dateTo && hoverDate ? hoverDate : dateTo;
  const rangeStart = dateFrom && effectiveTo ? (dateFrom <= effectiveTo ? dateFrom : effectiveTo) : dateFrom;
  const rangeEnd = dateFrom && effectiveTo ? (dateFrom <= effectiveTo ? effectiveTo : dateFrom) : effectiveTo;
  return (
    <div>
      <div className="mb-1 grid grid-cols-7">{DAY_LABELS.map((l) => <div key={l} className="flex h-6 w-8 select-none items-center justify-center text-xs font-medium text-gray-400">{l}</div>)}</div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          if (!date) return <div key={i} className="h-8 w-8" />;
          const isStart = date === dateFrom, isEnd = !!dateTo && date === dateTo;
          const inRange = !!(rangeStart && rangeEnd && date > rangeStart && date < rangeEnd);
          let cls = 'flex h-8 w-8 cursor-pointer select-none items-center justify-center text-xs transition-colors ';
          if (isStart || isEnd) cls += 'rounded-full bg-blue-600 font-semibold text-white';
          else if (inRange) cls += 'bg-blue-100 text-blue-800 hover:bg-blue-200';
          else if (date === today) cls += 'rounded-full font-bold text-blue-500 hover:bg-gray-100';
          else cls += 'rounded-full text-gray-700 hover:bg-gray-100';
          return <button key={date} type="button" className={cls} onClick={(e) => { e.stopPropagation(); onDateClick(date); }} onMouseEnter={() => onHoverDate(date)}>{new Date(`${date}T00:00:00`).getDate()}</button>;
        })}
      </div>
    </div>
  );
}

function getMonthDays(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (string | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  return days;
}

function fmtCalDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  const yearText = new Date().getFullYear() !== year ? ` ${year}` : '';
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]} ${day}${yearText}`;
}
