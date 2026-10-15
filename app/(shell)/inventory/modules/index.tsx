'use client';

import { usePageHeading } from '@/components/PageHeadingContext';
import Pagination from '@/components/Pagination';
import { useZoom } from '@/components/ZoomContext';
import { useEffect } from 'react';
import AdjustmentsTab from './AdjustmentsTab';
import BottomPanels from './BottomPanels';
import ComingSoon from './ComingSoon';
import { InventoryAccessProvider, useInventoryAccess } from './InventoryAccess';
import HistoryTab from './HistoryTab';
import InventoryGlobals from './InventoryGlobals';
import InventoryModals from './InventoryModals';
import LocationsTab from './LocationsTab';
import PaymentsTab from './PaymentsTab';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import PurchaseRecommendTab from './PurchaseRecommendTab';
import ModuleTabs from './ModuleTabs';
import ProductDetailsTab from './ProductDetailsTab';
import ProductPageSkeleton from './ProductPageSkeleton';
import ProductsBulkModals from './ProductsBulkModals';
import ProductsSelectionBar from './ProductsSelectionBar';
import ProductsTable from './ProductsTable';
import ProductsTableToolbar from './ProductsTableToolbar';
import ProductsToolbar from './ProductsToolbar';
import StocktakesTab from './StocktakesTab';
import SuppliersTab from './SuppliersTab';
import VariantsTab from './VariantsTab';
import VariantsMatrixSection from './VariantsMatrixSection';
import { MODULE_TABS } from './constants';
import { useInventoryPage } from './hooks/useInventoryPage';
import './inventory-theme.css';

export default function InventoryPage() {
  return (
    <InventoryAccessProvider>
      <InventoryPageBody />
    </InventoryAccessProvider>
  );
}

function InventoryPageBody() {
  const p = useInventoryPage();
  const { zoomPercent } = useZoom();
  const moduleTab = MODULE_TABS.find((t) => t.id === p.moduleTab)!;
  const isProductTab = p.moduleTab === 'products' || p.moduleTab === 'variants';
  const { canEdit } = useInventoryAccess();
  // Every bulk action on the selection bar writes, so staff never see it.
  const hasSelection = canEdit && (p.productsTable.selectAllFilters || p.productsTable.selectedIds.length > 0);

  // Contributes the focused product's name to the shell header ("Inventory / <name>") in
  // single-product view only — the all-records table view shows the plain "Inventory" title.
  const { setSuffix } = usePageHeading();
  const productName = !p.nav.allRecords ? (p.product?.name ?? null) : null;
  useEffect(() => {
    setSuffix(productName);
    return () => setSuffix(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName]);

  return (
    <main
      className="inventory-theme flex-1 space-y-2 bg-inventory-bg p-2 xl:flex xl:min-h-0 xl:flex-col xl:space-y-0 xl:overflow-hidden xl:gap-2"
      style={{ zoom: `${zoomPercent}%`, '--page-zoom': zoomPercent / 100 } as React.CSSProperties}
    >
      <ModuleTabs active={p.moduleTab} onChange={p.setModuleTab} right={<InventoryGlobals p={p} />} />

      {/* The product toolbar sits above every tab: it picks which product the Variant / Products
          tabs show, and a pick made from any other tab jumps to the Variant tab. */}
      <ProductsToolbar {...p} />

      {p.nav.allRecords ? (
        <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-inventory xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <ProductsTableToolbar table={p.productsTable} onRefresh={p.productsTable.refresh} loading={p.productsTable.loading} />
          {hasSelection && <ProductsSelectionBar table={p.productsTable} />}
          <ProductsTable table={p.productsTable} loading={p.productsTable.loading} />
          <Pagination
            pagination={p.productsTable.pagination}
            loading={p.productsTable.loading}
            pageNumbers={p.productsTable.pageNumbers}
            onPageChange={p.productsTable.goToPage}
            itemLabel="products"
            pageSizeOptions={p.productsTable.pageSizeOptions}
            onPageSizeChange={p.productsTable.setPageSize}
          />
        </div>
      ) : p.moduleTab === 'suppliers' ? (
        <SuppliersTab suppliers={p.suppliers} onOpenPurchaseOrders={p.openPurchaseOrdersFor} onOpenPayments={p.openPaymentsFor} />
      ) : p.moduleTab === 'purchase-orders' ? (
        <PurchaseOrdersTab tab={p.poTab} suppliers={p.supplierOptions} onReceive={p.po.openReceive} onPay={p.payment.open} onBulkPay={p.openBulkPay} onOpenSupplier={p.openSupplierDetails} onOpenProduct={p.openProductInVariants} />
      ) : p.moduleTab === 'purchase-recommend' ? (
        <PurchaseRecommendTab tab={p.recommendTab} suppliers={p.supplierOptions} onOpenProduct={p.openProductInVariants} onCreatePo={(product, variantIds) => p.po.openCreate(variantIds, product)} />
      ) : p.moduleTab === 'payments' ? (
        <PaymentsTab tab={p.paymentsTab} suppliers={p.supplierOptions} onEdit={p.payment.openById} onOpenSupplier={p.openSupplierDetails} />
      ) : p.moduleTab === 'locations' ? (
        <LocationsTab locations={p.locations} onOpenStoreLocations={p.storeLocations.openModal} />
      ) : p.moduleTab === 'stocktake' ? (
        <StocktakesTab tab={p.stocktakesTab} detail={p.stocktakeDetail} />
      ) : p.moduleTab === 'adjustments' ? (
        <AdjustmentsTab tab={p.adjustmentsTab} onOpenProduct={p.openProductInVariants} onView={p.adjustmentDetail.openAdjustment} />
      ) : p.moduleTab === 'history' ? (
        <HistoryTab tab={p.historyTab} onOpenProduct={p.openProductInVariants} onViewAdjustment={p.adjustmentDetail.openAdjustment} />
      ) : !isProductTab ? (
        <ComingSoon label={moduleTab.label} blurb={moduleTab.blurb} />
      ) : p.showSkeleton ? (
        <ProductPageSkeleton variant={p.moduleTab === 'variants' ? 'variants' : 'products'} />
      ) : !p.product ? (
        <EmptyState />
      ) : p.moduleTab === 'variants' ? (
        <VariantsTab p={p} />
      ) : (
        <div className="space-y-2 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-[2px] thin-scroll">
          <ProductDetailsTab p={p} />
          {!p.matrixFullView && <VariantsMatrixSection p={p} />}
          <BottomPanels p={p} />
        </div>
      )}

      {p.nav.allRecords && <ProductsBulkModals table={p.productsTable} />}
      <InventoryModals {...p} />
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-inventory-border-strong bg-inventory-surface px-6 py-20 text-center">
      <h2 className="text-base font-semibold text-inventory-text">No products match the current filters</h2>
      <p className="mt-1 text-sm text-inventory-text-subtle">Tick &quot;All records&quot; or clear the price shortcut to see the full catalogue.</p>
    </div>
  );
}
