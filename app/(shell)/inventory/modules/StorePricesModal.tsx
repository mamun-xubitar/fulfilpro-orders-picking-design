'use client';

import { ModalShell } from '@/components/ModalShell';
import { useEffect, useRef, useState } from 'react';
import type { StoreListingResult } from './types';
import { formatNumber } from './utils';

type DraftPrices = Record<string, string>;

type StorePricesModalProps = {
  listing: StoreListingResult;
  onClose: () => void;
  onSaveOne: (variantId: string, price: number) => Promise<boolean>;
  onSaveAll: (variants: { id: string; price: number }[]) => Promise<boolean>;
  saving: boolean;
};

export default function StorePricesModal({ listing, onClose, onSaveOne, onSaveAll, saving }: StorePricesModalProps) {
  const [drafts, setDrafts] = useState<DraftPrices>(() => Object.fromEntries(listing.variants.map((v) => [v.id, String(v.price)])));
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  // Nothing selected by default — the admin opts in to exactly what "Save selected" should touch.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const setDraft = (variantId: string, value: string) => setDrafts((prev) => ({ ...prev, [variantId]: value }));

  const parsed = (variantId: string) => {
    const raw = drafts[variantId] ?? '';
    const value = Number(raw);
    return { value, invalid: raw.trim() === '' || !Number.isFinite(value) || value < 0 };
  };

  const toggleRow = (variantId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const allSelected = listing.variants.length > 0 && selectedIds.size === listing.variants.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(listing.variants.map((v) => v.id)));

  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

  const selectedVariants = listing.variants.filter((v) => selectedIds.has(v.id));
  const anySelectedInvalid = selectedVariants.some((v) => parsed(v.id).invalid);

  const saveRow = async (variantId: string) => {
    const { value, invalid } = parsed(variantId);
    if (invalid) return;
    setSavingRowId(variantId);
    await onSaveOne(variantId, value);
    setSavingRowId(null);
  };

  const saveSelected = async () => {
    if (selectedVariants.length === 0 || anySelectedInvalid) return;
    const ok = await onSaveAll(selectedVariants.map((v) => ({ id: v.id, price: parsed(v.id).value })));
    if (ok) setSelectedIds(new Set());
  };

  return (
    <ModalShell
      title={`Edit prices — ${listing.storeName}`}
      onClose={onClose}
      extraWide
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={saveSelected}
            disabled={saving || anySelectedInvalid || selectedVariants.length === 0}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {saving ? 'Saving…' : `Save selected${selectedVariants.length > 0 ? ` (${selectedVariants.length})` : ''}`}
          </button>
        </div>
      }
    >
      <p className="mb-3 text-base font-semibold text-gray-900">{listing.productTitle ?? listing.storeName}</p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-10 py-2.5 pl-4 pr-2">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all variants"
                  className="rounded border-gray-300 text-blue-600 cursor-pointer"
                />
              </th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Variant</th>
              <th className="px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Inventory</th>
              <th className="px-2 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Price</th>
              <th className="w-20 py-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listing.variants.map((variant) => {
              const { invalid } = parsed(variant.id);
              const isRowSaving = saving && savingRowId === variant.id;
              const isSelected = selectedIds.has(variant.id);
              return (
                <tr key={variant.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${isSelected ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-2 pl-4 pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(variant.id)}
                      aria-label={`Select ${variant.title}`}
                      className="rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="min-w-40 px-2 py-2 text-[13px] font-medium text-gray-900">{variant.title}</td>
                  <td className="px-2 py-2 text-[13px] text-gray-500">{variant.sku ?? '—'}</td>
                  <td className="px-2 py-2 text-right text-[13px] tabular-nums text-gray-700">
                    {variant.inventoryQuantity !== null ? formatNumber(variant.inventoryQuantity) : '—'}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={drafts[variant.id] ?? ''}
                      onChange={(e) => setDraft(variant.id, e.target.value)}
                      aria-label={`Price for ${variant.title}`}
                      className={`ml-auto w-24 rounded-lg border px-2 py-1.5 text-right text-[13px] tabular-nums outline-none focus:ring-2 ${
                        invalid ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                    />
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      type="button"
                      onClick={() => saveRow(variant.id)}
                      disabled={saving || invalid}
                      className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                    >
                      {isRowSaving ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
