'use client';

import { MODAL_FOOTER_BTN_DANGER, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from '@/components/ModalShell';
import AdjustmentDetailModal from './AdjustmentDetailModal';
import AdjustmentModals from './AdjustmentModals';
import BulkUpdateStoresModal from './BulkUpdateStoresModal';
import EditImagesModal from './EditImagesModal';
import GalleryPreview from './GalleryPreview';
import GalleryThumbRow from './GalleryThumbRow';
import ImportModal from './ImportModal';
import ImportProductsModal from './ImportProductsModal';
import PoModals from './PoModals';
import PublishToStoresModal from './PublishToStoresModal';
import StocktakeConfirmDialogs from './StocktakeConfirmDialogs';
import StocktakeCountModal from './StocktakeCountModal';
import StocktakeModal from './StocktakeModal';
import StorePricesModal from './StorePricesModal';
import SupplierModal from './SupplierModal';
import VariantsMatrixSection from './VariantsMatrixSection';
import type { InventoryPage } from './hooks/useInventoryPage';
import { ChevronLeft, ChevronRight, Close } from './icons';
import { SPINNER, WIZARD_BODY_CLASS, WIZARD_BTN_PRIMARY, WIZARD_BTN_SECONDARY, WIZARD_CARD_CLASS } from './modalStyles';
import BulkLocationModal from './BulkLocationModal';
import LocationModal from './LocationModal';
import StoreLocationsModal from './StoreLocationsModal';
import VariantLocationRemapModal from './VariantLocationRemapModal';
import NewProductWizard from './newProduct/NewProductWizard';
import BulkPayPoModal from './BulkPayPoModal';
import PayPoModal from './PayPoModal';
import SupplierDetailsModal from './SupplierDetailsModal';
import { deleteBlockers, formatMoney, variantTitle } from './utils';

export default function InventoryModals(p: InventoryPage) {
  const { gallery, pricing, imageMutations, matrix } = p;
  const variants = p.product?.variants ?? [];

  return (
    <>
      {p.newProductOpen && <NewProductWizard p={p} />}
      <LocationModal locations={p.locations} />
      <StoreLocationsModal storeLocations={p.storeLocations} locations={p.locations.options} />
      <PayPoModal pay={p.payment} globals={p.globals} />
      <BulkPayPoModal bulk={p.bulkPay} globals={p.globals} />
      {p.supplierDetailId && (
        <SupplierDetailsModal supplierId={p.supplierDetailId} onClose={p.closeSupplierDetails} onOpenPurchaseOrders={p.openPurchaseOrdersFor} onOpenPayments={p.openPaymentsFor} />
      )}
      <BulkLocationModal bulk={p.bulkLocations} locations={p.locations} />
      {matrix.pendingRemap && (
        <VariantLocationRemapModal
          pending={matrix.pendingRemap}
          product={p.product}
          saving={matrix.savingRowId === matrix.pendingRemap.variantId || matrix.savingCell?.startsWith(`${matrix.pendingRemap.variantId}:`) === true}
          onCancel={matrix.cancelPendingRemap}
          onTarget={matrix.setPendingRemapTarget}
          onConfirm={matrix.confirmPendingRemap}
        />
      )}

      {p.matrixFullView && p.product && (
        <ModalShell disableBackdropClose title={`Variants / stock — ${p.product.name}`} compact onClose={p.closeMatrixFullView} fullScreen>
          <VariantsMatrixSection p={p} fullView />
        </ModalShell>
      )}

      {p.editImagesOpen && (
        <EditImagesModal images={gallery.images} colours={p.details.colours} imageMutations={imageMutations} onClose={p.closeEditImages} />
      )}

      {gallery.lightboxOpen && gallery.lightboxActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" role="dialog" aria-modal="true">
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
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/40 bg-inventory-surface/85 p-2.5 text-inventory-text shadow-lg backdrop-blur-sm transition-colors duration-150 hover:bg-inventory-surface cursor-pointer"
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
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/40 bg-inventory-surface/85 p-2.5 text-inventory-text shadow-lg backdrop-blur-sm transition-colors duration-150 hover:bg-inventory-surface cursor-pointer"
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

      {pricing.confirmUse && <ApplyPriceModal p={p} />}

      {matrix.deleteTarget && (
        <ModalShell disableBackdropClose
          title="Delete this variant?"
          compact
          onClose={matrix.cancelDeleteRow}
          footer={
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={matrix.cancelDeleteRow}
                className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={matrix.confirmDeleteRow}
                disabled={matrix.deleting || deleteBlockers(matrix.deleteTarget).length > 0}
                className={`flex-1 ${MODAL_FOOTER_BTN_DANGER}`}
              >
                Delete variant
              </button>
            </div>
          }
        >
          <p className="text-[12px] text-inventory-text-muted">
            This removes <strong className="font-semibold text-inventory-text">{variantTitle(matrix.deleteTarget)} </strong>
            {matrix.deleteTarget.sku ? ` (${matrix.deleteTarget.sku}) ` : ''} and its stock history. This can&apos;t be undone.
            {deleteBlockers(matrix.deleteTarget).length > 0 && (
              <span className="mt-2 block text-inventory-danger">
                Can&apos;t delete — this variant still has {deleteBlockers(matrix.deleteTarget).join(', ')}. Clear these to 0 before deleting.
              </span>
            )}
          </p>
        </ModalShell>
      )}

      {matrix.bulkDeleteOpen && <BulkDeleteVariantsModal p={p} />}

      {p.deleteProductOpen && p.product && (
        <DeleteProductModal p={p} />
      )}

      <PoModals po={p.po} variants={p.po.createProduct?.variants ?? variants} locations={p.locations.options} />
      <StocktakeModal stocktake={p.stocktake} />
      <StocktakeCountModal detail={p.stocktakeDetail} />
      <StocktakeConfirmDialogs detail={p.stocktakeDetail} />
      <AdjustmentModals adjustments={p.adjustments} variants={variants} onView={p.adjustmentDetail.openAdjustment} />
      <AdjustmentDetailModal detail={p.adjustmentDetail} onOpenProduct={p.openProductInVariants} />
      <ImportModal importExport={p.importExport} />
      <ImportProductsModal importProducts={p.importProducts} suppliers={p.supplierOptions} />
      <SupplierModal suppliers={p.suppliers} />
    </>
  );
}

function BulkDeleteVariantsModal({ p }: { p: InventoryPage }) {
  const { matrix } = p;
  const stockedCount = (p.product?.variants ?? []).filter((v) => matrix.selectedIds.has(v.id) && deleteBlockers(v).length > 0).length;
  return (
    <ModalShell disableBackdropClose
      title="Delete selected variants?"
      compact
      onClose={matrix.cancelBulkDelete}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={matrix.cancelBulkDelete}
            className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={matrix.confirmBulkDelete}
            disabled={matrix.bulkDeleting || stockedCount > 0}
            className={`flex-1 ${MODAL_FOOTER_BTN_DANGER}`}
          >
            {matrix.bulkDeleting ? 'Deleting...' : 'Delete variants'}
          </button>
        </div>
      }
    >
      <p className="text-[12px] text-inventory-text-muted">
        This removes <strong className="font-semibold text-inventory-text">{matrix.selectedIds.size}</strong> selected variant
        {matrix.selectedIds.size === 1 ? '' : 's'} and their stock history. This can&apos;t be undone.
        {stockedCount > 0 && (
          <span className="mt-2 block text-inventory-danger">
            Can&apos;t delete — {stockedCount} selected variant{stockedCount === 1 ? ' still has' : 's still have'} Stock, Allocated, Available or Incoming quantity. Clear{' '}
            {stockedCount === 1 ? 'it' : 'them'} to 0 or deselect {stockedCount === 1 ? 'it' : 'them'} before deleting.
          </span>
        )}
      </p>
    </ModalShell>
  );
}

function DeleteProductModal({ p }: { p: InventoryPage }) {
  if (!p.product) return null;
  return (
    <ModalShell disableBackdropClose
      title="Delete this product?"
      compact
      onClose={p.closeDeleteProduct}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={p.closeDeleteProduct}
            className={`flex-1 ${MODAL_FOOTER_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={p.confirmDeleteProduct}
            disabled={p.deletingProduct}
            className={`flex-1 ${MODAL_FOOTER_BTN_DANGER}`}
          >
            {p.deletingProduct ? 'Deleting...' : 'Delete product'}
          </button>
        </div>
      }
    >
      <p className="text-[12px] text-inventory-text-muted">
        This permanently removes <strong className="font-semibold text-inventory-text">{p.product.name}</strong>, every variant, image and
        history entry attached to it. This can&apos;t be undone.
      </p>
    </ModalShell>
  );
}

function ApplyPriceModal({ p }: { p: InventoryPage }) {
  const { pricing } = p;
  if (!pricing.confirmUse) return null;
  return (
    <ModalShell disableBackdropClose
      title="Apply this price?"
      compact
      onClose={pricing.cancelUsePrice}
      bodyClassName={WIZARD_BODY_CLASS}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={pricing.cancelUsePrice}
            className={`flex-1 ${WIZARD_BTN_SECONDARY}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={pricing.confirmUsePrice}
            disabled={pricing.applying}
            className={`flex-1 ${WIZARD_BTN_PRIMARY}`}
          >
            {pricing.applying && SPINNER}
            Apply to all variants
          </button>
        </div>
      }
    >
      <div className={WIZARD_CARD_CLASS}>
        <p className="text-[12px] text-inventory-text-muted">Every variant of this product will be updated to:</p>
        <dl className="mt-2 space-y-1.5">
          <SummaryRow label="Sell price (inc tax)" value={`${formatMoney(pricing.confirmUse.sellingIncTax)} ${p.globals.baseCurrency}`} />
          <SummaryRow label="Buy price (landed)" value={`${formatMoney(pricing.confirmUse.totalBuying)} ${p.globals.baseCurrency}`} />
        </dl>
      </div>
    </ModalShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[7px] bg-inventory-surface-muted px-2 py-1.5">
      <dt className="text-[11px] font-medium text-inventory-text-muted">{label}</dt>
      <dd className="text-[11px] font-bold text-inventory-text tabular-nums">{value}</dd>
    </div>
  );
}

