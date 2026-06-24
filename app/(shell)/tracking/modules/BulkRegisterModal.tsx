'use client';

import DateRangeCalendar from './DateRangeCalendar';
import { fmtCalDate } from './utils';
import type { BulkRegisterModalState, StoreOption } from './types';

type BulkRegisterModalProps = {
  modal: BulkRegisterModalState;
  stores: StoreOption[];
  onClose: () => void;
  onSubmit: () => void;
  onDateClick: (date: string) => void;
  onStoreToggle: (id: string) => void;
  onSetHoverDate: (date: string | null) => void;
  onSetStoreDropdownOpen: (open: boolean) => void;
  onNavPrev: () => void;
  onNavNext: () => void;
  onClearDates: () => void;
};

export default function BulkRegisterModal({
  modal, stores, onClose, onSubmit,
  onDateClick, onStoreToggle, onSetHoverDate, onSetStoreDropdownOpen,
  onNavPrev, onNavNext, onClearDates,
}: BulkRegisterModalProps) {
  const periodLabel = modal.dateFrom && modal.dateTo
    ? `${fmtCalDate(modal.dateFrom)} – ${fmtCalDate(modal.dateTo)}`
    : modal.dateFrom
      ? `From ${fmtCalDate(modal.dateFrom)}`
      : 'All time';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Register Existing Orders</h2>
          <p className="text-xs text-gray-500 mt-0.5">Queue a bulk registration job for orders with unregistered tracking numbers.</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Store selector */}
          {stores.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Stores</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onSetStoreDropdownOpen(!modal.storeDropdownOpen)}
                  className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                >
                  {modal.storeIds.length === stores.length
                    ? 'All Stores'
                    : modal.storeIds.length === 0
                      ? 'No Stores'
                      : `${modal.storeIds.length} Store${modal.storeIds.length > 1 ? 's' : ''}`}
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {modal.storeDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-48 py-1">
                    {stores.map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => onStoreToggle(store.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${modal.storeIds.includes(store.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                          {modal.storeIds.includes(store.id) && (
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
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Date Range <span className="normal-case font-normal text-gray-400">({periodLabel})</span></p>
            <DateRangeCalendar
              dateFrom={modal.dateFrom}
              dateTo={modal.dateTo}
              hoverDate={modal.hoverDate}
              calendarNav={modal.calendarNav}
              onDateClick={onDateClick}
              onHover={onSetHoverDate}
              onNavPrev={onNavPrev}
              onNavNext={onNavNext}
              onClear={onClearDates}
            />
          </div>

          {/* Count */}
          {modal.error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{modal.error}</div>
          )}
          {modal.loading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8" />
              </svg>
              Counting unregistered orders…
            </p>
          ) : (
            <p className="text-sm text-gray-700">
              {modal.count === 0
                ? 'All orders with tracking numbers are already registered.'
                : `${modal.count ?? '?'} order${modal.count !== 1 ? 's' : ''} with unregistered tracking numbers will be queued for registration.`}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={modal.submitting}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={modal.submitting || modal.loading || modal.count === 0}
            className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {modal.submitting ? 'Queuing…' : 'Queue Registration'}
          </button>
        </div>
      </div>
    </div>
  );
}
