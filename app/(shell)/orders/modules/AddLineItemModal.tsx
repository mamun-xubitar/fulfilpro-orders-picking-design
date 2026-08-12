'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import VariantPicker from './VariantPicker';
import type { AddLineItemModalState, VariantSearchResult } from './types';

type Props = {
  modal: AddLineItemModalState | null;
  setMode: (mode: 'variant' | 'custom') => void;
  setQuery: (query: string) => void;
  selectVariant: (variant: VariantSearchResult | null) => void;
  setQuantity: (quantity: number) => void;
  setCustomTitle: (title: string) => void;
  setCustomPrice: (price: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function AddLineItemModal({
  modal,
  setMode,
  setQuery,
  selectVariant,
  setQuantity,
  setCustomTitle,
  setCustomPrice,
  onClose,
  onConfirm,
}: Props) {
  if (!modal) return null;
  const { mode, query, results, searching, selectedVariant, customTitle, customPrice, quantity, saving, error } = modal;

  return (
    <ModalShell
      title="Add line item"
      onClose={onClose}
      wide
      allowOverflow
      footer={<ModalActions onCancel={onClose} onConfirm={onConfirm} confirmLabel={saving ? 'Adding...' : 'Add'} disabled={saving} />}
    >
      <div className="space-y-4">
        <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
          <button
            type="button"
            onClick={() => setMode('variant')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer ${mode === 'variant' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Store product
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium cursor-pointer ${mode === 'custom' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Custom item
          </button>
        </div>

        {mode === 'variant' ? (
          <VariantPicker
            query={query}
            results={results}
            searching={searching}
            selectedVariant={selectedVariant}
            currencyCode={modal.currencyCode}
            setQuery={setQuery}
            selectVariant={selectVariant}
          />
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Title</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                Price{modal.currencyCode ? ` (${modal.currencyCode})` : ''}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </ModalShell>
  );
}
