'use client';

import { ModalShell } from '@/components/ModalShell';
import { variantTitle } from './utils';
import type { useStocktake } from './hooks/useStocktake';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_FINISH, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';

export default function StocktakeModal({ stocktake }: { stocktake: ReturnType<typeof useStocktake> }) {
  const active = stocktake.active;
  if (!active) return null;

  return (
    <ModalShell disableBackdropClose
      title="Stocktake"
      compact
      onClose={stocktake.close}
      wide
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={stocktake.close}
            className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={stocktake.complete}
            disabled={stocktake.completing}
            className={`flex-1 ${WIZARD_BTN_FINISH}`}
          >
            {stocktake.completing && SPINNER}
            {stocktake.completing ? 'Saving...' : 'Complete stocktake'}
          </button>
        </div>
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        <p className="mb-2 text-[12px] text-inventory-text-muted">Enter the counted quantity for each variant. Stock on hand is updated to match your count.</p>
        <div className="max-h-96 overflow-y-auto rounded-lg border border-inventory-border">
          <table className="w-full border-collapse text-[11px] leading-none">
            <thead>
              <tr className="border-b border-inventory-border bg-inventory-surface-muted text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                <th className="px-2 py-1">Colour / Size</th>
                <th className="px-2 py-1">SKU</th>
                <th className="px-2 py-1 text-right">Expected</th>
                <th className="px-2 py-1 text-right">Counted</th>
              </tr>
            </thead>
            <tbody>
              {active.items.map((item) => (
                <tr key={item.id} className="border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover">
                  <td className="px-2 py-1 text-inventory-text">{variantTitle(item)}</td>
                  <td className="px-2 py-1 text-inventory-text-subtle">{item.sku ?? '—'}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-inventory-text-subtle">{item.expectedQty}</td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      value={stocktake.counts[item.id] ?? ''}
                      onChange={(e) => stocktake.setCount(item.id, e.target.value)}
                      className="h-[22px] w-20 rounded-[7px] border border-inventory-border-strong px-[6px] text-right text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModalShell>
  );
}
