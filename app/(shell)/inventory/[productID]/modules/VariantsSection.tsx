'use client';

import { useState } from 'react';
import ColorList from './ColorList';
import VariantTable from './VariantTable';
import VariantBulkBar from './VariantBulkBar';
import SupplierPoPanel from './SupplierPoPanel';
import type { useProductDetailPage } from './hooks/useProductDetailPage';

type VariantsSectionProps = {
  p: ReturnType<typeof useProductDetailPage>;
};

export default function VariantsSection({ p }: VariantsSectionProps) {
  const [supplierPanelExpanded, setSupplierPanelExpanded] = useState(false);
  if (!p.product) return null;

  const selectedVariants = p.product.variants.filter((v) => p.selection.selectedIds.has(v.id));

  const onSetMargin = (marginPercent: number) => {
    const updates = selectedVariants
      .filter((v) => v.cost != null)
      .map((v) => ({ id: v.id, cost: Number((v.price * (1 - marginPercent / 100)).toFixed(2)) }));
    p.selection.applyBulkVariantUpdate(updates);
  };

  return (
    <div
      className="grid gap-4 transition-[grid-template-columns] duration-200"
      style={{ gridTemplateColumns: supplierPanelExpanded ? '1fr 20rem' : '1fr 0rem' }}
    >
      <div className="min-w-0 bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-4">
        <ColorList colorGroups={p.colorGroups} selectedColorKeys={p.selectedColorKeys} onToggleColor={p.toggleColor} />

        <div className="min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Variants</h3>
            <select
              value={p.sizeFilter}
              onChange={(e) => p.setSizeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none"
            >
              <option value="">All sizes</option>
              {p.sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            {p.stockAdjust.hasPendingDeltas && (
              <button
                type="button"
                onClick={p.stockAdjust.openModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Confirm adjust ({p.stockAdjust.totalDelta > 0 ? '+' : ''}
                {p.stockAdjust.totalDelta})
              </button>
            )}
          </div>

          <VariantBulkBar
            selectedVariants={selectedVariants}
            bulkSaving={p.selection.bulkSaving}
            onSetPrice={p.selection.setPriceForSelection}
            onSetCost={p.selection.setCostForSelection}
            onSetMargin={onSetMargin}
            onSetContinueSelling={p.selection.setContinueSellingForSelection}
            onRequestDelete={p.selection.requestDelete}
            onClear={p.selection.clearSelection}
          />

          <VariantTable
            variants={p.filteredVariants}
            selectedIds={p.selection.selectedIds}
            onToggleSelect={p.selection.toggleVariant}
            onToggleAll={() => p.selection.toggleAll(p.filteredVariants)}
            deltas={p.stockAdjust.deltas}
            onDeltaChange={p.stockAdjust.setDelta}
          />
        </div>
      </div>

      <SupplierPoPanel expanded={supplierPanelExpanded} onToggle={() => setSupplierPanelExpanded((prev) => !prev)} />
    </div>
  );
}
