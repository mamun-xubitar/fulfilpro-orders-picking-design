'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import { panelBorderClass } from './MainImagePanel';
import VariantColourPanel from './VariantColourPanel';
import VariantsMatrixTable from './VariantsMatrixTable';
import VariantsMatrixToolbar from './VariantsMatrixToolbar';
import type { InventoryPage } from './hooks/useInventoryPage';
import { formatNumber, variantTitle } from './utils';

type VariantsMatrixSectionProps = {
  p: InventoryPage;
  /** Rendered inside the "Full view" full-screen modal — fills the available height instead of
   * the normal inline card, and flips the toolbar's expand button into an exit action. */
  fullView?: boolean;
};

/** The toolbar + colour panel + table trio, extracted so it can be rendered either inline (the
 * normal product view) or inside the full-screen "Full view" modal — see InventoryModals. The
 * colour panel and table sit in one flex row so the panel is always exactly as tall as the table
 * beside it, in both placements. */
export default function VariantsMatrixSection({ p, fullView }: VariantsMatrixSectionProps) {
  const { variantOptions } = p;
  const removed = variantOptions.pending?.removed ?? [];

  return (
    <section className={fullView ? 'flex h-full min-h-0 flex-col' : `rounded-xl border ${panelBorderClass('variants')} bg-inventory-surface shadow-sm`}>
      <VariantsMatrixToolbar p={p} fullView={fullView} />
      <div className={`flex ${fullView ? 'min-h-0 flex-1' : 'min-h-[10rem]'}`}>
        <div className="relative w-[170px] shrink-0 border-r border-inventory-border">
          <div className="absolute inset-0">
            <VariantColourPanel colour={variantOptions.colour} saving={variantOptions.saving} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <VariantsMatrixTable matrix={p.matrix} fillHeight={fullView} showAllColumns={!!fullView} />
        </div>
      </div>

      {variantOptions.pending && (
        <ModalShell
          disableBackdropClose
          elevated
          compact
          title="Remove variants with stock?"
          onClose={variantOptions.cancelPending}
          footer={
            <ModalActions
              onCancel={variantOptions.cancelPending}
              onConfirm={variantOptions.confirmPending}
              confirmLabel={variantOptions.saving ? 'Removing…' : 'Remove'}
              disabled={variantOptions.saving}
              danger
              compact
            />
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            This removes <span className="font-semibold text-inventory-text">{removed.length}</span> variant{removed.length === 1 ? '' : 's'} that still carry
            stock, an allocation or incoming stock — along with their stocktake, adjustment and store-listing history.
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto thin-scroll text-[11px] text-inventory-text-muted">
            {removed.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-2 border-b border-inventory-border py-1 last:border-0">
                <span className="truncate font-medium text-inventory-text">{variantTitle(v)}</span>
                <span className="whitespace-nowrap tabular-nums">
                  {formatNumber(v.stockOnHand)} on hand
                  {v.allocated > 0 ? ` · ${formatNumber(v.allocated)} allocated` : ''}
                  {v.incoming > 0 ? ` · ${formatNumber(v.incoming)} incoming` : ''}
                </span>
              </li>
            ))}
          </ul>
        </ModalShell>
      )}
    </section>
  );
}
