'use client';

import ColumnFillInput from './ColumnFillInput';
import type { VariantRow } from './types';
import { formatCurrencyValue, variantTitle } from './utils';

/** Wide Create PO modal (max-w-5xl): the Variants column is capped at 14rem so it can't
 * swallow the row — any spare width flows to the Supplier SKU input instead. Narrow New
 * Product wizard (max-w-2xl): the fixed columns shrink so the flexible Variants column keeps
 * room for the full "Colour / Size" name. */
const GRID_COLS_COMFORTABLE = 'grid-cols-[minmax(11rem,14rem)_4.5rem_minmax(7rem,1fr)_5rem_6rem_6.5rem]';
const GRID_COLS_COMPACT = 'grid-cols-[minmax(0,1fr)_3.5rem_7rem_4.5rem_5rem_5.5rem]';

type PoItemsTableProps = {
  rows: VariantRow[];
  quantities: Record<string, string>;
  skus: Record<string, string>;
  costs: Record<string, string>;
  onQuantityChange: (variantId: string, value: string) => void;
  onSkuChange: (variantId: string, value: string) => void;
  onCostChange: (variantId: string, value: string) => void;
  /** Sets every row's quantity at once (item 8) — the Qty header's fill input. */
  onFillQuantities: (value: number) => void;
  /** Tightens the fixed columns for narrow hosts (New Product wizard). Defaults to the
   * comfortable density for the wide Create PO modal. */
  compact?: boolean;
};

export default function PoItemsTable({ rows, quantities, skus, costs, onQuantityChange, onSkuChange, onCostChange, onFillQuantities, compact }: PoItemsTableProps) {
  const GRID_COLS = compact ? GRID_COLS_COMPACT : GRID_COLS_COMFORTABLE;
  const totalQty = rows.reduce((sum, v) => sum + (Number(quantities[v.id]) || 0), 0);
  const grandTotal = rows.reduce((sum, v) => sum + (Number(quantities[v.id]) || 0) * (Number(costs[v.id]) || 0), 0);

  return (
    <div className="overflow-x-auto thin-scroll rounded-lg border border-inventory-border">
      <div className={`grid ${GRID_COLS} items-center gap-[6px] border-b border-inventory-border bg-inventory-surface-muted px-2 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle`}>
        <span className="flex min-h-[16px] items-center">Variants</span>
        <span className="flex min-h-[16px] items-center justify-end text-right">Stock</span>
        <span className="flex min-h-[16px] items-center justify-end text-right">Supplier SKU</span>
        <span className="flex flex-col items-end gap-[3px]">
          <span>Qty</span>
          <span className="w-full min-w-0">
            <ColumnFillInput label="Qty" rowCount={rows.length} onApply={onFillQuantities} />
          </span>
        </span>
        <span className="flex min-h-[16px] items-center justify-end text-right">Cost (AUD)</span>
        <span className="flex min-h-[16px] items-center justify-end text-right">Total (AUD)</span>
      </div>
      <div className="divide-y divide-inventory-border">
        {rows.map((v) => {
          const name = variantTitle(v);
          const qty = Number(quantities[v.id]) || 0;
          const cost = Number(costs[v.id]) || 0;
          return (
            <div key={v.id} className={`grid ${GRID_COLS} items-center gap-[6px] px-2 py-1 text-[11px] leading-none transition-colors duration-150 hover:bg-inventory-surface-hover`}>
              <span title={name} className="min-w-0 truncate whitespace-nowrap text-inventory-text-muted">{name}</span>
              <span className="text-right tabular-nums text-inventory-text-subtle">{v.stockOnHand}</span>
              <input
                type="text"
                value={skus[v.id] ?? ''}
                onChange={(e) => onSkuChange(v.id, e.target.value)}
                aria-label={`Supplier SKU for ${name}`}
                className="h-[22px] w-full rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] uppercase leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
              />
              <input
                type="number"
                min={0}
                value={quantities[v.id] ?? ''}
                onChange={(e) => onQuantityChange(v.id, e.target.value)}
                aria-label={`Quantity for ${name}`}
                className="h-[22px] w-full rounded-[6px] border border-inventory-border-strong pl-[6px] pr-[10px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
              />
              <div className="relative w-full min-w-0">
                <span className="pointer-events-none absolute inset-y-0 left-[6px] flex items-center text-[11px] text-inventory-text-subtle">$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={costs[v.id] ?? ''}
                  onChange={(e) => onCostChange(v.id, e.target.value)}
                  aria-label={`Cost for ${name}`}
                  title="Defaults to the product's buying price (converted to AUD)"
                  className="h-[22px] w-full rounded-[6px] border border-inventory-border-strong pl-[14px] pr-[10px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                />
              </div>
              <span className="text-right font-medium tabular-nums text-inventory-text-muted">{formatCurrencyValue(qty * cost)}</span>
            </div>
          );
        })}
      </div>
      <div className={`grid ${GRID_COLS} gap-[6px] border-t-2 border-inventory-border bg-inventory-surface-muted px-2 py-1 text-[11px] font-semibold leading-none text-inventory-text`}>
        <span>Total</span>
        <span />
        <span />
        <span className="text-right tabular-nums">{totalQty}</span>
        <span />
        <span className="text-right tabular-nums">{formatCurrencyValue(grandTotal)}</span>
      </div>
    </div>
  );
}
