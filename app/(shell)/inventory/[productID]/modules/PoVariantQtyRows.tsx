'use client';

import { memo } from 'react';
import type { VariantDetail } from './types';

type PoVariantQtyRowsProps = {
  variants: VariantDetail[];
  quantities: Record<string, string>;
  onQuantityChange: (variantId: string, value: string) => void;
};

function PoVariantQtyRows({ variants, quantities, onQuantityChange }: PoVariantQtyRowsProps) {
  return (
    <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-3 py-2">Variant</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Stock</th>
            <th className="px-3 py-2">Qty</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.id} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 text-gray-900">{variant.title ?? '-'}</td>
              <td className="px-3 py-2 text-gray-500">{variant.sku ?? '-'}</td>
              <td className="px-3 py-2 text-gray-500">{variant.inventoryQuantity}</td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min={1}
                  value={quantities[variant.id] ?? '1'}
                  onChange={(e) => onQuantityChange(variant.id, e.target.value)}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(PoVariantQtyRows);
