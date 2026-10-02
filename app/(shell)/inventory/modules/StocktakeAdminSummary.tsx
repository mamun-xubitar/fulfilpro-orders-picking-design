'use client';

import { variantTitle } from './utils';
import type { VariantTally } from './hooks/useStocktakeDetail';

/** Admin only: what was counted against what the system holds, per variant. */
export default function StocktakeAdminSummary({ tallies }: { tallies: VariantTally[] }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Count vs system</p>
      <div className="max-h-56 overflow-y-auto thin-scroll rounded-lg border border-inventory-border">
        <table className="w-full border-collapse text-[11px] leading-none">
          <thead>
            <tr className="border-b border-inventory-border bg-inventory-surface-muted text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
              <th className="px-2 py-1">Colour / Size</th>
              <th className="px-2 py-1 text-right">At creation</th>
              <th className="px-2 py-1 text-right">System now</th>
              <th className="px-2 py-1 text-right">Counted</th>
              <th className="px-2 py-1 text-right">Diff</th>
              <th className="px-2 py-1" />
            </tr>
          </thead>
          <tbody>
            {tallies.map((t) => {
              const diff = t.counted === null ? null : t.counted - t.system;
              return (
                <tr key={t.variantId} className="border-b border-inventory-divider last:border-0">
                  <td className="px-2 py-1 text-inventory-text">{variantTitle(t.items[0])}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{t.expected}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text-muted">{t.system}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text">{t.counted ?? '—'}</td>
                  <td className={`px-2 py-1 text-right font-semibold tabular-nums ${diff === null || diff === 0 ? 'text-inventory-text-subtle' : diff > 0 ? 'text-inventory-success-hover' : 'text-inventory-danger-hover'}`}>
                    {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                  </td>
                  <td className="px-2 py-1 text-right">
                    {t.partial && (
                      <span
                        title={t.counted === null ? 'Some lines are not counted yet' : 'A location of this variant is not on this stocktake'}
                        className="inline-flex items-center whitespace-nowrap rounded-full border border-inventory-warning/30 bg-inventory-warning/10 px-[5px] py-[1px] text-[8px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-warning-ink"
                      >
                        Partial — won&apos;t sync
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
