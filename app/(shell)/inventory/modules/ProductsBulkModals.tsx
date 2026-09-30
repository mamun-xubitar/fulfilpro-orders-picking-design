'use client';

import { MODAL_FOOTER_BTN_DANGER, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import { STATUS_OPTIONS } from './constants';
import type { useProductsTable } from './hooks/useProductsTable';

type ProductsBulkModalsProps = { table: ReturnType<typeof useProductsTable> };

export default function ProductsBulkModals({ table }: ProductsBulkModalsProps) {
  return (
    <>
      {table.statusModal !== null && (
        <ModalShell disableBackdropClose title="Set status" compact onClose={() => table.setStatusModal(null)}>
          <div className="space-y-1.5">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => table.applyStatus(option.value)}
                disabled={table.bulkRunning}
                className="h-[28px] w-full rounded-[7px] border border-inventory-border-strong px-3 text-left text-[12px] text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {option.label}
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {table.deleteConfirm && (
        <ModalShell disableBackdropClose
          title="Delete product"
          compact
          onClose={() => table.setDeleteConfirm(null)}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => table.setDeleteConfirm(null)}
                className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={table.confirmDelete}
                disabled={table.bulkRunning}
                className={`flex-1 ${MODAL_FOOTER_BTN_DANGER}`}
              >
                {table.bulkRunning ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            {table.deleteConfirm.kind === 'single'
              ? `Delete "${table.deleteConfirm.name}"? This cannot be undone.`
              : `Delete the selected products? This cannot be undone.`}
          </p>
        </ModalShell>
      )}
    </>
  );
}
