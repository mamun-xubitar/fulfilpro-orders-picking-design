'use client';

import type { BackInStockItem } from './useBackInStockData';
import type { OrderStockSectionState } from './useRequestStockModal';

type Props = {
  section: OrderStockSectionState;
  updateItem: (orderId: string, index: number, field: keyof BackInStockItem, value: string) => void;
  updateMessage: (orderId: string, value: string) => void;
  addItem: (orderId: string) => void;
  removeItem: (orderId: string, index: number) => void;
};

function getAvailableItemsForRow(section: OrderStockSectionState, rowIndex: number) {
  const selectedIds = new Set(
    section.items
      .map((item, index) => (index === rowIndex ? '' : item.lineItemId))
      .filter(Boolean)
  );
  return section.order.eligibleItems.filter((item) => !selectedIds.has(item.lineItemId));
}

function hasItemAvailableToAdd(section: OrderStockSectionState) {
  return section.order.eligibleItems.some((item) => (
    !section.items.some((selected) => selected.lineItemId === item.lineItemId)
  ));
}

function formatStockStatus(status: string) {
  if (status === 'back_in_stock') return 'Restocked';
  if (status === 'partially_back_in_stock') return 'Partially Restocked';
  return 'Pending';
}

export default function OrderStockSection({ section, updateItem, updateMessage, addItem, removeItem }: Props) {
  const { order } = section;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <p className="mb-2 text-sm font-semibold text-gray-900">Order {order.number} - {order.customer}</p>

      {section.loading ? (
        <div className="py-6 text-center text-sm text-gray-400">Loading stock request...</div>
      ) : section.requests.length > 0 ? (
        <div className="space-y-3">
          {section.requests.map((request) => (
            <div key={request.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-gray-900">{formatStockStatus(request.status)}</p>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-1 text-left font-medium">Item</th>
                    <th className="py-1 text-left font-medium">Supplier</th>
                    <th className="py-1 text-center font-medium">Qty</th>
                    <th className="py-1 text-left font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item, index) => (
                    <tr key={`${request.id}-${index}`} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2 text-gray-700">{item.item}</td>
                      <td className="py-1.5 pr-2 text-gray-600">{item.supplierName}</td>
                      <td className="py-1.5 text-center text-gray-700">{item.quantity}</td>
                      <td className="py-1.5 text-gray-600">{item.dueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : order.eligibleItems.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No product to request back in stock.
        </div>
      ) : (
        <div className="space-y-2">
          {section.items.map((item, index) => {
            const eligibleItems = getAvailableItemsForRow(section, index);
            const selected = eligibleItems.find((eligible) => eligible.lineItemId === item.lineItemId);
            return (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-2.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_70px_160px_34px]">
                <select
                  value={item.lineItemId}
                  onChange={(e) => updateItem(order.id, index, 'lineItemId', e.target.value)}
                  className="min-w-0 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                >
                  {eligibleItems.map((eligible) => (
                    <option key={eligible.lineItemId} value={eligible.lineItemId}>
                      {eligible.name}{eligible.sku ? ` - ${eligible.sku}` : ''} ({eligible.remainingQty} left)
                    </option>
                  ))}
                </select>
                <input
                  value={item.supplierName}
                  onChange={(e) => updateItem(order.id, index, 'supplierName', e.target.value)}
                  className="min-w-0 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                  placeholder="Supplier"
                />
                <input
                  type="number"
                  min={1}
                  max={selected?.remainingQty ?? 1}
                  value={item.quantity}
                  onChange={(e) => updateItem(order.id, index, 'quantity', e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-xs"
                  placeholder="Qty"
                />
                <label className="flex min-w-0 items-center overflow-hidden rounded-md border border-gray-300 bg-white">
                  <span className="border-r border-gray-200 bg-gray-50 px-2 py-1.5 text-[11px] font-medium text-gray-500">
                    Due date
                  </span>
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(e) => updateItem(order.id, index, 'dueDate', e.target.value)}
                    className="min-w-0 flex-1 px-2 py-1.5 text-xs outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeItem(order.id, index)}
                  disabled={section.items.length === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                  aria-label="Remove product detail"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => addItem(order.id)}
            disabled={!hasItemAvailableToAdd(section)}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add Product
          </button>
          <textarea
            value={section.message}
            onChange={(e) => updateMessage(order.id, e.target.value)}
            className="min-h-20 w-full rounded-md border border-gray-300 px-2.5 py-2 text-xs"
            placeholder="Message (optional)"
          />
        </div>
      )}

      {section.error && <p className="mt-2 text-sm text-red-600">{section.error}</p>}
    </div>
  );
}
