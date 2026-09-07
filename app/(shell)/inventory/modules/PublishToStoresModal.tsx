'use client';

import { ModalShell } from '@/components/ModalShell';
import StoreDraftBlock from './StoreDraftBlock';
import { sanitizeHtml } from '@/lib/sanitize-html';
import type { ProductRecord, StoreListingResult } from './types';
import type { StorePublishState } from './hooks/useStorePublish';

type PublishToStoresModalProps = {
  product: ProductRecord;
  storeOptions: StoreListingResult[];
  publish: StorePublishState;
};

/**
 * The "+" on Online stores & prices — publishes this product's current details, images, pricing
 * (with each store's margin pre-filling a suggested price) and variants to any connected store.
 * Product master fields are read-only here, sourced from the hub record, so there is exactly one
 * place that edits them; only what genuinely differs per store (tags, SEO, price) is editable.
 */
export default function PublishToStoresModal({ product, storeOptions, publish: p }: PublishToStoresModalProps) {
  const selectedStores = storeOptions.filter((s) => p.selectedStoreIds.has(s.storeId));

  return (
    <ModalShell
      title="Online stores & prices"
      onClose={p.closePublish}
      fullScreen
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={p.closePublish}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-600 transition-colors duration-150 hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={p.publishToSelected}
            disabled={p.publishing || p.selectedStoreIds.size === 0}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {p.publishing ? 'Publishing…' : `Publish to ${p.selectedStoreIds.size || ''} store${p.selectedStoreIds.size === 1 ? '' : 's'}`}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Connected stores</p>
          {storeOptions.length === 0 && <p className="text-[13px] text-gray-400">No connected stores.</p>}
          {storeOptions.map((store) => (
            <label key={store.storeId} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={p.selectedStoreIds.has(store.storeId)}
                onChange={() => p.toggleStore(store.storeId)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-gray-900">{store.storeName}</span>
                <span className="block truncate text-[11px] text-gray-400">{store.listingStatus.replace('_', ' ')}</span>
              </span>
            </label>
          ))}
        </aside>

        <div className="space-y-4">
          <section className="rounded-xl border border-gray-200 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Product</p>
            <div className="flex gap-3">
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0].url} alt={product.images[0].altText ?? product.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{product.name}</p>
                <p className="text-[12px] text-gray-500">
                  {product.brand} · {product.variants.length} variant{product.variants.length === 1 ? '' : 's'}
                </p>
                {product.description && (
                  <div
                    className="mt-1 line-clamp-2 text-[12px] text-gray-500"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }}
                  />
                )}
              </div>
            </div>
          </section>

          {selectedStores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-[13px] text-gray-400">
              Select at least one store to set its price, tags and SEO.
            </p>
          ) : (
            selectedStores.map((store) => (
              <StoreDraftBlock
                key={store.storeId}
                storeName={store.storeName}
                storeDomain={store.storeDomain}
                product={product}
                draft={p.draftFor(store.storeId)}
                onChange={(next) => p.setDraft(store.storeId, next)}
                showDetails
                showPricing
                showVariants
              />
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
}
