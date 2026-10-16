'use client';

import BottomPanels from './BottomPanels';
import ProductDetailsTab from './ProductDetailsTab';
import VariantsMatrixSection from './VariantsMatrixSection';
import type { InventoryPage } from './hooks/useInventoryPage';

/** The Variant tab — the same single-product page as the Products tab, with the order flipped: the
 * variants / stock table (every column, searchable) leads, and the product's five detail sections
 * and bottom cards follow beneath it. The whole stack scrolls as one on wide screens, since the
 * table is now the primary surface rather than a strip between the details and the bottom row. */
export default function VariantsTab({ p }: { p: InventoryPage }) {
  return (
    <div className="space-y-2 xl:space-y-0 xl:contents">
      {!p.matrixFullView && <VariantsMatrixSection p={p} tall />}
      <ProductDetailsTab p={p} />
      <BottomPanels p={p} />
    </div>
  );
}
