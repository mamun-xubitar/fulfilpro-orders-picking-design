'use client';

import MainImagePanel from './MainImagePanel';
import OnlineStoresPanel from './OnlineStoresPanel';
import PricingMarginPanel from './PricingMarginPanel';
import ProductFieldsPanel from './ProductFieldsPanel';
import StockSummaryPanel from './StockSummaryPanel';
import type { InventoryPage } from './hooks/useInventoryPage';

/**
 * Design 6's four-column row: a narrow first column stacks Main image above Stock summary, then
 * three wider columns for Product details / Pricing & margin / Online stores. `minmax(0, …)` lets
 * each panel shrink below its content width instead of pushing the page into horizontal scroll.
 * Below 1536px the row wraps rather than squeezing every panel past legibility.
 */
export default function ProductDetailsTab({ p }: { p: InventoryPage }) {
  return (
    <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:grid-cols-[180px_minmax(0,2fr)_minmax(0,1.3fr)_206px] xl:flex-1 xl:min-h-0">
      <div className="flex min-w-0 flex-col gap-[5px] xl:min-h-0">
        <MainImagePanel gallery={p.gallery} productName={p.product?.name ?? ''} onEditImages={p.openEditImages} />
        <StockSummaryPanel summary={p.summary} variantCount={p.product?.variants.length ?? 0} />
      </div>
      <ProductFieldsPanel details={p.details} supplierOptions={p.supplierOptions} presets={p.presets} suppliers={p.suppliers} />
      <PricingMarginPanel
        pricing={p.pricing}
        storeListings={p.storeListings}
        onEditStorePrice={p.setStorePriceTarget}
        purchaseOrders={p.po.purchaseOrders}
        onReceive={p.po.openReceive}
      />
      <OnlineStoresPanel
        storeListings={p.storeListings}
        selectedStoreIds={p.storePublish.selectedStoreIds}
        onToggleStore={p.storePublish.toggleStore}
        onToggleAll={p.storePublish.toggleAllStores}
        onOpenPublish={() => p.storePublish.openPublish()}
        onOpenBulkUpdate={p.storePublish.openBulkUpdate}
      />
    </div>
  );
}
