'use client';

import { useMemo } from 'react';
import { ModalShell, ModalActions } from '@/components/ModalShell';
import EditFieldModal from './EditFieldModal';
import CreatePoModal from './CreatePoModal';
import PoDetailModal from './PoDetailModal';
import PoReceiveModal from './PoReceiveModal';
import { formatAud } from './utils';
import type { useProductDetailPage } from './hooks/useProductDetailPage';

type ProductDetailModalsProps = {
  p: ReturnType<typeof useProductDetailPage>;
};

export default function ProductDetailModals({ p }: ProductDetailModalsProps) {
  const createPoVariantIds = p.purchaseOrders.createVariantIds;
  const createPoVariants = useMemo(
    () => (p.product ? p.product.variants.filter((v) => createPoVariantIds.includes(v.id)) : []),
    [p.product, createPoVariantIds],
  );

  return (
    <>
      {p.stockAdjust.modalOpen && (
        <ModalShell
          title="Adjust stock"
          onClose={p.stockAdjust.closeModal}
          footer={
            <ModalActions
              onCancel={p.stockAdjust.closeModal}
              onConfirm={p.stockAdjust.apply}
              confirmLabel={p.stockAdjust.adjusting ? 'Applying...' : 'Apply'}
              disabled={p.stockAdjust.adjusting || p.stockAdjust.checkedLocationIds.size === 0}
            />
          }
        >
          <p className="text-sm text-gray-500 mb-3">Select the locations to apply this adjustment to.</p>
          <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {p.locations.map((location) => (
              <li key={location.id}>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={p.stockAdjust.checkedLocationIds.has(location.id)}
                    onChange={() => p.stockAdjust.toggleLocation(location.id)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  {location.name}
                </label>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium text-gray-900 mb-4">
            Total: {p.stockAdjust.totalDelta > 0 ? '+' : ''}
            {p.stockAdjust.totalDelta} across {p.stockAdjust.checkedLocationIds.size} location
            {p.stockAdjust.checkedLocationIds.size === 1 ? '' : 's'}
          </p>
        </ModalShell>
      )}

      <EditFieldModal edit={p.fieldEdit} />

      {p.product && (
        <CreatePoModal po={p.purchaseOrders} supplierOptions={p.productSuppliers.supplierOptions} variants={createPoVariants} />
      )}

      <PoDetailModal po={p.purchaseOrders} />

      <PoReceiveModal po={p.purchaseOrders} locations={p.locations} />

      {p.selection.deleteConfirmOpen && (
        <ModalShell
          title="Delete variant(s)"
          onClose={p.selection.cancelDelete}
          footer={
            <ModalActions
              onCancel={p.selection.cancelDelete}
              onConfirm={p.selection.confirmDelete}
              confirmLabel={p.selection.bulkSaving ? 'Deleting...' : 'Delete'}
              disabled={p.selection.bulkSaving}
              danger
            />
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            This permanently deletes {p.selection.selectedIds.size} variant(s) from Shopify. This cannot be undone.
          </p>
        </ModalShell>
      )}

      {p.pricing.confirmTarget && p.product && (
        <ModalShell
          title="Use price"
          onClose={p.pricing.cancelUsePrice}
          footer={
            <ModalActions
              onCancel={p.pricing.cancelUsePrice}
              onConfirm={p.pricing.confirmUsePrice}
              confirmLabel={p.pricing.applying ? 'Applying...' : 'Apply'}
              disabled={p.pricing.applying}
            />
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            Set price to {formatAud(p.pricing.confirmTarget.sellingIncTax)} and cost to {formatAud(p.pricing.confirmTarget.totalBuying)} on all{' '}
            {p.product.variants.length} variant{p.product.variants.length === 1 ? '' : 's'}? This updates Shopify.
          </p>
        </ModalShell>
      )}

      {p.siblingsPanel.navigateTarget && (
        <ModalShell
          title="Switch product"
          onClose={p.siblingsPanel.cancelNavigate}
          footer={
            <ModalActions onCancel={p.siblingsPanel.cancelNavigate} onConfirm={p.siblingsPanel.confirmNavigate} confirmLabel="Open" disabled={false} />
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            Open &quot;{p.siblingsPanel.navigateTarget.title}&quot; on {p.siblingsPanel.navigateTarget.store.name}?
          </p>
        </ModalShell>
      )}

      {p.siblingsPanel.removeTarget && (
        <ModalShell
          title="Remove product"
          onClose={p.siblingsPanel.cancelRemove}
          footer={
            <ModalActions
              onCancel={p.siblingsPanel.cancelRemove}
              onConfirm={p.siblingsPanel.confirmRemove}
              confirmLabel={p.siblingsPanel.removing ? 'Removing...' : 'Remove'}
              disabled={p.siblingsPanel.removing}
              danger
            />
          }
        >
          <p className="text-sm text-gray-600 mb-4">
            This permanently deletes &quot;{p.siblingsPanel.removeTarget.title}&quot; from {p.siblingsPanel.removeTarget.store.name} on Shopify. This
            cannot be undone.
          </p>
        </ModalShell>
      )}
    </>
  );
}
