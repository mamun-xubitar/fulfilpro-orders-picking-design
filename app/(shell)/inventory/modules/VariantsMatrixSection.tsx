'use client';

import VariantsMatrixTable from './VariantsMatrixTable';
import VariantsMatrixToolbar from './VariantsMatrixToolbar';
import type { InventoryPage } from './hooks/useInventoryPage';

type VariantsMatrixSectionProps = {
  p: InventoryPage;
  /** Rendered inside the "Full view" full-screen modal — fills the available height instead of
   * the normal inline card, and flips the toolbar's expand button into an exit action. */
  fullView?: boolean;
};

/** The toolbar + table pair, extracted so it can be rendered either inline (the normal product
 * view) or inside the full-screen "Full view" modal — see InventoryModals. */
export default function VariantsMatrixSection({ p, fullView }: VariantsMatrixSectionProps) {
  return (
    <section className={fullView ? 'flex h-full min-h-0 flex-col' : 'rounded-xl border border-gray-200 bg-white shadow-sm'}>
      <VariantsMatrixToolbar p={p} fullView={fullView} />
      <div className={fullView ? 'min-h-0 flex-1' : undefined}>
        <VariantsMatrixTable matrix={p.matrix} fillHeight={fullView} showAllColumns={!!fullView} />
      </div>
    </section>
  );
}
