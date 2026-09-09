'use client';

import { ModalActions, ModalShell } from '@/components/ModalShell';
import AdjustmentModals from './AdjustmentModals';
import BulkUpdateStoresModal from './BulkUpdateStoresModal';
import EditImagesModal from './EditImagesModal';
import GalleryPreview from './GalleryPreview';
import GalleryThumbRow from './GalleryThumbRow';
import ImportModal from './ImportModal';
import ImportProductsModal from './ImportProductsModal';
import PoModals from './PoModals';
import PublishToStoresModal from './PublishToStoresModal';
import StocktakeModal from './StocktakeModal';
import StorePricesModal from './StorePricesModal';
import SupplierModal from './SupplierModal';
import VariantsMatrixSection from './VariantsMatrixSection';
import NewProductWizard from './newProduct/NewProductWizard';
import { ChevronLeft, ChevronRight, Close } from './icons';
import { formatMoney, variantTitle } from './utils';
import type { InventoryPage } from './hooks/useInventoryPage';

export default function InventoryModals(p: InventoryPage) {
  const { gallery, pricing, imageMutations, matrix } = p;
  const variants = p.product?.variants ?? [];

  return (
    <>
      {p.newProductOpen && <NewProductWizard p={p} />}

      {p.matrixFullView && p.product && (
        <ModalShell title="Variants / stock matrix" onClose={p.closeMatrixFullView} fullScreen>
          <VariantsMatrixSection p={p} fullView />
        </ModalShell>
      )}

      {p.editImagesOpen && (
        <EditImagesModal images={gallery.images} colours={p.details.colours} imageMutations={imageMutations} onClose={p.closeEditImages} />
      )}

      {gallery.lightboxOpen && gallery.lightboxActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" role="dialog" aria-modal="true" onClick={gallery.closeLightbox}>
          <button type="button" onClick={gallery.closeLightbox} aria-label="Close" className="absolute right-4 top-4 text-white/80 hover:text-white cursor-pointer">
            <Close className="h-6 w-6" />
          </button>

          {gallery.lightboxItems.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  gallery.step(-1);
                }}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors duration-150 hover:bg-white/20 cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  gallery.step(1);
                }}
                aria-label="Next image"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors duration-150 hover:bg-white/20 cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="px-20" onClick={(e) => e.stopPropagation()}>
            <GalleryPreview active={gallery.lightboxActive} productName={p.product?.name ?? ''} />
          </div>

          <div className="absolute inset-x-0 bottom-4 flex justify-center px-16" onClick={(e) => e.stopPropagation()}>
            <GalleryThumbRow tiles={gallery.lightboxItems} activeKey={gallery.lightboxActiveKey} onSelect={gallery.setLightboxActiveKey} />
          </div>
        </div>
      )}

      {p.storePriceTarget && (
        <StorePricesModal
          key={p.storePriceTarget.storeId}
          listing={p.storePriceTarget}
          onClose={() => p.setStorePriceTarget(null)}
          saving={p.storeListings.savingStoreId === p.storePriceTarget.storeId}
          onSaveOne={(variantId, price) =>
            p.storeListings.savePrices(p.storePriceTarget!.storeId, p.storePriceTarget!.productGid!, [{ id: variantId, price }])
          }
          onSaveAll={(variants) => p.storeListings.savePrices(p.storePriceTarget!.storeId, p.storePriceTarget!.productGid!, variants)}
        />
      )}

      {p.product && p.storePublish.publishOpen && (
        <PublishToStoresModal product={p.product} storeOptions={p.storeListings.listings} publish={p.storePublish} />
      )}

      {p.product && p.storePublish.bulkOpen && (
        <BulkUpdateStoresModal product={p.product} storeOptions={p.storeListings.listings} publish={p.storePublish} />
      )}

      {pricing.confirmUse && (
        <ModalShell
          title="Apply this price?"
          onClose={pricing.cancelUsePrice}
          footer={<ModalActions onCancel={pricing.cancelUsePrice} onConfirm={pricing.confirmUsePrice} confirmLabel="Apply to all variants" disabled={pricing.applying} />}
        >
          <p className="text-sm text-gray-600">Every variant of this product will be updated to:</p>
          <dl className="mt-3 space-y-2">
            <SummaryRow label="Sell price (inc tax)" value={`${formatMoney(pricing.confirmUse.sellingIncTax)} ${p.globals.baseCurrency}`} />
            <SummaryRow label="Buy price (landed)" value={`${formatMoney(pricing.confirmUse.totalBuying)} ${p.globals.baseCurrency}`} />
          </dl>
        </ModalShell>
      )}

      {matrix.deleteTarget && (
        <ModalShell
          title="Delete this variant?"
          onClose={matrix.cancelDeleteRow}
          footer={<ModalActions onCancel={matrix.cancelDeleteRow} onConfirm={matrix.confirmDeleteRow} confirmLabel="Delete variant" disabled={matrix.deleting} />}
        >
          <p className="text-sm text-gray-600">
            This removes <strong className="font-semibold text-gray-900">{variantTitle(matrix.deleteTarget)}</strong>
            {matrix.deleteTarget.sku ? ` (${matrix.deleteTarget.sku})` : ''} and its stock history. This can&apos;t be undone.
          </p>
        </ModalShell>
      )}

      {matrix.bulkDeleteOpen && (
        <ModalShell
          title="Delete selected variants?"
          onClose={matrix.cancelBulkDelete}
          footer={
            <ModalActions
              onCancel={matrix.cancelBulkDelete}
              onConfirm={matrix.confirmBulkDelete}
              confirmLabel={matrix.bulkDeleting ? 'Deleting...' : 'Delete variants'}
              disabled={matrix.bulkDeleting}
              danger
            />
          }
        >
          <p className="text-sm text-gray-600">
            This removes <strong className="font-semibold text-gray-900">{matrix.selectedIds.size}</strong> selected variant
            {matrix.selectedIds.size === 1 ? '' : 's'} and their stock history. This can&apos;t be undone.
          </p>
        </ModalShell>
      )}

      {p.deleteProductOpen && p.product && (
        <ModalShell
          title="Delete this product?"
          onClose={p.closeDeleteProduct}
          footer={
            <ModalActions
              onCancel={p.closeDeleteProduct}
              onConfirm={p.confirmDeleteProduct}
              confirmLabel={p.deletingProduct ? 'Deleting...' : 'Delete product'}
              disabled={p.deletingProduct}
              danger
            />
          }
        >
          <p className="text-sm text-gray-600">
            This permanently removes <strong className="font-semibold text-gray-900">{p.product.name}</strong>, every variant, image and
            history entry attached to it. This can&apos;t be undone.
          </p>
        </ModalShell>
      )}

      <PoModals po={p.po} variants={variants} />
      <StocktakeModal stocktake={p.stocktake} />
      <AdjustmentModals adjustments={p.adjustments} variants={variants} />
      <ImportModal importExport={p.importExport} />
      <ImportProductsModal importProducts={p.importProducts} suppliers={p.supplierOptions} />
      <SupplierModal suppliers={p.suppliers} />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
      <dt className="text-[13px] font-medium text-gray-600">{label}</dt>
      <dd className="text-[13px] font-bold text-gray-900 tabular-nums">{value}</dd>
    </div>
  );
}

