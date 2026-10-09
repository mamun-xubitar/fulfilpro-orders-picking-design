import { formatAdjustmentNumber } from '@/lib/inventory/adjustment-number';
import type { AdjustmentBatchRecord, StockAdjustmentReasonValue } from './types';

export const REASON_LABELS: Record<StockAdjustmentReasonValue, string> = {
  DAMAGED: 'Damaged',
  LOST: 'Lost',
  FOUND: 'Found',
  RETURN: 'Return',
  CORRECTION: 'Correction',
  OTHER: 'Other',
};

export const VIEW_BTN =
  'h-[20px] rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[9px] font-bold text-inventory-text-muted transition-colors duration-150 hover:bg-inventory-surface-hover cursor-pointer';

/** "ADJ-0007", with the stocktake's reference underneath when a sync produced it. */
export function AdjustmentNumber({ adjustment }: { adjustment: Pick<AdjustmentBatchRecord, 'number' | 'source' | 'reference'> }) {
  return (
    <>
      <span className="font-medium text-inventory-text">{formatAdjustmentNumber(adjustment.number)}</span>
      {adjustment.source === 'STOCKTAKE' && <span className="mt-[2px] block text-[9.5px] text-inventory-text-subtle">Stocktake {adjustment.reference}</span>}
    </>
  );
}

/** A signed quantity change — green for stock in, red for stock out. */
export function NetQty({ value }: { value: number }) {
  return (
    <span className={`font-semibold tabular-nums ${value > 0 ? 'text-inventory-success-hover' : value < 0 ? 'text-inventory-danger' : 'text-inventory-text-muted'}`}>
      {value > 0 ? '+' : ''}
      {value}
    </span>
  );
}

export function ReasonBadge({ reason }: { reason: AdjustmentBatchRecord['reason'] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-inventory-border bg-inventory-surface-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-inventory-text-muted">
      {reason === 'MIXED' ? 'Mixed' : (REASON_LABELS[reason] ?? reason)}
    </span>
  );
}
