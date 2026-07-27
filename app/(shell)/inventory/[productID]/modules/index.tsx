'use client';

import { useProductDetailPage } from './hooks/useProductDetailPage';
import ProductHeader from './ProductHeader';
import ProductGallery from './ProductGallery';
import ProductDetailsPanel from './ProductDetailsPanel';
import StoreSiblingsPanel from './StoreSiblingsPanel';
import VariantsSection from './VariantsSection';
import ProductDetailModals from './ProductDetailModals';

export default function ProductDetailPage({ productId }: { productId: string }) {
  const p = useProductDetailPage(productId);

  if (p.loading && !p.product) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <div className="animate-pulse text-sm text-gray-400">Loading product…</div>
      </main>
    );
  }

  if (p.error || !p.product) {
    return (
      <main className="flex-1 p-4 md:p-6">
        <p className="text-sm text-red-600">{p.error || 'Product not found'}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6 pb-24">
      <ProductHeader product={p.product} stale={p.stale} onResync={p.bumpRefresh} refreshing={p.loading} />

      <div
        className="grid gap-4 transition-[grid-template-columns] duration-200 mb-6"
        style={{ gridTemplateColumns: p.siblingsPanel.panelExpanded ? '1fr 20rem' : '1fr 0rem' }}
      >
        <div className="min-w-0 grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-4">
          <ProductGallery product={p.product} />
          <ProductDetailsPanel
            product={p.product}
            allContinueSelling={p.allContinueSelling}
            onToggleContinueSelling={p.toggleAllContinueSelling}
            togglingContinue={p.togglingContinue}
            onResyncStock={p.bumpRefresh}
            resyncing={p.loading}
            onEditField={p.fieldEdit.openEdit}
          />
        </div>
        <StoreSiblingsPanel
          siblings={p.siblings}
          expanded={p.siblingsPanel.panelExpanded}
          onToggle={p.siblingsPanel.togglePanel}
          onNavigate={p.siblingsPanel.requestNavigate}
          onRemove={p.siblingsPanel.requestRemove}
        />
      </div>

      <VariantsSection p={p} />

      <ProductDetailModals p={p} />
    </main>
  );
}
