'use client';

import MainImagePanel from './MainImagePanel';
import OnlineStoresPanel from './OnlineStoresPanel';
import PricingMarginPanel from './PricingMarginPanel';
import ProductFieldsPanel from './ProductFieldsPanel';
import StockSummaryPanel from './StockSummaryPanel';
import type { InventoryPage } from './hooks/useInventoryPage';

/**
 * Item 7's five-column row: Main image alone, then Product details / Pricing & margin / Stock
 * summary (moved here, beside Pricing, from below Main image) / Online stores. `minmax(0, …)`
 * lets each panel shrink below its content width instead of pushing the page into horizontal
 * scroll; the narrower Stock summary and Online stores columns free up width for Product details
 * and Pricing. Below 1536px the row wraps rather than squeezing every panel past legibility.
 */
export default function ProductDetailsTab({ p }: { p: InventoryPage }) {
  return (
    <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:grid-cols-[150px_minmax(0,1.6fr)_minmax(0,1.15fr)_170px_200px] xl:flex-none">
      <MainImagePanel gallery={p.gallery} productName={p.product?.name ?? ''} onEditImages={p.openEditImages} />
      <ProductFieldsPanel
        details={p.details}
        supplierOptions={p.supplierOptions}
        optionLibrary={p.optionLibrary}
        locationOptions={p.locations.options}
        inventoryCategories={p.inventoryCategories}
        suppliers={p.suppliers}
        product={p.product}
        onOptionsApplied={p.onVariantSaved}
      />
      <PricingMarginPanel
        pricing={p.pricing}
        storeListings={p.storeListings}
        onEditStorePrice={p.setStorePriceTarget}
        purchaseOrders={p.po.purchaseOrders}
        onReceive={p.po.openReceive}
      />
      <StockSummaryPanel summary={p.summary} variantCount={p.product?.variants.length ?? 0} />
      <OnlineStoresPanel
        storeListings={p.storeListings}
        selectedStoreIds={p.storePublish.selectedStoreIds}
        onToggleStore={p.storePublish.toggleStore}
        onToggleAll={p.storePublish.toggleAllStores}
        onOpenPublish={() => p.storePublish.openPublish()}
        onOpenBulkUpdate={p.storePublish.openBulkUpdate}
        onConnect={p.storePublish.openPublish}
        product={p.product}
      />
    </div>
  );
}
