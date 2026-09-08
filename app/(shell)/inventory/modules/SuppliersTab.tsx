'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import Pagination from '@/components/Pagination';
import type { useSuppliers } from './hooks/useSuppliers';
import { Pencil, Plus, Search, Trash, Users } from './icons';
import { formatDate } from './utils';

export default function SuppliersTab({ suppliers: s }: { suppliers: ReturnType<typeof useSuppliers> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4">
        <div className="relative flex-1 min-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={s.searchInput}
            onChange={(e) => s.setSearchInput(e.target.value)}
            placeholder="Search suppliers by name…"
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          type="button"
          onClick={s.openCreate}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-emerald-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add supplier
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">PO email</th>
              <th className="px-4 py-2">Contact email</th>
              <th className="px-4 py-2 text-right">Products</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {s.initialLoading ? (
              <SkeletonRows />
            ) : s.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                  <Users className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                  {s.searchInput ? 'No suppliers match your search.' : 'No suppliers yet — add one to get started.'}
                </td>
              </tr>
            ) : (
              s.rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{row.poEmail}</td>
                  <td className="px-4 py-2.5 text-gray-500">{row.contactEmail || '—'}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{row.productCount}</td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => s.openEdit(row)}
                        aria-label={`Edit ${row.name}`}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => s.setDeleteTarget(row)}
                        aria-label={`Delete ${row.name}`}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination pagination={s.pagination} loading={s.loading} pageNumbers={s.pageNumbers} onPageChange={s.goToPage} itemLabel="suppliers" />

      {s.deleteTarget && (
        <ModalShell
          title="Delete this supplier?"
          onClose={() => s.setDeleteTarget(null)}
          footer={
            <ModalActions onCancel={() => s.setDeleteTarget(null)} onConfirm={s.confirmDelete} confirmLabel={s.deleting ? 'Deleting...' : 'Delete supplier'} disabled={s.deleting} danger />
          }
        >
          <p className="text-sm text-gray-600">
            This removes <strong className="font-semibold text-gray-900">{s.deleteTarget.name}</strong>. This can&apos;t be undone.
            {s.deleteTarget.productCount > 0 && (
              <span className="mt-2 block text-amber-700">
                This supplier is linked to {s.deleteTarget.productCount} product{s.deleteTarget.productCount === 1 ? '' : 's'} — the link is simply removed, unless
                it&apos;s the only supplier on one of them, in which case the delete is refused.
              </span>
            )}
          </p>
        </ModalShell>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100 last:border-0">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3.5 animate-pulse rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
