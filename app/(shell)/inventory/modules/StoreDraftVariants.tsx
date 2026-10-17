'use client';

import { useEffect, useMemo, useRef } from 'react';
import StoreDiffVariantImagePicker from './StoreDiffVariantImagePicker';
import type { ProductRecord } from './types';
import type { StoreDraft } from './hooks/useStorePublish';
import { sortVariantsForDisplay } from './utils';

type StoreDraftVariantsProps = {
  storeName: string;
  product: ProductRecord;
  draft: StoreDraft;
  /** hubVariantId -> Available default when the admin hasn't typed an override — see
   * `defaultStock` in storeDraft.ts. */
  defaultStock: Record<string, number>;
  showPricing: boolean;
  showVariants: boolean;
  /** Only true when both the Images and Variants aspects are shown — Shopify requires a
   * variant's assigned file to also appear in the product-level files input, so assigning one
   * without pushing images along would be a silent no-op. */
  showVariantImages: boolean;
  toggleVariant: (variantId: string) => void;
  setExcludedVariants: (variantIds: string[]) => void;
  setPrice: (variantId: string, value: string) => void;
  setSku: (variantId: string, value: string) => void;
  setBarcode: (variantId: string, value: string) => void;
  setStock: (variantId: string, value: string) => void;
  setVariantImage: (variantId: string, imageId: string | null) => void;
};

/** Variants / stock matrix — Include (with a select-all header checkbox), SKU/barcode overrides,
 * this store's editable available stock (defaulting to the hub's full available quantity, same
 * for every store), and this store's own ex-tax price. Cost always comes from the hub. */
export default function StoreDraftVariants({
  storeName,
  product,
  draft,
  defaultStock,
  showPricing,
  showVariants,
  showVariantImages,
  toggleVariant,
  setExcludedVariants,
  setPrice,
  setSku,
  setBarcode,
  setStock,
  setVariantImage,
}: StoreDraftVariantsProps) {
  const availableImages = draft.images.filter((img) => !draft.excludedImages.includes(img.id));
  // Colour A->Z, then the product's own declared size order — matches the product page's own
  // variants matrix (see sortVariantsForDisplay) instead of raw creation-order.
  const sortedVariants = useMemo(() => sortVariantsForDisplay(product.variants, product.sizes), [product.variants, product.sizes]);
  const allIncluded = product.variants.every((v) => !draft.excludedVariants.includes(v.id));
  const someIncluded = !allIncluded && product.variants.some((v) => !draft.excludedVariants.includes(v.id));
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckboxRef.current) headerCheckboxRef.current.indeterminate = someIncluded;
  }, [someIncluded]);

  return (
    <div className="mb-1">
      <p className="mb-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">
        Variants / stock matrix {showPricing ? '(Price AUD ex-tax)' : ''}
      </p>
      <div className="overflow-x-auto thin-scroll rounded-lg border border-inventory-border">
        <table className="w-full min-w-[560px] text-[11px] leading-none">
          <thead>
            <tr className="border-b border-inventory-border bg-inventory-surface-muted">
              {showVariants && (
                <th className="w-20 px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">
                  <span className="flex items-center gap-1.5">
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      checked={allIncluded}
                      onChange={() => setExcludedVariants(allIncluded ? product.variants.map((v) => v.id) : [])}
                      aria-label={`Include all variants for ${storeName}`}
                      title="Include all variants"
                      className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
                    />
                    Include
                  </span>
                </th>
              )}
              <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Variant</th>
              {showVariants && (
                <>
                  <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">SKU</th>
                  <th className="px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Barcode</th>
                  <th className="px-2 py-1 text-right text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Available</th>
                </>
              )}
              {showVariantImages && <th className="w-40 px-2 py-1 text-left text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Image</th>}
              {showPricing && <th className="w-28 px-2 py-1 text-right text-[10px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Price (AUD)</th>}
            </tr>
          </thead>
          <tbody>
            {sortedVariants.map((v) => {
              const excluded = showVariants && draft.excludedVariants.includes(v.id);
              return (
                <tr key={v.id} className={`border-b border-inventory-divider last:border-0 transition-colors duration-150 hover:bg-inventory-surface-hover ${excluded ? 'opacity-50' : ''}`}>
                  {showVariants && (
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={!draft.excludedVariants.includes(v.id)}
                        onChange={() => toggleVariant(v.id)}
                        aria-label={`Include ${v.colour} / ${v.size} for ${storeName}`}
                        className="h-3 w-3 rounded border-inventory-border-strong text-inventory-secondary cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-2 py-1 text-[11px] font-medium text-inventory-text">
                    {v.colour} / {v.size}
                    <span className="block text-[10px] font-normal text-inventory-text-subtle">Sizes: {v.size} · Colours: {v.colour}</span>
                  </td>
                  {showVariants && (
                    <>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={draft.variantSku[v.id] ?? v.sku ?? ''}
                          onChange={(e) => setSku(v.id, e.target.value)}
                          aria-label={`SKU for ${v.colour} / ${v.size} at ${storeName}`}
                          className="h-[22px] w-28 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={draft.variantBarcode[v.id] ?? v.barcode ?? ''}
                          onChange={(e) => setBarcode(v.id, e.target.value)}
                          aria-label={`Barcode for ${v.colour} / ${v.size} at ${storeName}`}
                          className="h-[22px] w-28 rounded-[6px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={draft.variantStock[v.id] ?? String(defaultStock[v.id] ?? 0)}
                          onChange={(e) => setStock(v.id, e.target.value)}
                          aria-label={`Available stock for ${v.colour} / ${v.size} at ${storeName}`}
                          className="h-[22px] w-20 rounded-[6px] border border-inventory-border-strong pl-[6px] pr-[10px] text-right text-[11px] leading-none tabular-nums outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                        />
                        <span className="ml-1 text-[10px] text-inventory-text-subtle">/ {Math.max(0, v.stockOnHand - v.allocated)}</span>
                      </td>
                    </>
                  )}
                  {showVariantImages && (
                    <td className="px-2 py-1">
                      <StoreDiffVariantImagePicker
                        variantLabel={`${v.colour} / ${v.size}`}
                        storeName={storeName}
                        images={availableImages}
                        selectedImageId={draft.variantImages[v.id] ?? null}
                        onChange={(imageId) => setVariantImage(v.id, imageId)}
                      />
                    </td>
                  )}
                  {showPricing && (
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={draft.variantPrices[v.id] ?? String(v.sellPrice)}
                        onChange={(e) => setPrice(v.id, e.target.value)}
                        aria-label={`Price for ${v.colour} / ${v.size} at ${storeName}`}
                        className="h-[22px] w-24 rounded-[6px] border border-inventory-border-strong pl-[6px] pr-[10px] text-right text-[11px] leading-none tabular-nums outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                      />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
