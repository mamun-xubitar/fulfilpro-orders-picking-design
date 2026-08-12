'use client';

import { PanelHeading } from './MainImagePanel';
import { Cube } from './icons';
import { formatCurrencyValue, formatNumber } from './utils';
import type { StockSummary } from './types';

/** Every figure here is folded from the variant rows — nothing is stored. */
export default function StockSummaryPanel({ summary }: { summary: StockSummary }) {
  const rows: { label: string; value: string; emphasis?: 'muted' | 'blue' }[] = [
    { label: 'Total stock', value: formatNumber(summary.totalStock) },
    { label: 'Available stock', value: formatNumber(summary.availableStock) },
    { label: 'Allocated', value: formatNumber(summary.allocated), emphasis: 'muted' },
    { label: 'Incoming', value: formatNumber(summary.incoming), emphasis: 'muted' },
    { label: 'Forward orders', value: formatNumber(summary.forwardOrders), emphasis: 'muted' },
    { label: 'Suggested order', value: formatNumber(summary.suggestedOrder), emphasis: 'blue' },
  ];

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      <PanelHeading icon={<Cube className="h-4 w-4" />} title="Stock summary" />

      <div className="flex flex-1 flex-col p-4">
        <dl className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2 py-2.5">
              <dt className="text-[13px] font-medium text-gray-600">{row.label}</dt>
              <dd
                className={`text-[13px] tabular-nums ${
                  row.emphasis === 'muted' ? 'font-semibold text-gray-500' : row.emphasis === 'blue' ? 'font-bold text-blue-700' : 'font-bold text-gray-900'
                }`}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-auto flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Stock value</span>
          <span className="text-base font-bold text-emerald-800 tabular-nums">{formatCurrencyValue(summary.stockValue)}</span>
        </div>
      </div>
    </section>
  );
}
