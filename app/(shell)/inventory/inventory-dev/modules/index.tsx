'use client';

import BottomPanels from './BottomPanels';
import ComingSoon from './ComingSoon';
import InventoryDevModals from './InventoryDevModals';
import ModuleTabs from './ModuleTabs';
import ProductDetailsTab from './ProductDetailsTab';
import ProductSubTabs from './ProductSubTabs';
import ProductsToolbar from './ProductsToolbar';
import VariantsMatrixTable from './VariantsMatrixTable';
import VariantsMatrixToolbar from './VariantsMatrixToolbar';
import { MODULE_TABS, PRODUCT_TABS } from './constants';
import { useInventoryDevPage } from './hooks/useInventoryDevPage';

export default function InventoryDevPage() {
  const p = useInventoryDevPage();
  const moduleTab = MODULE_TABS.find((t) => t.id === p.moduleTab)!;
  const productTab = PRODUCT_TABS.find((t) => t.id === p.productTab)!;

  return (
    <main className="flex-1 space-y-3 p-4 md:p-6">
      <ModuleTabs active={p.moduleTab} onChange={p.setModuleTab} />

      {p.moduleTab !== 'products' ? (
        <ComingSoon label={moduleTab.label} blurb={moduleTab.blurb} />
      ) : (
        <>
          <ProductsToolbar {...p} />

          {p.loading ? (
            <LoadingState />
          ) : !p.product ? (
            <EmptyState />
          ) : (
            <>
              <div className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
                <ProductSubTabs active={p.productTab} onChange={p.setProductTab} />
              </div>

              {p.productTab === 'details' ? (
                <ProductDetailsTab p={p} product={p.product} />
              ) : (
                <ComingSoon label={productTab.label} blurb={productTab.blurb} />
              )}

              <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <VariantsMatrixToolbar matrix={p.matrix} onAction={p.notImplemented} />
                <VariantsMatrixTable matrix={p.matrix} onAction={p.notImplemented} />
              </section>

              <BottomPanels product={p.product} now={p.now} onAction={p.notImplemented} />
            </>
          )}
        </>
      )}

      <InventoryDevModals {...p} />
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
