'use client';

import { useState } from 'react';

import { panelBorderClass } from './MainImagePanel';
import VariantColourPanel from './VariantColourPanel';
import VariantsMatrixTable from './VariantsMatrixTable';
import VariantsMatrixToolbar from './VariantsMatrixToolbar';
import type { InventoryPage } from './hooks/useInventoryPage';

type VariantsMatrixSectionProps = {
  p: InventoryPage;
  /** Rendered inside the "Full view" full-screen modal — fills the available height instead of
   * the normal inline card, and flips the toolbar's expand button into an exit action. */
  fullView?: boolean;
  /** The Variant tab: every column, and a taller table than the compact inline card. */
  tall?: boolean;
};

/** The toolbar + colour panel + table trio, extracted so it can be rendered either inline (the
 * normal product view) or inside the full-screen "Full view" modal — see InventoryModals. The
 * colour panel and table sit in one flex row so the panel is always exactly as tall as the table
 * beside it, in both placements. */
export default function VariantsMatrixSection({ p, fullView, tall }: VariantsMatrixSectionProps) {
  // The colour panel measures its own content (clamped 100–170px); 170 keeps the prerendered
  // markup identical to the previous fixed-width layout until the first measurement lands.
  const [colourPanelWidth, setColourPanelWidth] = useState(170);
  return (
    <section className={fullView ? 'flex h-full min-h-0 flex-col' : `rounded-xl border ${panelBorderClass('variants')} bg-inventory-surface shadow-sm${tall ? ' xl:flex-none' : ' xl:flex xl:min-h-[15rem] xl:flex-1 xl:flex-col'}`}>
      <VariantsMatrixToolbar p={p} fullView={fullView} />
      <div className={`flex ${fullView ? 'min-h-0 flex-1' : tall ? 'min-h-[14rem]' : 'min-h-[10rem] xl:min-h-0 xl:flex-1'}`}>
        <div className="relative shrink-0 border-r border-inventory-border" style={{ width: colourPanelWidth }}>
          <div className="absolute inset-0">
            <VariantColourPanel colour={p.matrix.colourFilter} onWidthChange={setColourPanelWidth} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <VariantsMatrixTable matrix={p.matrix} locations={p.locations} fillHeight={fullView} showAllColumns={!!fullView || !!tall} tall={tall} />
        </div>
      </div>
    </section>
  );
}
