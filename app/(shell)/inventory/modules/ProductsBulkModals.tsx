'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import { STATUS_OPTIONS } from './constants';
import type { useProductsTable } from './hooks/useProductsTable';

type ProductsBulkModalsProps = { table: ReturnType<typeof useProductsTable> };

export default function ProductsBulkModals({ table }: ProductsBulkModalsProps) {
  return (
    <>
      {table.statusModal !== null && (
        <ModalShell title="Set status" onClose={() => table.setStatusModal(null)}>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => table.applyStatus(option.value)}
                disabled={table.bulkRunning}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {option.label}
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {table.deleteConfirm && (
        <ModalShell
          title="Delete product"
          onClose={() => table.setDeleteConfirm(null)}
          footer={
            <ModalActions
              onCancel={() => table.setDeleteConfirm(null)}
              onConfirm={table.confirmDelete}
              confirmLabel={table.bulkRunning ? 'Deleting...' : 'Delete'}
              disabled={table.bulkRunning}
              danger
            />
          }
        >
          <p className="text-sm text-gray-600">
            {table.deleteConfirm.kind === 'single'
              ? `Delete "${table.deleteConfirm.name}"? This cannot be undone.`
              : `Delete the selected products? This cannot be undone.`}
          </p>
        </ModalShell>
      )}
    </>
  );
}
