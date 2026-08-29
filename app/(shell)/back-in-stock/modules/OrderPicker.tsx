'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OrderOption } from './requestStockTypes';

type Props = {
  query: string;
  setQuery: (value: string) => void;
  options: OrderOption[];
  loading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedOrders: OrderOption[];
  onToggle: (option: OrderOption) => void;
  onRemove: (orderId: string) => void;
};

type DropdownPosition = { top: number; left: number; width: number };

const optionLabel = (option: OrderOption) => `${option.number} ${option.customer} | ${option.storeName}`;

export default function OrderPicker({ query, setQuery, options, loading, open, setOpen, selectedOrders, onToggle, onRemove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = (): void => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next: DropdownPosition = { top: rect.bottom + 4, left: rect.left, width: rect.width };
      setPosition((prev) => (
        prev && prev.top === next.top && prev.left === next.left && prev.width === next.width ? prev : next
      ));
    };

    updatePosition();

    // The dropdown's anchor (the input) shifts whenever the modal panel grows or
    // shrinks — e.g. selecting an order adds a chip above the input, or adds a
    // whole section below it — which changes nothing about the input's own size,
    // only its position. Observing the panel (not the input) catches that reflow.
    const panel = containerRef.current?.closest('.rounded-xl');
    const resizeObserver = panel ? new ResizeObserver(updatePosition) : null;
    resizeObserver?.observe(panel!);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const selectedIds = new Set(selectedOrders.map((order) => order.id));

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs font-semibold uppercase text-gray-500">Orders</label>

      {selectedOrders.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedOrders.map((order) => (
            <span key={order.id} className="inline-flex items-center gap-1 rounded-full bg-amber-100 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-amber-800">
              {optionLabel(order)}
              <button
                type="button"
                onClick={() => onRemove(order.id)}
                className="rounded-full p-0.5 hover:bg-amber-200"
                aria-label={`Remove order ${order.number}`}
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        placeholder="Search order number, customer, or store"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {open && position && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: position.top, left: position.left, width: position.width }}
          className="z-[60] max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {options.length > 0 ? (
            options.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(option.id)}
                  onChange={() => onToggle(option)}
                  className="rounded border-gray-300 text-blue-600 cursor-pointer"
                />
                <span className="text-gray-800">{optionLabel(option)}</span>
              </label>
            ))
          ) : loading ? (
            <p className="px-3 py-3 text-sm text-gray-400">Searching...</p>
          ) : (
            <p className="px-3 py-3 text-sm text-gray-400">No eligible orders found.</p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
