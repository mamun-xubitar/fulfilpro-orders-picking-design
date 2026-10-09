'use client';

import { AdjustmentNumber, NetQty, ReasonBadge, VIEW_BTN } from './AdjustmentBits';
import SortableTh from './SortableTh';
import { SkeletonRows, type SkeletonCell } from './Skeleton';
import type { AdjustmentsSortKey, AdjustmentsTabState } from './hooks/useAdjustmentsTab';
import type { AdjustmentBatchRecord } from './types';
import { formatDate } from './utils';

const COLUMN_COUNT = 8;
const SKELETON: SkeletonCell[] = ['text', 'text', 'stack', 'num', 'num', 'badge', 'text', { kind: 'actions', count: 1 }];

type AdjustmentsTableProps = { tab: AdjustmentsTabState; onOpenProduct: (productId: string) => void; onView: (id: string) => void };

export default function AdjustmentsTable({ tab, onOpenProduct, onView }: AdjustmentsTableProps) {
  const th = (label: string, sortKey?: AdjustmentsSortKey, align?: 'left' | 'right' | 'center') => (
    <SortableTh label={label} sortKey={sortKey} align={align} sort={tab.sort} dir={tab.dir} onSortChange={tab.changeSort} />
  );

  return (
    <div className="overflow-x-auto thin-scroll">
      <table aria-busy={tab.loading || tab.initialLoading} className="w-full min-w-[900px] border-collapse text-[11px] leading-none">
        <thead>
          <tr className="border-b border-inventory-border bg-inventory-surface-muted">
            {th('Adjustment', 'number')}
            {th('Date', 'createdAt')}
            {th('Product', 'productName')}
            {th('Variants', 'lineCount', 'right')}
            {th('Net change', undefined, 'right')}
            {th('Reason')}
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
                {tab.hasFilters ? 'No adjustments match these filters.' : 'No adjustments recorded yet — make one from a product’s Variant tab.'}
              </td>
            </tr>
          ) : (
            tab.rows.map((row) => <AdjustmentRow key={row.id} row={row} onOpenProduct={onOpenProduct} onView={onView} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function AdjustmentRow({ row, onOpenProduct, onView }: { row: AdjustmentBatchRecord; onOpenProduct: (productId: string) => void; onView: (id: string) => void }) {
  return (
    <tr className="border-b border-inventory-divider transition-colors duration-150 last:border-0 hover:bg-inventory-surface-hover">
      <td className="whitespace-nowrap px-2 py-1.5">
        <AdjustmentNumber adjustment={row} />
      </td>
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
      <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">{row.lineCount}</td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right">
        <NetQty value={row.netQty} />
      </td>
      <td className="px-2 py-1.5">
        <ReasonBadge reason={row.reason} />
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">{row.actorName}</td>
      <td className="px-2 py-1.5 text-right">
        <button type="button" onClick={() => onView(row.id)} aria-label={`View ${row.productName} adjustment`} className={VIEW_BTN}>
          View
        </button>
      </td>
    </tr>
  );
}
