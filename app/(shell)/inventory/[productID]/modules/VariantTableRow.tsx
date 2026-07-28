'use client';

import { getVariantColor, getVariantSize, getStockCellClass, formatCurrency } from './utils';
import type { VariantDetail } from './types';

type VariantTableRowProps = {
  variant: VariantDetail;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  delta: number | undefined;
  onDeltaChange: (id: string, value: string) => void;
};

export default function VariantTableRow({ variant, selected, onToggleSelect, delta, onDeltaChange }: VariantTableRowProps) {
  return (
    <tr className={`border-b border-gray-200 hover:bg-gray-50 ${getStockCellClass(variant)} ${selected ? 'bg-blue-50/50' : ''}`}>
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(variant.id)}
          className="rounded border-gray-300 text-blue-600 cursor-pointer"
          aria-label={`Select ${variant.title ?? variant.sku ?? variant.id}`}
        />
      </td>
      <td className="px-3 py-2 text-sm text-gray-700">
        {getVariantColor(variant)} {getVariantSize(variant) && `/ ${getVariantSize(variant)}`}
      </td>
      <td className="px-3 py-2 text-sm text-gray-500">{variant.sku ?? '—'}</td>
      <td className="px-3 py-2 text-sm text-gray-700">{formatCurrency(variant.price)}</td>
      <td className="px-3 py-2 text-sm text-gray-700">{variant.cost != null ? formatCurrency(variant.cost) : '—'}</td>
      <td className={`px-3 py-2 text-sm text-gray-700`}>{variant.inventoryQuantity}</td>
      <td className="px-3 py-2">
        <input
          type="number"
          placeholder="±0"
          value={delta ?? ''}
          onChange={(e) => onDeltaChange(variant.id, e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-400"
        />
      </td>
      <td className="px-3 py-2 text-center">
        {variant.inventoryPolicy === 'CONTINUE' && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">
            Continue
          </span>
        )}
      </td>
    </tr>
  );
}
