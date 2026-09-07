"use client";

import { ModalShell } from "@/components/ModalShell";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useEffect, useRef } from "react";
import type { StorePublishState } from "./hooks/useStorePublish";
import StoreBlockSeparator from "./StoreBlockSeparator";
import StoreDraftBlock from "./StoreDraftBlock";
import StockWarningBanner from "./StockWarningBanner";
import type { ProductRecord, StoreListingResult } from "./types";

type PublishToStoresModalProps = {
  product: ProductRecord;
  storeOptions: StoreListingResult[];
  publish: StorePublishState;
};

/**
 * The "+" on Online stores & prices — adds/updates this product on any connected store.
 * Full-window modal: each selected store gets an editable overlay (product details incl.
 * title/description/brand/type/category/collections/status/handle, media picker with per-variant
 * image assignment, settings/tags/SEO, pricing & margin in AUD, variants / stock matrix with
 * per-store price + SKU/barcode + available stock). Save publishes everything in one go; hub
 * STATUS drives the Shopify listing (DRAFT stays unpublished).
 */
export default function PublishToStoresModal({
  product,
  storeOptions,
  publish: p,
}: PublishToStoresModalProps) {
  const selectedStores = storeOptions.filter((s) =>
    p.selectedStoreIds.has(s.storeId),
  );
  const allSelected =
    storeOptions.length > 0 &&
    storeOptions.every((s) => p.selectedStoreIds.has(s.storeId));
  const someSelected = p.selectedStoreIds.size > 0 && !allSelected;
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckboxRef.current)
      headerCheckboxRef.current.indeterminate = someSelected;
  }, [someSelected]);

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
            {p.publishing
              ? "Publishing…"
              : `Save & publish to ${p.selectedStoreIds.size || ""} store${p.selectedStoreIds.size === 1 ? "" : "s"}`}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <div className="mb-1 flex items-center gap-2">
            {storeOptions.length > 0 && (
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={() => p.toggleAllStores()}
                aria-label="Select all connected stores"
                title="Select all connected stores"
                className="rounded border-gray-300 text-blue-600 cursor-pointer"
              />
            )}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Connected stores
            </p>
          </div>
          {storeOptions.length === 0 && (
            <p className="text-[13px] text-gray-400">No connected stores.</p>
          )}
          {storeOptions.map((store) => (
            <label
              key={store.storeId}
              className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={p.selectedStoreIds.has(store.storeId)}
                onChange={() => p.toggleStore(store.storeId)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 cursor-pointer"
              />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-gray-900">
                  {store.storeName}
                </span>
                <span className="block truncate text-[11px] text-gray-400">
                  {store.listingStatus.replace("_", " ")}
                </span>
              </span>
            </label>
          ))}
        </aside>

        <div className="space-y-4">
          <section className="rounded-xl border border-gray-200 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Current product (hub source)
            </p>
            <div className="flex gap-3">
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0].url}
                  alt={product.images[0].altText ?? product.name}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {product.name}
                </p>
                <p className="text-[12px] text-gray-500">
                  {product.brand} · {product.category} ·{" "}
                  {product.variants.length} variant
                  {product.variants.length === 1 ? "" : "s"} · {product.status}
                  {product.status !== "ACTIVE"
                    ? " (will publish as draft — hidden from storefront)"
                    : ""}
                </p>
                <p className="text-[12px] text-gray-400">
                  Handle: <span className="font-mono">{product.handle}</span> ·
                  Sizes: {product.sizes.join(", ") || "—"} · Colours:{" "}
                  {product.colours.map((c) => c.name).join(", ") || "—"}
                </p>
                {product.description && (
                  <div
                    className="mt-1 line-clamp-2 break-words text-[12px] text-gray-500"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(product.description),
                    }}
                  />
                )}
              </div>
            </div>
            <p className="mt-2 text-[11px] text-gray-400">
              Edit each store&apos;s copy below — title, description, media,
              type, category, collections, status, handle (read-only), brand,
              SKU, sizes, colours, stock matrix, per-store AUD price and selling
              tags. Cost always comes from the hub; each store&apos;s available
              stock defaults to an even split of hub stock (or its own live
              quantity if already published) and can be adjusted per store.
            </p>
          </section>

          {p.stockWarnings.length > 0 && <StockWarningBanner warnings={p.stockWarnings} />}

          {selectedStores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-[13px] text-gray-400">
              Select at least one store to edit its listing and publish.
            </p>
          ) : (
            selectedStores.map((store, i) => (
              <div key={store.storeId} className="space-y-4">
                {i > 0 && <StoreBlockSeparator />}
                <StoreDraftBlock
                  storeId={store.storeId}
                  storeName={store.storeName}
                  storeDomain={store.storeDomain}
                  listingStatus={store.listingStatus}
                  index={i + 1}
                  total={selectedStores.length}
                  product={product}
                  draft={p.draftFor(store.storeId)}
                  onChange={(next) => p.setDraft(store.storeId, next)}
                  defaultStock={p.defaultStockFor(store.storeId)}
                  showImages
                  showDetails
                  showPricing
                  showVariants
                />
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
}
