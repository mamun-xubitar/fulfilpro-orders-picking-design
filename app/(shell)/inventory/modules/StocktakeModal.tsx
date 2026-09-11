'use client';

import { ModalShell } from '@/components/ModalShell';
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
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stocktake.close}
            className="h-[22px] flex-1 rounded-[6px] border border-gray-300 bg-white px-[6px] text-[10px] font-bold leading-none text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={stocktake.complete}
            disabled={stocktake.completing}
            className="h-[22px] flex-1 rounded-[6px] bg-blue-600 px-[6px] text-[10px] font-bold leading-none text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {stocktake.completing ? 'Saving...' : 'Complete stocktake'}
          </button>
        </div>
      }
    >
      <p className="mb-2 text-[12px] text-gray-600">Enter the counted quantity for each variant. Stock on hand is updated to match your count.</p>
      <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-[11px] leading-none">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-gray-500">
              <th className="px-2 py-1">Colour / Size</th>
              <th className="px-2 py-1">SKU</th>
              <th className="px-2 py-1 text-right">Expected</th>
              <th className="px-2 py-1 text-right">Counted</th>
            </tr>
          </thead>
          <tbody>
            {active.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-0">
                <td className="px-2 py-1 text-gray-800">{variantTitle(item)}</td>
                <td className="px-2 py-1 text-gray-500">{item.sku ?? '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums text-gray-500">{item.expectedQty}</td>
                <td className="px-2 py-1 text-right">
                  <input
                    type="number"
                    min={0}
                    value={stocktake.counts[item.id] ?? ''}
                    onChange={(e) => stocktake.setCount(item.id, e.target.value)}
                    className="h-[22px] w-20 rounded-[6px] border border-gray-300 px-[6px] text-right text-[11px] leading-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
