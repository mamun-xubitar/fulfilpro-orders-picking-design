'use client';

import { ModalShell, ModalActions } from '@/components/ModalShell';
import type { AddLineItemModalState } from './types';

type Props = {
  modal: AddLineItemModalState | null;
  setMode: (mode: 'variant' | 'custom') => void;
  setQuery: (query: string) => void;
  selectVariant: (variantShopifyId: string) => void;
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
  const { mode, query, results, searching, selectedVariantId, customTitle, customPrice, quantity, saving, error } = modal;

  return (
    <ModalShell
      title="Add line item"
      onClose={onClose}
      wide
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
          <div className="space-y-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by product title or SKU..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {searching ? (
                <p className="px-3 py-3 text-sm text-gray-400">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-400">{query ? 'No products found.' : 'Start typing to search products.'}</p>
              ) : (
                results.map((result) => (
                  <button
                    key={result.variantShopifyId}
                    type="button"
                    onClick={() => selectVariant(result.variantShopifyId)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left cursor-pointer hover:bg-gray-50 ${selectedVariantId === result.variantShopifyId ? 'bg-blue-50' : ''}`}
                  >
                    {result.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={result.imageUrl} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-100 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{result.productTitle}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {result.variantTitle ? `${result.variantTitle} · ` : ''}{result.sku || 'No SKU'} · {result.inventoryQuantity} on hand
                      </p>
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-shrink-0">${result.price.toFixed(2)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
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
              <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Price</label>
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
