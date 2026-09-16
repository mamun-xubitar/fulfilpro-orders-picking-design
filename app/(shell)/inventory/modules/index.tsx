'use client';

import { usePageHeading } from '@/components/PageHeadingContext';
import Pagination from '@/components/Pagination';
import { useZoom } from '@/components/ZoomContext';
import { useEffect } from 'react';
import BottomPanels from './BottomPanels';
import ComingSoon from './ComingSoon';
import InventoryGlobals from './InventoryGlobals';
import InventoryModals from './InventoryModals';
import { panelBorderClass } from './MainImagePanel';
import ModuleTabs from './ModuleTabs';
import ProductDetailsTab from './ProductDetailsTab';
import ProductSubTabs from './ProductSubTabs';
import ProductsBulkModals from './ProductsBulkModals';
import ProductsSelectionBar from './ProductsSelectionBar';
import ProductsTable from './ProductsTable';
import ProductsTableToolbar from './ProductsTableToolbar';
import ProductsToolbar from './ProductsToolbar';
import SuppliersTab from './SuppliersTab';
import VariantsMatrixSection from './VariantsMatrixSection';
import { MODULE_TABS, PRODUCT_STATUS_BADGES, PRODUCT_TABS, productStatusLabel } from './constants';
import { useInventoryPage } from './hooks/useInventoryPage';
import './inventory-theme.css';

export default function InventoryPage() {
  const p = useInventoryPage();
  const { zoomPercent } = useZoom();
  const moduleTab = MODULE_TABS.find((t) => t.id === p.moduleTab)!;
  const productTab = PRODUCT_TABS.find((t) => t.id === p.productTab)!;
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
      style={{ zoom: `${zoomPercent}%` }}
    >
      <ModuleTabs active={p.moduleTab} onChange={p.setModuleTab} right={p.moduleTab === 'products' ? <InventoryGlobals p={p} /> : undefined} />

      {p.moduleTab === 'suppliers' ? (
        <SuppliersTab suppliers={p.suppliers} />
      ) : p.moduleTab !== 'products' ? (
        <ComingSoon label={moduleTab.label} blurb={moduleTab.blurb} />
      ) : (
        <div className="space-y-2 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:space-y-0 xl:gap-2 xl:overflow-hidden">
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
          ) : p.showSkeleton ? (
            <LoadingState />
          ) : !p.product ? (
            <EmptyState />
          ) : (
            <div className="space-y-2 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col xl:space-y-0 xl:gap-2 xl:overflow-hidden">
              <div className={`flex items-center gap-[8px] rounded-[10px] border ${panelBorderClass('subtabs')} bg-inventory-surface px-[8px] shadow-inventory xl:flex-none`}>
                <ProductSubTabs active={p.productTab} onChange={p.setProductTab} />
                <span className="ml-auto min-w-0 truncate text-[9px] leading-none text-inventory-text-subtle">
                  {p.product.name} · {p.product.brand}
                </span>
                <span
                  className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] ${PRODUCT_STATUS_BADGES[p.product.status]}`}
                >
                  {productStatusLabel(p.product.status)}
                </span>
                <span
                  className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-[6px] py-[1px] text-[9px] font-bold uppercase leading-none tracking-[0.4px] ${
                    p.product.verified
                      ? 'border-inventory-secondary/30 bg-inventory-secondary/10 text-inventory-secondary'
                      : 'border-inventory-danger/30 bg-inventory-danger/10 text-inventory-danger'
                  }`}
                >
                  {p.product.verified ? 'Verified' : 'Unverified'}
                </span>
              </div>

              {p.productTab === 'details' ? (
                <ProductDetailsTab p={p} />
              ) : (
                <ComingSoon label={productTab.label} blurb={productTab.blurb} />
              )}

              <VariantsMatrixSection p={p} />

              <BottomPanels p={p} />
            </div>
          )}
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

      <div className="grid grid-cols-1 gap-[5px] md:grid-cols-2 xl:grid-cols-[172px_minmax(0,2fr)_minmax(0,1.32fr)_206px]">
        <div className="flex flex-col gap-[5px]">
          <div className="h-40 animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
          <div className="h-32 animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
        </div>
        <div className="h-80 animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
        <div className="h-80 animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
        <div className="h-80 animate-pulse rounded-xl border border-inventory-border bg-inventory-surface-muted" />
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
