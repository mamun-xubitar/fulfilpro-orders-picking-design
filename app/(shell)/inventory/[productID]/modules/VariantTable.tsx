'use client';

import VariantTableRow from './VariantTableRow';
import type { VariantDetail } from './types';

type VariantTableProps = {
  variants: VariantDetail[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  deltas: Record<string, number>;
  onDeltaChange: (id: string, value: string) => void;
  hasPendingDeltas: boolean;
  onConfirmAdjust: () => void;
};

export default function VariantTable({
  variants,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  deltas,
  onDeltaChange,
  hasPendingDeltas,
  onConfirmAdjust,
}: VariantTableProps) {
  const allSelected = variants.length > 0 && variants.every((v) => selectedIds.has(v.id));

  return (
    <div className="max-h-150 overflow-y-auto overflow-x-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="px-3 py-2 w-8">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="rounded border-gray-300 text-blue-600 cursor-pointer" />
            </th>
            <th className="px-3 py-2">Variant</th>
            <th className="px-3 py-2">SKU</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Cost</th>
            <th className="px-3 py-2">Stock</th>
            <th className="px-3 py-2">
              {hasPendingDeltas ? (
                <button
                  type="button"
                  onClick={onConfirmAdjust}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium normal-case tracking-normal px-2 py-1 rounded-lg cursor-pointer"
                >
                  Confirm
                </button>
              ) : (
                'Adjust'
              )}
            </th>
            <th className="px-3 py-2 text-center">Policy</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <VariantTableRow
              key={variant.id}
              variant={variant}
              selected={selectedIds.has(variant.id)}
              onToggleSelect={onToggleSelect}
              delta={deltas[variant.id]}
              onDeltaChange={onDeltaChange}
            />
          ))}
          {variants.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center text-sm text-gray-400">
                No variants match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
