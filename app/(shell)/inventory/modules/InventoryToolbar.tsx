'use client';

import { useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SEARCH_FIELDS, STATUS_OPTIONS, STOCK_LEVEL_OPTIONS } from './constants';
import type { StoreOption } from './types';

type SyncControlsProps = {
  stores: StoreOption[];
  syncStoreIds: string[];
  handleSyncStoreToggle: (id: string) => void;
  syncStoreDropdownOpen: boolean;
  setSyncStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  syncStoreDropdownRef: RefObject<HTMLDivElement | null>;
  handleSync: () => void;
  syncing: boolean;
  loading: boolean;
  syncActive: boolean;
};

type InventoryToolbarProps = {
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  searchField: string;
  setSearchField: Dispatch<SetStateAction<string>>;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: Dispatch<SetStateAction<boolean>>;
  searchDropdownRef: RefObject<HTMLDivElement | null>;
  stores: StoreOption[];
  storeIds: string[];
  storeDropdownOpen: boolean;
  setStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  storeDropdownRef: RefObject<HTMLDivElement | null>;
  handleStoreToggle: (id: string) => void;
  status: string[];
  statusDropdownOpen: boolean;
  setStatusDropdownOpen: Dispatch<SetStateAction<boolean>>;
  statusDropdownRef: RefObject<HTMLDivElement | null>;
  handleStatusToggle: (value: string) => void;
  stockLevel: string;
  stockDropdownOpen: boolean;
  setStockDropdownOpen: Dispatch<SetStateAction<boolean>>;
  stockDropdownRef: RefObject<HTMLDivElement | null>;
  handleStockLevelChange: (value: string) => void;
  hasActiveFilters: boolean;
  handleClearFilters: () => void;
  syncStoreIds: string[];
  handleSyncStoreToggle: (id: string) => void;
  syncStoreDropdownOpen: boolean;
  setSyncStoreDropdownOpen: Dispatch<SetStateAction<boolean>>;
  syncStoreDropdownRef: RefObject<HTMLDivElement | null>;
  handleSync: () => void;
  syncing: boolean;
  loading: boolean;
  syncActive: boolean;
  handleRefresh: () => void;
  syncRefreshNeeded: boolean;
  refreshRotation: number;
  syncMessage: string;
};

export default function InventoryToolbar(props: InventoryToolbarProps) {
  const {
    searchInput, setSearchInput, searchField, setSearchField,
    searchDropdownOpen, setSearchDropdownOpen, searchDropdownRef,
    stores, storeIds, storeDropdownOpen, setStoreDropdownOpen, storeDropdownRef, handleStoreToggle,
    status, statusDropdownOpen, setStatusDropdownOpen, statusDropdownRef, handleStatusToggle,
    stockLevel, stockDropdownOpen, setStockDropdownOpen, stockDropdownRef, handleStockLevelChange,
    hasActiveFilters, handleClearFilters,
    syncStoreIds, handleSyncStoreToggle, syncStoreDropdownOpen, setSyncStoreDropdownOpen, syncStoreDropdownRef,
    handleSync, syncing, loading, syncActive,
    handleRefresh, syncRefreshNeeded, refreshRotation, syncMessage,
  } = props;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const activeSearchField = SEARCH_FIELDS.find((f) => f.value === searchField);
  const filteredSearchFields = SEARCH_FIELDS.filter((f) =>
    f.label.toLowerCase().includes(searchInput.trim().toLowerCase())
  );
  const activeStockLevel = STOCK_LEVEL_OPTIONS.find((s) => s.value === stockLevel) ?? STOCK_LEVEL_OPTIONS[0];

  const selectSearchField = (value: string) => {
    setSearchField(value);
    setSearchInput('');
    setSearchDropdownOpen(false);
    searchInputRef.current?.focus();
  };

  const clearSearchField = () => {
    setSearchField('');
    setSearchDropdownOpen(true);
    searchInputRef.current?.focus();
  };

  return (
    <div className="flex flex-wrap items-start gap-2 mb-5">
      <div ref={searchDropdownRef} className="relative flex-1 min-w-48 sm:flex-none sm:w-64">
        <div className="flex items-center bg-white border border-gray-300 rounded-xl overflow-hidden shadow-sm">
          <svg className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {activeSearchField && (
            <span className="flex items-center gap-1 ml-1.5 pl-2 pr-1 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-md whitespace-nowrap flex-shrink-0">
              {activeSearchField.label}
              <button type="button" onClick={clearSearchField} className="text-blue-400 hover:text-blue-600 cursor-pointer">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          <input
            ref={searchInputRef}
            type="text"
            placeholder={activeSearchField ? `Search by ${activeSearchField.label.toLowerCase()}…` : 'Search products…'}
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
              <button key={field.value} onClick={() => selectSearchField(field.value)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                {field.label}
              </button>
            ))}
          </div>
        )}
      </div>

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
              onClick={() => handleStoreToggle('__clear__')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${storeIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
            >
              All Stores
            </button>
            {stores.length > 0 && <div className="border-t border-gray-100 my-1" />}
            {stores.map((store) => (
              <button key={store.id} onClick={() => handleStoreToggle(store.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
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

      <div className="relative" ref={statusDropdownRef}>
        <button
          onClick={() => setStatusDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
        >
          {status.length === 0 ? 'All Statuses' : `${status.length} Status${status.length > 1 ? 'es' : ''}`}
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {statusDropdownOpen && (
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-40 py-1">
            {STATUS_OPTIONS.map((item) => (
              <button key={item.value} onClick={() => handleStatusToggle(item.value)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${status.includes(item.value) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {status.includes(item.value) && (
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

      <div className="relative" ref={stockDropdownRef}>
        <button
          onClick={() => setStockDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-600 shadow-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap"
        >
          {activeStockLevel.label}
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {stockDropdownOpen && (
          <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-44 py-1">
            {STOCK_LEVEL_OPTIONS.map((item) => (
              <button
                key={item.value || 'all'}
                onClick={() => handleStockLevelChange(item.value)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${stockLevel === item.value ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
              >
                {item.label}
                {stockLevel === item.value && (
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        {hasActiveFilters && (
          <button onClick={handleClearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 px-2.5 py-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}

        <SyncControls
          stores={stores}
          syncStoreIds={syncStoreIds}
          handleSyncStoreToggle={handleSyncStoreToggle}
          syncStoreDropdownOpen={syncStoreDropdownOpen}
          setSyncStoreDropdownOpen={setSyncStoreDropdownOpen}
          syncStoreDropdownRef={syncStoreDropdownRef}
          handleSync={handleSync}
          syncing={syncing}
          loading={loading}
          syncActive={syncActive}
        />

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

function SyncControls({
  stores,
  syncStoreIds,
  handleSyncStoreToggle,
  syncStoreDropdownOpen,
  setSyncStoreDropdownOpen,
  syncStoreDropdownRef,
  handleSync,
  syncing,
  loading,
  syncActive,
}: SyncControlsProps) {
  return (
    <div ref={syncStoreDropdownRef} className="relative">
      <div className="flex items-stretch gap-0">
        <button
          onClick={handleSync}
          disabled={syncing || loading || syncActive}
          className="flex items-center gap-1.5 bg-white border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-l-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed border-r-0"
        >
          <svg className={`w-4 h-4 ${syncing || syncActive ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            onClick={() => handleSyncStoreToggle('__clear__')}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${syncStoreIds.length === 0 ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
          >
            All Stores
          </button>
          {stores.length > 0 && <div className="border-t border-gray-100 my-1" />}
          {stores.map((store) => (
            <button key={store.id} onClick={() => handleSyncStoreToggle(store.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
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
  );
}
