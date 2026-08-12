'use client';

import MainImagePanel from './MainImagePanel';
import OnlineStoresPanel from './OnlineStoresPanel';
import PricingMarginPanel from './PricingMarginPanel';
import ProductFieldsPanel from './ProductFieldsPanel';
import StockSummaryPanel from './StockSummaryPanel';
import type { InventoryDevPage } from './hooks/useInventoryDevPage';
import type { ProductRecord } from './types';

/**
 * The five-panel row. Columns are proportional rather than fixed — with the
 * sidebar expanded there is only ~1300px of content width at 1600px viewport,
 * which fixed rem columns would overflow. `minmax(0, …)` lets each panel shrink
 * below its content width instead of pushing the page into horizontal scroll.
 * Below 1536px the row wraps rather than squeezing every panel past legibility.
 */
export default function ProductDetailsTab({ p, product }: { p: InventoryDevPage; product: ProductRecord }) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_minmax(0,1fr)]">
      <MainImagePanel gallery={p.gallery} onEditImages={p.openEditImages} />
      <ProductFieldsPanel product={product} />
      <PricingMarginPanel {...p.pricing} />
      <StockSummaryPanel summary={p.summary} />
      <OnlineStoresPanel
        stores={product.stores}
        baseCurrency={p.globals.baseCurrency}
        onEditPrice={p.setStorePriceTarget}
        onAction={p.notImplemented}
      />
    </div>
  );
}
