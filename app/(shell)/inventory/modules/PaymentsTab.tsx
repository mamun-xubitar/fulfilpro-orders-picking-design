'use client';

import Pagination from '@/components/Pagination';
import PaymentHistoryModal from './PaymentHistoryModal';
import { SkeletonRows, type SkeletonCell } from './Skeleton';
import SortableTh from './SortableTh';
import { PAYMENT_PAGE_SIZE_OPTIONS, type PaymentSortKey, type PaymentsTabState } from './hooks/usePaymentsTab';
import { Search } from './icons';
import { useInventoryAccess } from './InventoryAccess';
import type { SupplierOption } from './types';
import { formatDate, formatMoney, formatPoNumber } from './utils';
import { STICKY_THEAD } from './constants';

const CONTROL =
  'h-[24px] rounded-[7px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring cursor-pointer';
const COLUMN_COUNT = 11;
const SKELETON: SkeletonCell[] = ['stack', 'text', 'text', 'text', 'badge', 'text', 'num', 'num', 'num', 'num', { kind: 'actions', count: 2 }];
const ACTION_BTN =
  'h-[20px] rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[9px] font-bold text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer';

type PaymentsTabProps = {
  tab: PaymentsTabState;
  suppliers: SupplierOption[];
  onEdit: (purchaseOrderId: string) => void;
  onOpenSupplier: (supplierId: string) => void;
};

/** The Payments tab — every PO payment with its current state; edits happen in place (Edit opens
 * the Pay modal) and each save is kept in that payment's History. */
export default function PaymentsTab({ tab, suppliers, onEdit, onOpenSupplier }: PaymentsTabProps) {
  const { filters } = tab;
  const { canEdit } = useInventoryAccess();
  const th = (label: string, sortKey?: PaymentSortKey, align?: 'left' | 'right' | 'center') => (
    <SortableTh label={label} sortKey={sortKey} align={align} sort={tab.sort} dir={tab.dir} onSortChange={tab.changeSort} />
  );

  return (
    <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-sm xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
      <div className="flex flex-wrap items-center gap-[6px] border-b border-inventory-border px-2 py-1.5">
        <div className="relative min-w-44 flex-1 sm:w-64 sm:flex-none">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-inventory-text-subtle" />
          <input
            type="text"
            value={tab.searchInput}
            onChange={(e) => tab.setSearchInput(e.target.value)}
            placeholder="Search PO, product, supplier, reference…"
            aria-label="Search payments"
            className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong pl-7 pr-2 text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
          />
        </div>
        <select value={filters.supplierId} onChange={(e) => tab.setFilter('supplierId', e.target.value)} aria-label="Supplier" className={`${CONTROL} max-w-[170px]`}>
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(e) => tab.setFilter('status', e.target.value as typeof filters.status)} aria-label="Status" className={CONTROL}>
          <option value="">Paid &amp; unpaid</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
        </select>
        <label className="flex items-center gap-[4px] text-[10px] font-semibold text-inventory-text-subtle">
          From
          <input type="date" value={filters.dateFrom} onChange={(e) => tab.setFilter('dateFrom', e.target.value)} className={CONTROL} />
        </label>
        <label className="flex items-center gap-[4px] text-[10px] font-semibold text-inventory-text-subtle">
          To
          <input type="date" value={filters.dateTo} onChange={(e) => tab.setFilter('dateTo', e.target.value)} className={CONTROL} />
        </label>
        {tab.hasFilters && (
          <button type="button" onClick={tab.clearFilters} className="h-[22px] rounded-[6px] px-[8px] text-[10px] font-bold text-inventory-secondary hover:bg-inventory-secondary/10 cursor-pointer">
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto thin-scroll xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <table aria-busy={tab.loading || tab.initialLoading} className="w-full min-w-[980px] border-collapse text-[11px] leading-none">
          <thead className={STICKY_THEAD}>
            <tr className="border-b border-inventory-border bg-inventory-surface-muted">
              {th('Updated', 'updatedAt')}
              {th('PO', 'poNumber')}
              {th('Product', 'productTitle')}
              {th('Supplier', 'supplierName')}
              {th('Status', 'status', 'center')}
              {th('Paid on', 'paidAt')}
              {th('Currency', undefined, 'right')}
              {th('Buying', undefined, 'right')}
              {th('Freight / Misc', undefined, 'right')}
              {th('Total (AUD)', 'totalAud', 'right')}
              {th('Actions', undefined, 'right')}
            </tr>
          </thead>
          <tbody>
            {tab.showSkeleton ? (
              <SkeletonRows rows={tab.rows.length || 8} cells={SKELETON} />
            ) : tab.rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="px-2 py-10 text-center text-[11px] text-inventory-text-subtle">
                  {tab.hasFilters ? 'No payments match these filters.' : 'No payments yet — use Pay on a purchase order to record one.'}
                </td>
              </tr>
            ) : (
              tab.rows.map((row) => {
                const paid = row.status === 'PAID';
                return (
                  <tr key={row.id} className="border-b border-inventory-divider transition-colors duration-150 hover:bg-inventory-surface-hover">
                    <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">
                      {formatDate(row.updatedAt)}
                      <span className="mt-[2px] block text-[9.5px]">{row.updatedByName}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 font-medium text-inventory-text">{formatPoNumber(row.purchaseOrder.number)}</td>
                    <td className="max-w-[200px] truncate px-2 py-1.5 text-inventory-text" title={row.purchaseOrder.productTitle}>
                      {row.purchaseOrder.productTitle}
                    </td>
                    <td className="max-w-[150px] px-2 py-1.5">
                      <button type="button" onClick={() => onOpenSupplier(row.purchaseOrder.supplierId)} className="block max-w-full truncate text-left font-medium text-inventory-secondary underline-offset-2 hover:underline cursor-pointer">
                        {row.purchaseOrder.supplierName}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          paid ? 'border-inventory-success/30 bg-inventory-success/10 text-inventory-success-hover' : 'border-inventory-warning/30 bg-inventory-warning/10 text-inventory-warning-ink'
                        }`}
                      >
                        {paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{formatDate(row.paidAt)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">
                      {row.currencyCode} {row.exchangeRate}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{formatMoney(row.buyingPrice)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">
                      {formatMoney(row.freight)} / {formatMoney(row.misc)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-inventory-text">${formatMoney(row.totalAud)}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-end gap-[4px]">
                        <button type="button" onClick={() => tab.setHistoryTarget(row)} className={ACTION_BTN}>
                          History{row.historyCount > 1 ? ` (${row.historyCount})` : ''}
                        </button>
                        {canEdit && (
                          <button type="button" onClick={() => onEdit(row.purchaseOrderId)} className="h-[20px] rounded-[6px] bg-inventory-primary px-[6px] text-[9px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover cursor-pointer">
                            {paid ? 'Edit pay' : 'Pay'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        pagination={tab.pagination}
        loading={tab.loading}
        pageNumbers={tab.pageNumbers}
        onPageChange={tab.goToPage}
        itemLabel="payments"
        pageSizeOptions={PAYMENT_PAGE_SIZE_OPTIONS}
        onPageSizeChange={tab.setPageSize}
      />

      {tab.historyTarget && <PaymentHistoryModal payment={tab.historyTarget} onClose={() => tab.setHistoryTarget(null)} />}
    </div>
  );
}
