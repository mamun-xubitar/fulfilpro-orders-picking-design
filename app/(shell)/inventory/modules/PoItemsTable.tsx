'use client';

import type { VariantRow } from './types';
import { formatCurrencyValue, variantTitle } from './utils';

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_4.5rem_9rem_5rem_6rem_6.5rem]';

type PoItemsTableProps = {
  rows: VariantRow[];
  quantities: Record<string, string>;
  skus: Record<string, string>;
  costs: Record<string, string>;
  onQuantityChange: (variantId: string, value: string) => void;
  onSkuChange: (variantId: string, value: string) => void;
  onCostChange: (variantId: string, value: string) => void;
};

export default function PoItemsTable({ rows, quantities, skus, costs, onQuantityChange, onSkuChange, onCostChange }: PoItemsTableProps) {
  const totalQty = rows.reduce((sum, v) => sum + (Number(quantities[v.id]) || 0), 0);
  const grandTotal = rows.reduce((sum, v) => sum + (Number(quantities[v.id]) || 0) * (Number(costs[v.id]) || 0), 0);

  return (
    <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
      <div className={`grid ${GRID_COLS} gap-3 border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500`}>
        <span>Variants</span>
        <span className="text-right">Stock</span>
        <span className="text-right">Supplier SKU</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Cost</span>
        <span className="text-right">Total</span>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((v) => {
          const name = variantTitle(v);
          const qty = Number(quantities[v.id]) || 0;
          const cost = Number(costs[v.id]) || 0;
          return (
            <div key={v.id} className={`grid ${GRID_COLS} items-center gap-3 px-3 py-1.5 text-sm`}>
              <span className="min-w-0 truncate text-gray-700">{name}</span>
              <span className="text-right tabular-nums text-gray-500">{v.stockOnHand}</span>
              <input
                type="text"
                value={skus[v.id] ?? ''}
                onChange={(e) => onSkuChange(v.id, e.target.value)}
                aria-label={`Supplier SKU for ${name}`}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="number"
                min={0}
                value={quantities[v.id] ?? ''}
                onChange={(e) => onQuantityChange(v.id, e.target.value)}
                aria-label={`Quantity for ${name}`}
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                value={costs[v.id] ?? ''}
                onChange={(e) => onCostChange(v.id, e.target.value)}
                aria-label={`Cost for ${name}`}
                title="Defaults to the current average buy price"
                className="w-full rounded-lg border border-gray-300 px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-right font-medium tabular-nums text-gray-700">{formatCurrencyValue(qty * cost)}</span>
            </div>
          );
        })}
      </div>
      <div className={`grid ${GRID_COLS} gap-3 border-t-2 border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-900`}>
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
