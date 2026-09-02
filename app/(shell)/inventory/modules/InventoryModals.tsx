'use client';

import { useState } from 'react';
import { ModalActions, ModalShell } from '@/components/ModalShell';
import { slugifyHandle } from '@/lib/inventory/handle';
import AdjustmentModals from './AdjustmentModals';
import EditImagesModal from './EditImagesModal';
import GalleryPreview from './GalleryPreview';
import GalleryThumbRow from './GalleryThumbRow';
import ImportModal from './ImportModal';
import ImportProductsModal from './ImportProductsModal';
import PoModals from './PoModals';
import StocktakeModal from './StocktakeModal';
import StorePricesModal from './StorePricesModal';
import { ChevronLeft, ChevronRight, Close, Lock, Unlock } from './icons';
import { formatMoney, variantTitle } from './utils';
import type { InventoryPage } from './hooks/useInventoryPage';

export default function InventoryModals(p: InventoryPage) {
  const { gallery, pricing, imageMutations, matrix } = p;
  const variants = p.product?.variants ?? [];

  return (
    <>
      {p.newProductOpen && (
        <NewProductModal
          suppliers={p.supplierOptions}
          onClose={p.closeNewProduct}
          onCreate={p.createProduct}
          saving={p.creatingProduct}
          errors={p.createErrors}
        />
      )}

      {p.editImagesOpen && (
        <EditImagesModal images={gallery.images} variants={variants} imageMutations={imageMutations} onClose={p.closeEditImages} />
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

      <PoModals po={p.po} variants={variants} />
      <StocktakeModal stocktake={p.stocktake} />
      <AdjustmentModals adjustments={p.adjustments} variants={variants} />
      <ImportModal importExport={p.importExport} />
      <ImportProductsModal importProducts={p.importProducts} suppliers={p.supplierOptions} />
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

function NewProductModal({
  suppliers,
  onClose,
  onCreate,
  saving,
  errors,
}: {
  suppliers: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (form: { supplierId: string; itemNo: string; name: string; brand: string; handle: string }) => void;
  saving: boolean;
  errors: Record<string, string>;
}) {
  const [form, setForm] = useState({ supplierId: suppliers[0]?.id ?? '', itemNo: '', name: '', brand: '', handle: '' });
  // Locked (the default): the handle field is disabled and re-derives from the product name on
  // every keystroke. Unlocking hands control to the user; re-locking re-derives immediately.
  const [handleLocked, setHandleLocked] = useState(true);

  const set = (field: 'supplierId' | 'itemNo' | 'brand') => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const setName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((prev) => ({ ...prev, name, ...(handleLocked ? { handle: slugifyHandle(name) } : {}) }));
  };
  const setHandle = (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, handle: e.target.value }));
  const toggleHandleLock = () => {
    setHandleLocked((prev) => {
      const next = !prev;
      if (next) setForm((f) => ({ ...f, handle: slugifyHandle(f.name) }));
      return next;
    });
  };

  const disabled = form.itemNo.trim() === '' || form.name.trim() === '' || form.supplierId === '' || form.handle.trim() === '';

  return (
    <ModalShell
      title="New product"
      onClose={onClose}
      footer={<ModalActions onCancel={onClose} onConfirm={() => onCreate(form)} confirmLabel={saving ? 'Creating...' : 'Create product'} disabled={disabled || saving} />}
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Supplier</label>
          <select
            value={form.supplierId}
            onChange={set('supplierId')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Select a supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.supplierId && <p className="mt-1 text-xs text-red-600">{errors.supplierId}</p>}
        </div>
        <TextField label="Item no." value={form.itemNo} onChange={set('itemNo')} placeholder="09419" error={errors.itemNo} />
        <TextField label="Product name" value={form.name} onChange={setName} placeholder="FLEX KINDY WIDE BRIM HAT" error={errors.name} />
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Handle</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={form.handle}
              onChange={setHandle}
              disabled={handleLocked}
              placeholder="flex-kindy-wide-brim-hat"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
            />
            <button
              type="button"
              onClick={toggleHandleLock}
              aria-label={handleLocked ? 'Edit handle' : 'Auto-generate handle'}
              title={handleLocked ? 'Edit handle' : 'Auto-generate handle'}
              className="shrink-0 rounded-lg border border-gray-300 bg-white p-2.5 text-gray-500 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
            >
              {handleLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          </div>
          {errors.handle && <p className="mt-1 text-xs text-red-600">{errors.handle}</p>}
        </div>
        <TextField label="Brand" value={form.brand} onChange={set('brand')} placeholder="FLEX KINDY" />
      </div>
    </ModalShell>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
