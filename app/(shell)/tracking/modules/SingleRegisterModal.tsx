'use client';

import type { CarrierOption, OrderSearchOption, SingleRegisterModalState } from './types';
import CarrierField from './CarrierField';
import OrderSearchField from './OrderSearchField';

type SingleRegisterModalProps = {
  modal: SingleRegisterModalState;
  onClose: () => void;
  onSubmit: () => void;
  onFocusSearch: () => void;
  onBlurSearch: () => void;
  onSearchChange: (value: string) => void;
  onSelectOrder: (order: OrderSearchOption) => void;
  onTrackingNumberChange: (value: string) => void;
  onClearOrder: () => void;
  onCarrierSearchChange: (value: string) => void;
  onSelectCarrier: (carrier: CarrierOption) => void;
  onFocusCarrierSearch: () => void;
  onBlurCarrierSearch: () => void;
  onClearCarrier: () => void;
};

export default function SingleRegisterModal({
  modal, onClose, onSubmit,
  onFocusSearch, onBlurSearch, onSearchChange, onSelectOrder, onTrackingNumberChange, onClearOrder,
  onCarrierSearchChange, onSelectCarrier, onFocusCarrierSearch, onBlurCarrierSearch, onClearCarrier,
}: SingleRegisterModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        data-modal-boundary
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Add Tracking</h2>
          <p className="text-xs text-gray-500 mt-0.5">Register a tracking number for a single order.</p>
        </div>

        <div className="p-5 space-y-4">
          <OrderSearchField
            search={modal.search}
            results={modal.results}
            searching={modal.searching}
            dropdownOpen={modal.dropdownOpen}
            selectedOrder={modal.selectedOrder}
            onSearchChange={onSearchChange}
            onSelectOrder={onSelectOrder}
            onFocusSearch={onFocusSearch}
            onBlurSearch={onBlurSearch}
            onClearOrder={onClearOrder}
          />

          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Tracking Number
              {modal.suggesting && <span className="normal-case font-normal text-gray-400"> (loading suggestion…)</span>}
            </p>
            <input
              type="text"
              value={modal.trackingNumber}
              onChange={(e) => onTrackingNumberChange(e.target.value)}
              disabled={!modal.selectedOrder}
              placeholder="Enter tracking number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <CarrierField
            carrierName={modal.carrierName}
            carrierAutoDetected={modal.carrierAutoDetected}
            carrierSearch={modal.carrierSearch}
            carrierResults={modal.carrierResults}
            carrierSearching={modal.carrierSearching}
            carrierDropdownOpen={modal.carrierDropdownOpen}
            onCarrierSearchChange={onCarrierSearchChange}
            onSelectCarrier={onSelectCarrier}
            onFocusCarrierSearch={onFocusCarrierSearch}
            onBlurCarrierSearch={onBlurCarrierSearch}
            onClearCarrier={onClearCarrier}
          />

          {modal.error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{modal.error}</div>
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
            disabled={modal.submitting || !modal.selectedOrder || !modal.trackingNumber.trim()}
            className="px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {modal.submitting ? 'Registering…' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
