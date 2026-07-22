'use client';

import { useDropdownPosition } from './hooks/useDropdownPosition';
import type { OrderSearchOption } from './types';

type OrderSearchFieldProps = {
  search: string;
  results: OrderSearchOption[];
  searching: boolean;
  dropdownOpen: boolean;
  selectedOrder: OrderSearchOption | null;
  onSearchChange: (value: string) => void;
  onSelectOrder: (order: OrderSearchOption) => void;
  onFocusSearch: () => void;
  onBlurSearch: () => void;
  onClearOrder: () => void;
};

export default function OrderSearchField({
  search, results, searching, dropdownOpen, selectedOrder,
  onSearchChange, onSelectOrder, onFocusSearch, onBlurSearch, onClearOrder,
}: OrderSearchFieldProps) {
  const { anchorRef, openUpward, computeDirection } = useDropdownPosition<HTMLInputElement>();

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Order</p>
      {selectedOrder ? (
        <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-800">
            #{selectedOrder.number}
            {selectedOrder.customer ? ` — ${selectedOrder.customer}` : ''}
          </span>
          <button
            type="button"
            onClick={onClearOrder}
            className="text-xs text-gray-500 hover:text-red-500 cursor-pointer"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={anchorRef}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => { computeDirection(); onFocusSearch(); }}
            onBlur={onBlurSearch}
            placeholder="Search by order number or customer…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dropdownOpen && (
            <div
              onMouseDown={(e) => e.preventDefault()}
              className={`absolute left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1 ${
                openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
              }`}
            >
              {searching ? (
                <p className="px-3 py-2 text-sm text-gray-500">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-500">
                  {search.trim() ? 'No orders found.' : 'No recent orders.'}
                </p>
              ) : (
                results.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => onSelectOrder(order)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    #{order.number}{order.customer ? ` — ${order.customer}` : ''}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
