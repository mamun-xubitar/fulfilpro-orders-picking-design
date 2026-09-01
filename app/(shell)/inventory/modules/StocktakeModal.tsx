'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import { variantTitle } from './utils';
import type { useStocktake } from './hooks/useStocktake';

export default function StocktakeModal({ stocktake }: { stocktake: ReturnType<typeof useStocktake> }) {
  const active = stocktake.active;
  if (!active) return null;

  return (
    <ModalShell
      title="Stocktake"
      onClose={stocktake.close}
      wide
      footer={<ModalActions onCancel={stocktake.close} onConfirm={stocktake.complete} confirmLabel={stocktake.completing ? 'Saving...' : 'Complete stocktake'} disabled={stocktake.completing} />}
    >
      <p className="mb-3 text-sm text-gray-600">Enter the counted quantity for each variant. Stock on hand is updated to match your count.</p>
      <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2">Colour / Size</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2 text-right">Expected</th>
              <th className="px-3 py-2 text-right">Counted</th>
            </tr>
          </thead>
          <tbody>
            {active.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-gray-800">{variantTitle(item)}</td>
                <td className="px-3 py-2 text-gray-500">{item.sku ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums text-gray-500">{item.expectedQty}</td>
                <td className="px-3 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    value={stocktake.counts[item.id] ?? ''}
                    onChange={(e) => stocktake.setCount(item.id, e.target.value)}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}
