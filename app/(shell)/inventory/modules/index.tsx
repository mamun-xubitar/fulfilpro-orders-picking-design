'use client';

import { usePageHeading } from '@/components/PageHeadingContext';
import Pagination from '@/components/Pagination';
import { useZoom } from '@/components/ZoomContext';
import { useEffect } from 'react';
import BottomPanels from './BottomPanels';
import ComingSoon from './ComingSoon';
import InventoryGlobals from './InventoryGlobals';
import InventoryModals from './InventoryModals';
import LocationsTab from './LocationsTab';
import PaymentsTab from './PaymentsTab';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import ModuleTabs from './ModuleTabs';
import ProductDetailsTab from './ProductDetailsTab';
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
  const p = useInventoryPage();
  const { zoomPercent } = useZoom();
  const moduleTab = MODULE_TABS.find((t) => t.id === p.moduleTab)!;
  const isProductTab = p.moduleTab === 'products' || p.moduleTab === 'variants';
  const hasSelection = p.productsTable.selectAllFilters || p.productsTable.selectedIds.length > 0;

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
      className="inventory-theme flex-1 space-y-2 bg-inventory-bg p-2 xl:flex xl:h-[calc(100vh-60px)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:overflow-hidden xl:gap-2"
      style={{ zoom: `${zoomPercent}%`, '--page-zoom': zoomPercent / 100 } as React.CSSProperties}
    >
      <ModuleTabs active={p.moduleTab} onChange={p.setModuleTab} right={isProductTab ? <InventoryGlobals p={p} /> : undefined} />

      {/* The product toolbar sits above every tab: it picks which product the Variant / Products
          tabs show, and a pick made from any other tab jumps to the Variant tab. */}
      <ProductsToolbar {...p} />

      {p.nav.allRecords ? (
        <div className="overflow-hidden rounded-xl border border-inventory-border bg-inventory-surface shadow-inventory xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
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
        <PurchaseOrdersTab tab={p.poTab} suppliers={p.supplierOptions} onReceive={p.po.openReceive} onPay={p.payment.open} onOpenSupplier={p.openSupplierDetails} onOpenProduct={p.openProductInVariants} />
      ) : p.moduleTab === 'payments' ? (
        <PaymentsTab tab={p.paymentsTab} suppliers={p.supplierOptions} onEdit={p.payment.openById} onOpenSupplier={p.openSupplierDetails} />
      ) : p.moduleTab === 'locations' ? (
        <LocationsTab locations={p.locations} />
      ) : p.moduleTab === 'stocktake' ? (
        <StocktakesTab tab={p.stocktakesTab} detail={p.stocktakeDetail} />
      ) : !isProductTab ? (
        <ComingSoon label={moduleTab.label} blurb={moduleTab.blurb} />
      ) : p.showSkeleton ? (
        <LoadingState />
      ) : !p.product ? (
        <EmptyState />
      ) : p.moduleTab === 'variants' ? (
        <VariantsTab p={p} />
      ) : (
        <div className="space-y-2 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:space-y-0 xl:gap-2 xl:overflow-hidden">
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

function LoadingState() {
  return (
    <div className="space-y-2">
      <div className="h-8 animate-pulse rounded-[10px] border border-inventory-border bg-inventory-surface-muted" />

      {/* Mirrors ProductDetailsTab's item-7 column order: Image, Details, Pricing, Stock
          summary, Online stores. */}
      <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:grid-cols-[150px_minmax(0,1.6fr)_minmax(0,1.15fr)_170px_200px]">
        <div className="h-[285px] animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
        <div className="h-[285px] animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
        <div className="h-[285px] animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
        <div className="h-[285px] animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
        <div className="h-[285px] animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
      </div>

      <div className="rounded-xl border border-inventory-border bg-inventory-surface shadow-inventory">
        <div className="m-2 h-6 animate-pulse rounded bg-inventory-surface-muted" />
        <div className="m-2 h-40 animate-pulse rounded bg-inventory-surface-muted" />
      </div>

      <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:h-24 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[10px] border border-inventory-border bg-inventory-surface-muted xl:h-full" />
        ))}
      </div>
    </div>
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
