'use client';

import { MODAL_FOOTER_BTN_DANGER, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import Pagination from '@/components/Pagination';
import { locationChipClass } from './LocationPickerMenu';
import type { LocationsState } from './hooks/useLocations';
import { Pencil, Plus, Search, Trash } from './icons';
import { useInventoryAccess } from './InventoryAccess';
import { SkeletonRows, type SkeletonCell } from './Skeleton';
import { formatDate } from './utils';

const TH = 'px-2 py-1';
const SKELETON: SkeletonCell[] = ['text', 'text', 'num', 'text', { kind: 'actions', count: 2 }];

/** The Location module tab — every location with how many variants are kept there. Mirrors
 * SuppliersTab: search, add, edit, delete (refused while variants are still assigned). */
export default function LocationsTab({ locations: l, onOpenStoreLocations }: { locations: LocationsState; onOpenStoreLocations: () => void }) {
  const { canEdit } = useInventoryAccess();
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm">
      <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-border px-2 py-1.5">
        <div className="relative min-w-44 flex-1 sm:w-56 sm:flex-none">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-inventory-text-subtle" />
          <input
            type="text"
            value={l.searchInput}
            onChange={(e) => l.setSearchInput(e.target.value)}
            placeholder="Search locations by name…"
            aria-label="Search locations"
            className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong pl-7 pr-2 text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onOpenStoreLocations}
            className="flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[10px] font-bold leading-none text-inventory-text-muted shadow-sm transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer"
          >
            Store locations
          </button>
        )}
        {canEdit && (
          <button
            type="button"
            onClick={l.openCreate}
            className="flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[6px] bg-inventory-success px-[6px] text-[10px] font-bold leading-none text-white shadow-sm transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add location
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table aria-busy={l.loading || l.initialLoading} className="w-full border-collapse text-[11px] leading-none">
          <thead>
            <tr className="border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
              <th className={TH}>Name</th>
              <th className={TH}>Description</th>
              <th className={`${TH} text-right`}>Variants</th>
              <th className={TH}>Created</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {l.showSkeleton ? (
              <SkeletonRows rows={l.rows.length || 6} cells={SKELETON} />
            ) : l.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-8 text-center text-[11px] text-inventory-text-subtle">
                  {l.searchInput ? 'No locations match your search.' : 'No locations yet — add one, or create it from a variant’s Location cell.'}
                </td>
              </tr>
            ) : (
              l.rows.map((row) => (
                <tr key={row.id} className="border-b border-inventory-divider transition-colors duration-150 last:border-0 hover:bg-inventory-surface-hover">
                  <td className="px-2 py-1">
                    <span className={`inline-flex items-center rounded-[4px] border px-[5px] py-[2px] text-[10px] font-semibold ${locationChipClass(row.id)}`}>{row.name}</span>
                  </td>
                  <td className="max-w-[320px] truncate px-2 py-1 text-inventory-text-muted" title={row.description ?? undefined}>
                    {row.description || '—'}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{row.variantCount}</td>
                  <td className="px-2 py-1 text-inventory-text-subtle">{formatDate(row.createdAt)}</td>
                  <td className="px-2 py-1">
                    {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => l.openEdit(row)} aria-label={`Edit ${row.name}`} className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => l.setDeleteTarget(row)} aria-label={`Delete ${row.name}`} className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger-hover cursor-pointer">
                        <Trash className="h-3 w-3" />
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination pagination={l.pagination} loading={l.loading} pageNumbers={l.pageNumbers} onPageChange={l.goToPage} itemLabel="locations" />

      {l.deleteTarget && (
        <ModalShell
          disableBackdropClose
          title="Delete this location?"
          compact
          onClose={() => l.setDeleteTarget(null)}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => l.setDeleteTarget(null)} className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}>
                Cancel
              </button>
              <button type="button" onClick={l.confirmDelete} disabled={l.deleting || l.deleteTarget.variantCount > 0} className={`flex-1 ${MODAL_FOOTER_BTN_DANGER}`}>
                {l.deleting ? 'Deleting...' : 'Delete location'}
              </button>
            </div>
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            This removes <strong className="font-semibold text-inventory-text">{l.deleteTarget.name}</strong>. This can&apos;t be undone.
            {l.deleteTarget.variantCount > 0 && (
              <span className="mt-2 block text-inventory-danger">
                {l.deleteTarget.variantCount} variant{l.deleteTarget.variantCount === 1 ? ' is' : 's are'} kept here — remove this location from {l.deleteTarget.variantCount === 1 ? 'it' : 'them'} first.
              </span>
            )}
          </p>
        </ModalShell>
      )}
    </div>
  );
}
