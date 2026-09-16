'use client';

import { PanelHeading, panelBorderClass } from './MainImagePanel';
import { Cube } from './icons';
import type { StockSummary } from './types';
import { formatCurrencyValue, formatNumber } from './utils';

/** Every figure here is folded from the variant rows — nothing is stored. */
export default function StockSummaryPanel({ summary, variantCount }: { summary: StockSummary; variantCount: number }) {
  const rows: { label: string; value: string; emphasis?: 'muted' | 'blue' }[] = [
    { label: 'Total stock', value: formatNumber(summary.totalStock) },
    { label: 'Available stock', value: formatNumber(summary.availableStock) },
    { label: 'Allocated', value: formatNumber(summary.allocated), emphasis: 'muted' },
    { label: 'Incoming', value: formatNumber(summary.incoming), emphasis: 'muted' },
  ];

  return (
    <section className={`flex min-w-0 flex-col rounded-[10px] border ${panelBorderClass('stock')} bg-inventory-surface shadow-inventory xl:flex-none xl:min-h-0`}>
      <PanelHeading
        tone="stock"
        icon={<Cube className="h-3 w-3" />}
        title="Stock summary"
        meta={`${variantCount} variant${variantCount === 1 ? '' : 's'}`}
      />

      <div className="flex flex-1 flex-col gap-[4px] p-[6px]">
        <dl>
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 border-b border-inventory-divider py-[4px] leading-none last:border-0">
              <dt className="text-[11px] font-medium text-inventory-text-muted">{row.label}</dt>
              <dd
                className={`text-[11px] tabular-nums ${
                  row.emphasis === 'muted'
                    ? 'font-semibold text-inventory-text-subtle'
                    : row.emphasis === 'blue'
                      ? 'font-bold text-inventory-secondary'
                      : 'font-bold text-inventory-text'
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-between rounded-[9px] border border-inventory-success/25 bg-inventory-success/10 px-[9px] py-[6px]">
          <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-success-hover">Stock value</span>
          <span className="text-[14px] font-bold leading-none text-inventory-success-hover tabular-nums">{formatCurrencyValue(summary.stockValue)}</span>
        </div>
      </div>
    </section>
  );
}
