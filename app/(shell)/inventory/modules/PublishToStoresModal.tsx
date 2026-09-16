"use client";

import { MODAL_FOOTER_BTN_PRIMARY, MODAL_FOOTER_BTN_SECONDARY, ModalShell } from "@/components/ModalShell";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { useEffect, useRef } from "react";
import { productStatusLabel } from "./constants";
import type { StorePublishState } from "./hooks/useStorePublish";
import StoreBlockSeparator from "./StoreBlockSeparator";
import StoreDraftBlock from "./StoreDraftBlock";
import StockWarningBanner from "./StockWarningBanner";
import NoVariantsWarningBanner from "./NoVariantsWarningBanner";
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
  // Publish always pushes every aspect (see ALL_ASPECTS in publishToSelected), so the variants
  // guard applies to every selected store, not just some — see NoVariantsWarningBanner.
  const noVariantsStores = selectedStores.filter((s) => p.hasNoVariantsIncluded(s.storeId));
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
    <ModalShell disableBackdropClose
      title="Online stores & prices"
      compact
      onClose={p.closePublish}
      fullScreen
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={p.closePublish}
            className={MODAL_FOOTER_BTN_SECONDARY}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={p.publishToSelected}
            disabled={p.publishing || p.selectedStoreIds.size === 0 || noVariantsStores.length > 0}
            className={`ml-auto ${MODAL_FOOTER_BTN_PRIMARY}`}
          >
            {p.publishing
              ? "Publishing…"
              : `Save & publish to ${p.selectedStoreIds.size || ""} store${p.selectedStoreIds.size === 1 ? "" : "s"}`}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
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
                className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
              />
            )}
            <p className="text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">
              Connected stores
            </p>
          </div>
          {storeOptions.length === 0 && (
            <p className="text-[11px] text-inventory-text-subtle">No connected stores.</p>
          )}
          {storeOptions.map((store) => (
            <label
              key={store.storeId}
              className="flex cursor-pointer items-start gap-2 rounded-[6px] px-2 py-1 hover:bg-inventory-surface-hover"
            >
              <input
                type="checkbox"
                checked={p.selectedStoreIds.has(store.storeId)}
                onChange={() => p.toggleStore(store.storeId)}
                className="mt-0.5 h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
              />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium leading-tight text-inventory-text">
                  {store.storeName}
                </span>
                <span className="block truncate text-[10px] text-inventory-text-subtle">
                  {store.listingStatus.replace("_", " ")}
                </span>
              </span>
            </label>
          ))}
        </aside>

        <div className="min-w-0 space-y-3">
          <section className="rounded-xl border border-inventory-border p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">
              Current product (hub source)
            </p>
            <div className="flex gap-2">
              {product.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.images[0].url}
                  alt={product.images[0].altText ?? product.name}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-inventory-text">
                  {product.name}
                </p>
                <p className="text-[11px] text-inventory-text-subtle">
                  {product.brand} · {product.category} ·{" "}
                  {product.variants.length} variant
                  {product.variants.length === 1 ? "" : "s"} ·{" "}
                  {productStatusLabel(product.status)}
                  {product.status === "DRAFT"
                    ? " (will publish as draft — hidden from storefront)"
                    : product.status === "UNLISTED"
                    ? " (will publish, accessible only by direct link)"
                    : ""}
                </p>
                <p className="text-[11px] text-inventory-text-subtle">
                  Handle: <span className="font-mono">{product.handle}</span> ·
                  Sizes: {product.sizes.join(", ") || "—"} · Colours:{" "}
                  {product.colours.map((c) => c.name).join(", ") || "—"}
                </p>
                {product.description && (
                  <div
                    className="mt-1 line-clamp-2 break-words text-[11px] text-inventory-text-subtle"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(product.description),
                    }}
                  />
                )}
              </div>
            </div>
            <p className="mt-1.5 text-[10px] leading-snug text-inventory-text-subtle">
              Edit each store&apos;s copy below — title, description, media,
              type, category, collections, status, handle (read-only), brand,
              SKU, sizes, colours, stock matrix, per-store AUD price and selling
              tags. Cost always comes from the hub; each store&apos;s available
              stock defaults to an even split of hub stock (or its own live
              quantity if already published) and can be adjusted per store.
            </p>
          </section>

          <NoVariantsWarningBanner storeNames={noVariantsStores.map((s) => s.storeName)} />
          {p.stockWarnings.length > 0 && <StockWarningBanner warnings={p.stockWarnings} />}

          {selectedStores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-inventory-border p-6 text-center text-[11px] text-inventory-text-subtle">
              Select at least one store to edit its listing and publish.
            </p>
          ) : (
            selectedStores.map((store, i) => (
              <div key={store.storeId} className="space-y-3">
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
