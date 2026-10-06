'use client';

import { formatStocktakeNumber } from '@/lib/inventory/stocktake-number';
import { useInventoryAccess } from './InventoryAccess';
import SortableTh from './SortableTh';
import { SkeletonRows, type SkeletonCell } from './Skeleton';
import type { StocktakeDetailState } from './hooks/useStocktakeDetail';
import type { StocktakeSortKey, StocktakesTabState } from './hooks/useStocktakesTab';
import type { StocktakeRecord, StocktakeStatusValue } from './types';
import { formatDate } from './utils';

export const STOCKTAKE_STATUS_LABELS: Record<StocktakeStatusValue, string> = {
  OPEN: 'Not counted',
  COUNTED: 'Counted',
  COMPLETED: 'Synced',
  CANCELLED: 'Cancelled',
};

const STATUS_BADGES: Record<StocktakeStatusValue, string> = {
  OPEN: 'bg-inventory-warning/10 text-inventory-warning-ink border-inventory-warning/30',
  COUNTED: 'bg-inventory-primary/10 text-inventory-primary border-inventory-primary/30',
  COMPLETED: 'bg-inventory-success/10 text-inventory-success-hover border-inventory-success/30',
  CANCELLED: 'bg-inventory-danger/10 text-inventory-danger-hover border-inventory-danger/30',
};

const COLUMN_COUNT = 8;
const SKELETON: SkeletonCell[] = ['text', 'stack', 'num', 'badge', 'text', 'text', 'text', { kind: 'actions', count: 2 }];
const ACTION_BTN =
  'h-[20px] rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[9px] font-bold text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer';

type StocktakesTableProps = { tab: StocktakesTabState; detail: StocktakeDetailState };

export default function StocktakesTable({ tab, detail }: StocktakesTableProps) {
  const th = (label: string, sortKey?: StocktakeSortKey, align?: 'left' | 'right' | 'center') => (
    <SortableTh label={label} sortKey={sortKey} align={align} sort={tab.sort} dir={tab.dir} onSortChange={tab.changeSort} />
  );

  return (
    <div className="overflow-x-auto thin-scroll">
      <table aria-busy={tab.loading || tab.initialLoading} className="w-full min-w-[900px] border-collapse text-[11px] leading-none">
        <thead>
          <tr className="border-b border-inventory-border bg-inventory-surface-muted">
            {th('Stocktake', 'number')}
            {th('Product', 'productName')}
            {th('Counted', undefined, 'right')}
            {th('Status', 'status', 'center')}
            {th('Created', 'createdAt')}
            {th('Counted by', 'countedAt')}
            {th('Synced', 'completedAt')}
            {th('Actions', undefined, 'right')}
          </tr>
        </thead>
        <tbody>
          {tab.showSkeleton ? (
            <SkeletonRows rows={tab.rows.length || 8} cells={SKELETON} />
          ) : tab.rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-2 py-10 text-center text-[11px] text-inventory-text-subtle">
                {tab.hasFilters ? 'No stocktakes match these filters.' : 'No stocktakes yet — start one from a product’s Variant tab.'}
              </td>
            </tr>
          ) : (
            tab.rows.map((row) => <StocktakeRow key={row.id} row={row} tab={tab} detail={detail} />)
          )}
        </tbody>
      </table>
    </div>
  );
}

function StocktakeRow({ row, tab, detail }: { row: StocktakeRecord } & StocktakesTableProps) {
  const open = row.status === 'OPEN' || row.status === 'COUNTED';
  const { canCount } = useInventoryAccess();
  const number = formatStocktakeNumber(row.number);

  return (
    <tr className="border-b border-inventory-divider transition-colors duration-150 last:border-0 hover:bg-inventory-surface-hover">
      <td className="whitespace-nowrap px-2 py-1.5 font-medium text-inventory-text">{number}</td>
      <td className="max-w-[220px] px-2 py-1.5">
        <span className="block truncate text-inventory-text" title={row.productName}>
          {row.productName}
        </span>
        <span className="mt-[2px] block truncate text-[9.5px] text-inventory-text-subtle">{row.itemNo}</span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-inventory-text-muted">
        {row.countedCount} / {row.itemCount}
      </td>
      <td className="px-2 py-1.5 text-center">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${STATUS_BADGES[row.status]}`}>
          {row.status === 'OPEN' && row.countedCount > 0 ? 'Partly counted' : STOCKTAKE_STATUS_LABELS[row.status]}
        </span>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">
        {formatDate(row.createdAt)}
        <span className="block pt-[3px] text-[9.5px]">{row.startedByName}</span>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">
        {row.countedAt ? (
          <>
            {formatDate(row.countedAt)}
            <span className="block pt-[3px] text-[9.5px]">{row.countedByName}</span>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-inventory-text-subtle">
        {row.status === 'COMPLETED' ? (
          <>
            {formatDate(row.completedAt)}
            <span className="block pt-[3px] text-[9.5px]">{row.syncedByName}</span>
          </>
        ) : (
          '—'
        )}
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-[4px]">
          <button type="button" onClick={() => detail.openStocktake(row.id)} className={ACTION_BTN}>
            {row.status === 'COUNTED' ? 'View count' : open && canCount ? 'Count' : 'View'}
          </button>
          <button type="button" onClick={() => tab.print(row)} aria-label={`Print ${number}`} className={ACTION_BTN}>
            Print
          </button>
          {tab.isAdmin && row.status === 'COUNTED' && (
            <button type="button" onClick={() => detail.openStocktake(row.id)} className="h-[20px] rounded-[6px] bg-inventory-success px-[6px] text-[9px] font-bold text-white transition-colors duration-150 hover:bg-inventory-success-hover cursor-pointer">
              Sync
            </button>
          )}
          {tab.isAdmin && open && (
            <button type="button" onClick={() => detail.askCancel(row)} className="h-[20px] rounded-[6px] px-[6px] text-[9px] font-bold text-inventory-danger-hover hover:bg-inventory-danger/10 cursor-pointer">
              Cancel
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
