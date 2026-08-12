'use client';

import { useState } from 'react';
import { ModalActions, ModalShell } from '@/components/ModalShell';
import { ChevronLeft, ChevronRight, Close, Plus, Trash } from './icons';
import { formatMoney, getSwatch } from './utils';
import type { InventoryDevPage } from './hooks/useInventoryDevPage';

export default function InventoryDevModals(p: InventoryDevPage) {
  const { gallery, pricing } = p;

  return (
    <>
      {p.newProductOpen && <NewProductModal onClose={p.closeNewProduct} onCreate={p.notImplemented} />}

      {p.editImagesOpen && (
        <ModalShell title="Edit images" onClose={p.closeEditImages} wide>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.images.map((image) => (
              <figure key={image.id} className="overflow-hidden rounded-xl border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.altText ?? ''} className="aspect-square w-full object-cover" />
                <figcaption className="flex items-center justify-between gap-1 bg-gray-50 px-2 py-1.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {image.colour && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getSwatch(image.colour) }} />}
                    <span className="truncate text-[11px] font-medium text-gray-600">{image.colour ?? 'Unassigned'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => p.notImplemented('Removing an image')}
                    aria-label="Remove image"
                    className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </figcaption>
              </figure>
            ))}
            <button
              type="button"
              onClick={() => p.notImplemented('Adding an image')}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors duration-150 hover:border-blue-400 hover:text-blue-500 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span className="text-[11px] font-semibold">Add image</span>
            </button>
          </div>
        </ModalShell>
      )}

      {gallery.lightboxOpen && gallery.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4" role="dialog" aria-modal="true" onClick={gallery.closeLightbox}>
          <button type="button" onClick={gallery.closeLightbox} aria-label="Close" className="absolute right-4 top-4 text-white/80 hover:text-white cursor-pointer">
            <Close className="h-6 w-6" />
          </button>
          <LightboxArrow side="left" onClick={() => gallery.step(-1)} />
          <figure className="max-w-3xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gallery.active.url} alt={gallery.active.altText ?? ''} className="max-h-[75vh] w-full object-contain" />
            <figcaption className="mt-3 text-center text-sm text-white/80">{gallery.active.altText ?? gallery.active.colour ?? ''}</figcaption>
          </figure>
          <LightboxArrow side="right" onClick={() => gallery.step(1)} />
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
          footer={<ModalActions onCancel={pricing.cancelUsePrice} onConfirm={pricing.confirmUsePrice} confirmLabel="Apply to all variants" disabled={false} />}
        >
          <p className="text-sm text-gray-600">Every variant of this product will be updated to:</p>
          <dl className="mt-3 space-y-2">
            <SummaryRow label="Sell price (inc tax)" value={`${formatMoney(pricing.confirmUse.sellingIncTax)} ${p.globals.baseCurrency}`} />
            <SummaryRow label="Buy price (landed)" value={`${formatMoney(pricing.confirmUse.totalBuying)} ${p.globals.baseCurrency}`} />
          </dl>
        </ModalShell>
      )}
    </>
  );
}

function LightboxArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      className={`absolute ${side === 'left' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-white/80 hover:text-white cursor-pointer`}
    >
      {side === 'left' ? <ChevronLeft className="h-8 w-8" /> : <ChevronRight className="h-8 w-8" />}
    </button>
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

function NewProductModal({ onClose, onCreate }: { onClose: () => void; onCreate: (action: string) => void }) {
  const [form, setForm] = useState({ itemNo: '', name: '', brand: '' });
  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const disabled = form.itemNo.trim() === '' || form.name.trim() === '';

  return (
    <ModalShell
      title="New product"
      onClose={onClose}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => {
            onCreate('Creating a product');
            onClose();
          }}
          confirmLabel="Create product"
          disabled={disabled}
        />
      }
    >
      <div className="space-y-3">
        <TextField label="Item no." value={form.itemNo} onChange={set('itemNo')} placeholder="09419" />
        <TextField label="Product name" value={form.name} onChange={set('name')} placeholder="FLEX KINDY WIDE BRIM HAT" />
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
}: {
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
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
    </div>
  );
}
