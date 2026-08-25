'use client';

import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ModalActions, ModalShell } from '@/components/ModalShell';
import AdjustmentModals from './AdjustmentModals';
import GalleryPreview from './GalleryPreview';
import GalleryThumbRow from './GalleryThumbRow';
import ImportModal from './ImportModal';
import PoModals from './PoModals';
import StocktakeModal from './StocktakeModal';
import { ChevronLeft, ChevronRight, Close, Plus, Trash } from './icons';
import { formatMoney, makeSwatchResolver } from './utils';
import type { InventoryPage } from './hooks/useInventoryPage';

// Mirrors the limits enforced in app/api/inventory/catalog/[id]/images/upload/route.ts
const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file

export default function InventoryModals(p: InventoryPage) {
  const { gallery, pricing, imageMutations, matrix } = p;
  const swatchOf = makeSwatchResolver(p.details.colours);
  const variants = p.product?.variants ?? [];
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <ModalShell title="Edit images" onClose={p.closeEditImages} wide>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.images.map((image) => (
              <figure key={image.id} className="overflow-hidden rounded-xl border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.altText ?? ''} className="aspect-square w-full object-cover" />
                <figcaption className="flex items-center gap-1 bg-gray-50 px-2 py-1.5">
                  {image.colour && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: swatchOf(image.colour) }} />}
                  <select
                    value={image.colour ?? ''}
                    onChange={(e) => imageMutations.updateImageColour(image.id, e.target.value || null)}
                    disabled={imageMutations.updatingColourId === image.id}
                    aria-label="Image colour"
                    className="min-w-0 flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {p.details.colours.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => imageMutations.removeImage(image.id)}
                    disabled={imageMutations.removingId === image.id}
                    aria-label="Remove image"
                    className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </figcaption>
              </figure>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={imageMutations.uploading}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors duration-150 hover:border-blue-400 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[11px] font-semibold">{imageMutations.uploading ? 'Uploading…' : 'Add image'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (files.length === 0) return;
                if (files.length > MAX_FILES) {
                  toast.error(`You can upload at most ${MAX_FILES} files at once`);
                  return;
                }
                const nonImage = files.find((f) => !f.type.startsWith('image/'));
                if (nonImage) {
                  toast.error(`${nonImage.name} is not an image`);
                  return;
                }
                const oversized = files.find((f) => f.size > MAX_SIZE);
                if (oversized) {
                  toast.error(`${oversized.name} exceeds the 10 MB limit`);
                  return;
                }
                void imageMutations.uploadImages(files, null);
              }}
            />
          </div>
        </ModalShell>
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
            <GalleryThumbRow groups={gallery.lightboxItems} activeKey={gallery.lightboxActiveKey} onSelect={gallery.setLightboxActiveKey} />
          </div>
        </div>
      )}

      {p.storePriceTarget && (
        <StorePriceModal
          key={p.storePriceTarget.id}
          storeName={p.storePriceTarget.name}
          currentPrice={p.storePriceTarget.price}
          baseCurrency={p.globals.baseCurrency}
          onCancel={() => p.setStorePriceTarget(null)}
          onSave={(price) => p.saveStorePrice(p.storePriceTarget!.id, price)}
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
            This removes <strong className="font-semibold text-gray-900">{matrix.deleteTarget.colour} / {matrix.deleteTarget.size}</strong>
            {matrix.deleteTarget.sku ? ` (${matrix.deleteTarget.sku})` : ''} and its stock history. This can&apos;t be undone.
          </p>
        </ModalShell>
      )}

      <PoModals po={p.po} variants={variants} />
      <StocktakeModal stocktake={p.stocktake} />
      <AdjustmentModals adjustments={p.adjustments} variants={variants} />
      <ImportModal importExport={p.importExport} />
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

function StorePriceModal({
  storeName,
  currentPrice,
  baseCurrency,
  onCancel,
  onSave,
}: {
  storeName: string;
  currentPrice: number;
  baseCurrency: string;
  onCancel: () => void;
  onSave: (price: number) => void;
}) {
  const [value, setValue] = useState(String(currentPrice));
  const parsed = Number(value);
  const invalid = !Number.isFinite(parsed) || parsed < 0;

  return (
    <ModalShell
      title={`Edit price — ${storeName}`}
      onClose={onCancel}
      footer={<ModalActions onCancel={onCancel} onConfirm={() => onSave(parsed)} confirmLabel="Save price" disabled={invalid} />}
    >
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500" htmlFor="store-price">
        Price ({baseCurrency})
      </label>
      <input
        id="store-price"
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-blue-400"
      />
      {invalid && <p className="mt-1 text-[11px] text-red-600">Enter a price of 0 or more</p>}
    </ModalShell>
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
  onCreate: (form: { supplierId: string; itemNo: string; name: string; brand: string }) => void;
  saving: boolean;
  errors: Record<string, string>;
}) {
  const [form, setForm] = useState({ supplierId: suppliers[0]?.id ?? '', itemNo: '', name: '', brand: '' });
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const disabled = form.itemNo.trim() === '' || form.name.trim() === '' || form.supplierId === '';

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
        <TextField label="Product name" value={form.name} onChange={set('name')} placeholder="FLEX KINDY WIDE BRIM HAT" error={errors.name} />
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
