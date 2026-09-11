'use client';

import { PanelHeading } from './MainImagePanel';
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
    <section className="flex min-w-0 flex-col rounded-[10px] border border-gray-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] xl:flex-none xl:min-h-0">
      <PanelHeading
        icon={<Cube className="h-3 w-3" />}
        title="Stock summary"
        meta={`${variantCount} variant${variantCount === 1 ? '' : 's'}`}
      />

      <div className="flex flex-1 flex-col gap-[4px] p-[6px]">
        <dl>
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 border-b border-gray-100 py-[4px] leading-none last:border-0">
              <dt className="text-[11px] font-medium text-gray-600">{row.label}</dt>
              <dd
                className={`text-[11px] tabular-nums ${
                  row.emphasis === 'muted' ? 'font-semibold text-gray-500' : row.emphasis === 'blue' ? 'font-bold text-blue-700' : 'font-bold text-gray-900'
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-between rounded-[9px] border border-emerald-100 bg-emerald-50 px-[9px] py-[6px]">
          <span className="text-[9.5px] font-bold uppercase leading-none tracking-[0.4px] text-emerald-700">Stock value</span>
          <span className="text-[14px] font-bold leading-none text-emerald-800 tabular-nums">{formatCurrencyValue(summary.stockValue)}</span>
        </div>
      </div>
    </section>
  );
}
