'use client';

import OrderPicker from './OrderPicker';
import OrderStockSection from './OrderStockSection';
import type { useRequestStockModal } from './useRequestStockModal';

type Props = ReturnType<typeof useRequestStockModal>;

export default function RequestStockModal({ open, closeModal, picker, toggleOrder, removeOrder, sections, updateItem, updateMessage, addItem, removeItem, submitAll, hasPendingSection, saving }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-4 py-6">
      <div className="flex max-h-[90vh] min-h-[220px] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">Request stock</h3>
          <button
            onClick={closeModal}
            disabled={saving}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close stock request modal"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <OrderPicker
            query={picker.query}
            setQuery={picker.setQuery}
            options={picker.options}
            loading={picker.loading}
            open={picker.open}
            setOpen={picker.setOpen}
            selectedOrders={picker.selectedOrders}
            onToggle={toggleOrder}
            onRemove={removeOrder}
          />

          {picker.selectedOrders.length > 0 && (
            <div className="mt-4 space-y-3">
              {picker.selectedOrders.map((order) => (
                <OrderStockSection
                  key={order.id}
                  section={sections[order.id]}
                  updateItem={updateItem}
                  updateMessage={updateMessage}
                  addItem={addItem}
                  removeItem={removeItem}
                />
              ))}
            </div>
          )}
        </div>

        {picker.selectedOrders.length > 0 && hasPendingSection && (
          <div className="flex justify-end border-t border-gray-200 px-5 py-3">
            <button
              type="button"
              onClick={() => void submitAll()}
              disabled={saving}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
