'use client';

import { VIEW_BTN } from './AdjustmentBits';
import SortableTh from './SortableTh';
import { SkeletonRows, type SkeletonCell } from './Skeleton';
import { activityTypeLabel } from './constants';
import type { HistorySortKey, HistoryTabState } from './hooks/useHistoryTab';
import type { InventoryActivityRecord } from './types';
import { formatDate } from './utils';

const COLUMN_COUNT = 6;
const SKELETON: SkeletonCell[] = ['text', 'stack', 'badge', 'text', 'text', { kind: 'actions', count: 1 }];

type HistoryTableProps = { tab: HistoryTabState; onOpenProduct: (productId: string) => void; onViewAdjustment: (id: string) => void };

export default function HistoryTable({ tab, onOpenProduct, onViewAdjustment }: HistoryTableProps) {
  const th = (label: string, sortKey?: HistorySortKey, align?: 'left' | 'right' | 'center') => (
    <SortableTh label={label} sortKey={sortKey} align={align} sort={tab.sort} dir={tab.dir} onSortChange={tab.changeSort} />
  );

  return (
    <div className="overflow-x-auto thin-scroll">
      <table aria-busy={tab.loading || tab.initialLoading} className="w-full min-w-[800px] border-collapse text-[11px] leading-none">
        <thead>
          <tr className="border-b border-inventory-border bg-inventory-surface-muted">
            {th('Date', 'createdAt')}
            {th('Product', 'productName')}
            {th('Type', 'type')}
            {th('Details')}
            {th('By', 'actorName')}
            {th('Actions', undefined, 'right')}
          </tr>
        </thead>
        <tbody>
          {tab.showSkeleton ? (
            <SkeletonRows rows={tab.rows.length || 8} cells={SKELETON} />
          ) : tab.rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-2 py-10 text-center text-[11px] text-inventory-text-subtle">
                {tab.hasFilters ? 'No history matches these filters.' : 'No activity recorded yet.'}
              </td>
            </tr>
          ) : (
            tab.rows.map((row) => <HistoryRow key={row.id} row={row} onOpenProduct={onOpenProduct} onViewAdjustment={onViewAdjustment} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function HistoryRow({ row, onOpenProduct, onViewAdjustment }: { row: InventoryActivityRecord; onOpenProduct: (productId: string) => void; onViewAdjustment: (id: string) => void }) {
  return (
    <tr className="border-b border-inventory-divider transition-colors duration-150 last:border-0 hover:bg-inventory-surface-hover">
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{formatDate(row.createdAt)}</td>
      <td className="max-w-[240px] px-2 py-1.5">
        <button
          type="button"
          onClick={() => onOpenProduct(row.supplierProductId)}
          title={`Open ${row.productName} in Variants`}
          className="block max-w-full truncate text-left font-medium text-inventory-secondary underline-offset-2 hover:underline cursor-pointer"
        >
          {row.productName}
        </button>
        <span className="mt-[2px] block truncate text-[9.5px] text-inventory-text-subtle">{row.itemNo}</span>
      </td>
      <td className="px-2 py-1.5">
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-inventory-border bg-inventory-surface-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-inventory-text-muted">
          {activityTypeLabel(row.type)}
        </span>
      </td>
      <td className="px-2 py-1.5 leading-snug text-inventory-text">{row.message}</td>
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{row.actorName}</td>
      <td className="px-2 py-1.5 text-right">
        {row.adjustmentBatchId && (
          <button type="button" onClick={() => onViewAdjustment(row.adjustmentBatchId!)} aria-label={`View adjustment for ${row.productName}`} className={VIEW_BTN}>
            View
          </button>
        )}
      </td>
    </tr>
  );
}
