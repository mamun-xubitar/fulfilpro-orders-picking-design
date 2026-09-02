'use client';

import BottomPanels from './BottomPanels';
import ComingSoon from './ComingSoon';
import InventoryModals from './InventoryModals';
import ModuleTabs from './ModuleTabs';
import Pagination from '@/components/Pagination';
import ProductDetailsTab from './ProductDetailsTab';
import ProductSubTabs from './ProductSubTabs';
import ProductsBulkModals from './ProductsBulkModals';
import ProductsSelectionBar from './ProductsSelectionBar';
import ProductsTable from './ProductsTable';
import ProductsTableToolbar from './ProductsTableToolbar';
import ProductsToolbar from './ProductsToolbar';
import PurchaseOrdersPanel from './PurchaseOrdersPanel';
import VariantsMatrixTable from './VariantsMatrixTable';
import VariantsMatrixToolbar from './VariantsMatrixToolbar';
import { MODULE_TABS, PRODUCT_TABS } from './constants';
import { useInventoryPage } from './hooks/useInventoryPage';

export default function InventoryPage() {
  const p = useInventoryPage();
  const moduleTab = MODULE_TABS.find((t) => t.id === p.moduleTab)!;
  const productTab = PRODUCT_TABS.find((t) => t.id === p.productTab)!;
  const hasSelection = p.productsTable.selectAllFilters || p.productsTable.selectedIds.length > 0;

  return (
    <main className="flex-1 space-y-3 p-4 md:p-6">
      <ModuleTabs active={p.moduleTab} onChange={p.setModuleTab} />

      {p.moduleTab !== 'products' ? (
        <ComingSoon label={moduleTab.label} blurb={moduleTab.blurb} />
      ) : (
        <>
          <ProductsToolbar {...p} />

          {p.nav.allRecords ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <ProductsTableToolbar table={p.productsTable} onRefresh={p.productsTable.refresh} loading={p.productsTable.loading} />
              {hasSelection && <ProductsSelectionBar table={p.productsTable} />}
              <ProductsTable table={p.productsTable} loading={p.productsTable.initialLoading} />
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
          ) : p.initialLoading ? (
            <LoadingState />
          ) : !p.product ? (
            <EmptyState />
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
                <ProductSubTabs active={p.productTab} onChange={p.setProductTab} />
              </div>

              <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <VariantsMatrixToolbar p={p} />
                <VariantsMatrixTable matrix={p.matrix} />
              </section>

              {p.productTab === 'details' ? (
                <ProductDetailsTab p={p} />
              ) : (
                <ComingSoon label={productTab.label} blurb={productTab.blurb} />
              )}

              <PurchaseOrdersPanel po={p.po} />

              <BottomPanels p={p} />
            </>
          )}
        </>
      )}

      {p.nav.allRecords && <ProductsBulkModals table={p.productsTable} />}
      <InventoryModals {...p} />
    </main>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-80 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-20 text-center">
      <h2 className="text-base font-semibold text-gray-900">No products match the current filters</h2>
      <p className="mt-1 text-sm text-gray-500">Tick “All records” or clear the price shortcut to see the full catalogue.</p>
    </div>
  );
}
