'use client';

import { MODAL_FOOTER_BTN_DANGER, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import Pagination from '@/components/Pagination';
import { SUPPLIER_PAGE_SIZE_OPTIONS, type useSuppliers } from './hooks/useSuppliers';
import { Pencil, Plus, Search, Trash, Users } from './icons';
import { useInventoryAccess } from './InventoryAccess';
import { SkeletonRows, type SkeletonCell } from './Skeleton';
import { formatDate } from './utils';
import { STICKY_THEAD } from './constants';

const SKELETON: SkeletonCell[] = ['text', 'text', 'text', 'num', 'num', 'num', 'text', { kind: 'actions', count: 2 }];

type SuppliersTabProps = {
  suppliers: ReturnType<typeof useSuppliers>;
  /** Jump to the Purchase Orders / Payments tab narrowed to this supplier. */
  onOpenPurchaseOrders: (supplierId: string) => void;
  onOpenPayments: (supplierId: string) => void;
};

/** A count that opens the matching tab, filtered to the supplier; a plain 0 when there's nothing to open. */
function CountLink({ count, label, onClick }: { count: number; label: string; onClick: () => void }) {
  if (count === 0) return <span className="tabular-nums text-inventory-text-subtle">0</span>;
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="font-semibold tabular-nums text-inventory-secondary underline-offset-2 hover:underline cursor-pointer">
      {count}
    </button>
  );
}

export default function SuppliersTab({ suppliers: s, onOpenPurchaseOrders, onOpenPayments }: SuppliersTabProps) {
  const { canEdit } = useInventoryAccess();
  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-border px-2 py-1.5">
        <div className="relative min-w-44 flex-1 sm:flex-none sm:w-56">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-inventory-text-subtle" />
          <input
            type="text"
            value={s.searchInput}
            onChange={(e) => s.setSearchInput(e.target.value)}
            placeholder="Search suppliers by name…"
            className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong pl-7 pr-2 text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => s.openCreate()}
            className="flex h-[22px] items-center gap-1 whitespace-nowrap rounded-[6px] bg-inventory-success px-[6px] text-[10px] font-bold leading-none text-white shadow-sm transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            Add supplier
          </button>
        )}
      </div>

      <div className="overflow-x-auto thin-scroll xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <table aria-busy={s.loading || s.initialLoading} className="w-full border-collapse text-[11px] leading-none">
          <thead className={STICKY_THEAD}>
            <tr className="bg-inventory-surface border-b border-inventory-border text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
              <th className="px-2 py-1">Name</th>
              <th className="px-2 py-1">PO email</th>
              <th className="px-2 py-1">Contact email</th>
              <th className="px-2 py-1 text-right">Products</th>
              <th className="px-2 py-1 text-right">PO&apos;s</th>
              <th className="px-2 py-1 text-right">Payments</th>
              <th className="px-2 py-1">Created</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {s.showSkeleton ? (
              <SkeletonRows rows={s.rows.length || 6} cells={SKELETON} />
            ) : s.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-[11px] text-inventory-text-subtle">
                  <Users className="mx-auto mb-1.5 h-5 w-5 text-inventory-border-strong" />
                  {s.searchInput ? 'No suppliers match your search.' : 'No suppliers yet — add one to get started.'}
                </td>
              </tr>
            ) : (
              s.rows.map((row) => (
                <tr key={row.id} className="border-b border-inventory-divider transition-colors duration-150 hover:bg-inventory-surface-hover">
                  <td className="px-2 py-1 font-medium text-inventory-text">{row.name}</td>
                  <td className="px-2 py-1 text-inventory-text-muted">{row.poEmail}</td>
                  <td className="px-2 py-1 text-inventory-text-subtle">{row.contactEmail || '—'}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{row.productCount}</td>
                  <td className="px-2 py-1 text-right">
                    <CountLink count={row.purchaseOrderCount} label={`View ${row.name}'s purchase orders`} onClick={() => onOpenPurchaseOrders(row.id)} />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <CountLink count={row.paymentCount} label={`View ${row.name}'s payments`} onClick={() => onOpenPayments(row.id)} />
                  </td>
                  <td className="px-2 py-1 text-inventory-text-subtle">{formatDate(row.createdAt)}</td>
                  <td className="px-2 py-1">
                    {canEdit && (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => s.openEdit(row)}
                        aria-label={`Edit ${row.name}`}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => s.setDeleteTarget(row)}
                        aria-label={`Delete ${row.name}`}
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-danger/10 hover:text-inventory-danger-hover cursor-pointer"
                      >
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

      <Pagination pagination={s.pagination} loading={s.loading} pageNumbers={s.pageNumbers} onPageChange={s.goToPage} itemLabel="suppliers" pageSizeOptions={SUPPLIER_PAGE_SIZE_OPTIONS} onPageSizeChange={s.setPageSize} />

      {s.deleteTarget && (
        <ModalShell disableBackdropClose
          title="Delete this supplier?"
          compact
          onClose={() => s.setDeleteTarget(null)}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => s.setDeleteTarget(null)}
                className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={s.confirmDelete}
                disabled={s.deleting}
                className={`flex-1 ${MODAL_FOOTER_BTN_DANGER}`}
              >
                {s.deleting ? 'Deleting...' : 'Delete supplier'}
              </button>
            </div>
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            This removes <strong className="font-semibold text-inventory-text">{s.deleteTarget.name}</strong>. This can&apos;t be undone.
            {s.deleteTarget.productCount > 0 && (
              <span className="mt-2 block text-inventory-warning-ink">
                This supplier is linked to {s.deleteTarget.productCount} product{s.deleteTarget.productCount === 1 ? '' : 's'} — the link is simply removed, unless
                it&apos;s the only supplier on one of them, in which case the delete is refused.
              </span>
            )}
            {s.deleteTarget.purchaseOrderCount > 0 && (
              <span className="mt-2 block text-inventory-danger">
                This supplier has {s.deleteTarget.purchaseOrderCount} purchase order{s.deleteTarget.purchaseOrderCount === 1 ? '' : 's'} — delete or reassign them first.
              </span>
            )}
          </p>
        </ModalShell>
      )}
    </div>
  );
}
