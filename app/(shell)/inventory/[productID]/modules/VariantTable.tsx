'use client';

import CheckMarkBox from './CheckMarkBox';
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
  emptyMessage: string;
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
  emptyMessage,
}: VariantTableProps) {
  const allSelected = variants.length > 0 && variants.every((v) => selectedIds.has(v.id));

  return (
    <div className="max-h-150 overflow-y-auto overflow-x-auto">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="px-3 py-2 w-8">
              <button type="button" onClick={onToggleAll} className="cursor-pointer" aria-label="Select all variants">
                <CheckMarkBox checked={allSelected} />
              </button>
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
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
