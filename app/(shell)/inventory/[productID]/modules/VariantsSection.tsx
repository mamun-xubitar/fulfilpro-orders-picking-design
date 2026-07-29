'use client';

import { useCallback, useMemo } from 'react';
import ColorList from './ColorList';
import ExpandCollapseButton from './ExpandCollapseButton';
import VariantTable from './VariantTable';
import VariantBulkBar from './VariantBulkBar';
import SupplierPoPanel from './SupplierPoPanel';
import type { useProductDetailPage } from './hooks/useProductDetailPage';

type VariantsSectionProps = {
  p: ReturnType<typeof useProductDetailPage>;
};

export default function VariantsSection({ p }: VariantsSectionProps) {
  const { filteredVariants, selection } = p;
  const { toggleAll } = selection;

  const selectedVariants = useMemo(
    () => (p.product ? p.product.variants.filter((v) => selection.selectedIds.has(v.id)) : []),
    [p.product, selection.selectedIds],
  );

  const onToggleAll = useCallback(() => toggleAll(filteredVariants), [toggleAll, filteredVariants]);

  if (!p.product) return null;

  const onSetMargin = (marginPercent: number) => {
    const updates = selectedVariants
      .filter((v) => v.cost != null)
      .map((v) => ({ id: v.id, cost: Number((v.price * (1 - marginPercent / 100)).toFixed(2)) }));
    p.selection.applyBulkVariantUpdate(updates);
  };

  return (
    <div
      className="grid gap-4 transition-[grid-template-columns] duration-200"
      style={{ gridTemplateColumns: p.purchaseOrders.panelExpanded ? '1fr 20rem' : '1fr 0rem' }}
    >
      <div className="min-w-0 bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-[12rem_1fr] gap-4 items-start">
        <ColorList
          colorGroups={p.colorGroups}
          selectedColorKeys={p.selectedColorKeys}
          onToggleColor={p.toggleColor}
          allSelected={p.allColorsSelected}
          onToggleAll={p.toggleAllColors}
        />

        <div className="min-w-0">
          <div className="@container flex items-center gap-3 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 shrink-0">Variants</h3>

            <VariantBulkBar
              selectedVariants={selectedVariants}
              bulkSaving={p.selection.bulkSaving}
              onCreatePo={() => p.purchaseOrders.openCreate(selectedVariants.map((v) => v.id))}
              onSetPrice={p.selection.setPriceForSelection}
              onSetCost={p.selection.setCostForSelection}
              onSetMargin={onSetMargin}
              onSetContinueSelling={p.selection.setContinueSellingForSelection}
              onRequestDelete={p.selection.requestDelete}
              onClear={p.selection.clearSelection}
            />

            <select
              value={p.sizeFilter}
              onChange={(e) => p.setSizeFilter(e.target.value)}
              className="ml-auto shrink-0 border border-gray-300 rounded-lg px-2 py-1 text-xs outline-none"
            >
              <option value="">All sizes</option>
              {p.sizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            <ExpandCollapseButton
              expanded={p.purchaseOrders.panelExpanded}
              onToggle={p.purchaseOrders.togglePanel}
              label="purchase orders panel"
            />
          </div>

          <VariantTable
            variants={filteredVariants}
            selectedIds={p.selection.selectedIds}
            onToggleSelect={p.selection.toggleVariant}
            onToggleAll={onToggleAll}
            deltas={p.stockAdjust.deltas}
            onDeltaChange={p.stockAdjust.setDelta}
            hasPendingDeltas={p.stockAdjust.hasPendingDeltas}
            onConfirmAdjust={p.stockAdjust.openModal}
            emptyMessage={
              p.colorGroups.length > 0 && p.selectedColorKeys.size === 0
                ? 'Select at least one color to see variants.'
                : 'No variants match the current filters.'
            }
          />
        </div>
      </div>

      <SupplierPoPanel po={p.purchaseOrders} />
    </div>
  );
}
