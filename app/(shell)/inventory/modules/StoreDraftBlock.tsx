'use client';

import StoreDraftDetails from './StoreDraftDetails';
import StoreDraftMedia from './StoreDraftMedia';
import StoreDraftVariants from './StoreDraftVariants';
import type { ProductRecord } from './types';
import type { StoreDraft } from './hooks/useStorePublish';

type StoreDraftBlockProps = {
  storeId: string;
  storeName: string;
  storeDomain: string;
  listingStatus?: string;
  /** 1-based position among the currently selected stores, for the "Store n of m" header
   * counter that helps tell several stacked blocks apart. */
  index: number;
  total: number;
  product: ProductRecord;
  draft: StoreDraft;
  onChange: (next: StoreDraft) => void;
  /** hubVariantId -> the Available quantity to show/push when the admin hasn't typed an override
   * — this store's own live Shopify quantity (published) or an even split of the hub's available
   * stock across the currently-selected new stores (unpublished). See `defaultStock`. */
  defaultStock: Record<string, number>;
  /** Which field groups to show — the bulk-update modal only renders the checked aspects. */
  showImages: boolean;
  showDetails: boolean;
  showPricing: boolean;
  showVariants: boolean;
};

/**
 * One store's editable slice of a publish/bulk-update — bordered, with a sticky "Store n of m"
 * header, so several of these stacked in the bulk-update modal read as clearly separate store
 * targets. Every Shopify-mapped field is editable here (title, description, vendor, type,
 * category, collections, status, tags, SEO, images incl. per-variant assignment, SKU/barcode,
 * per-store AUD price, per-store available stock); cost stays read-only from the hub.
 */
export default function StoreDraftBlock({
  storeId,
  storeName,
  storeDomain,
  listingStatus,
  index,
  total,
  product,
  draft,
  onChange,
  defaultStock,
  showImages,
  showDetails,
  showPricing,
  showVariants,
}: StoreDraftBlockProps) {
  const set = (field: Partial<StoreDraft>) => onChange({ ...draft, ...field });
  const setField = (field: 'seoTitle' | 'seoDescription' | 'title') => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => onChange({ ...draft, [field]: e.target.value });

  const setPrice = (variantId: string, value: string) =>
    onChange({
      ...draft,
      variantPrices: { ...draft.variantPrices, [variantId]: value },
      variantPricesEdited: draft.variantPricesEdited.includes(variantId)
        ? draft.variantPricesEdited
        : [...draft.variantPricesEdited, variantId],
    });
  const setSku = (variantId: string, value: string) => onChange({ ...draft, variantSku: { ...draft.variantSku, [variantId]: value } });
  const setBarcode = (variantId: string, value: string) =>
    onChange({ ...draft, variantBarcode: { ...draft.variantBarcode, [variantId]: value } });
  const setStock = (variantId: string, value: string) =>
    onChange({ ...draft, variantStock: { ...draft.variantStock, [variantId]: value } });

  const toggleVariant = (variantId: string) => {
    const excluded = draft.excludedVariants.includes(variantId)
      ? draft.excludedVariants.filter((id) => id !== variantId)
      : [...draft.excludedVariants, variantId];
    onChange({ ...draft, excludedVariants: excluded });
  };
  const setExcludedVariants = (variantIds: string[]) => onChange({ ...draft, excludedVariants: variantIds });

  // Clears any variant currently pointing at `imageId` — used whenever that image stops being
  // a valid choice (removed, or excluded from this store's push), so a variant's picker never
  // holds a stale selection.
  const clearVariantImage = (imageId: string) =>
    Object.fromEntries(Object.entries(draft.variantImages).map(([variantId, id]) => [variantId, id === imageId ? null : id]));

  const toggleImage = (imageId: string) => {
    const nowExcluded = !draft.excludedImages.includes(imageId);
    const excluded = nowExcluded ? [...draft.excludedImages, imageId] : draft.excludedImages.filter((id) => id !== imageId);
    onChange({ ...draft, excludedImages: excluded, variantImages: nowExcluded ? clearVariantImage(imageId) : draft.variantImages });
  };
  const setAlt = (imageId: string, value: string) => onChange({ ...draft, imageAlts: { ...draft.imageAlts, [imageId]: value } });

  const addImages = (images: { id: string; url: string; altText: string | null }[]) =>
    onChange({ ...draft, images: [...draft.images, ...images] });

  const removeImage = (imageId: string) =>
    onChange({
      ...draft,
      images: draft.images.filter((img) => img.id !== imageId),
      excludedImages: draft.excludedImages.filter((id) => id !== imageId),
      imageAlts: Object.fromEntries(Object.entries(draft.imageAlts).filter(([id]) => id !== imageId)),
      variantImages: clearVariantImage(imageId),
    });

  // Shopify-style: an image is assigned per colour, not per variant — changing one row's image
  // changes it for every variant that shares its colour, mirroring how the hub's own
  // EditImagesModal (and updateImageColour) fans an assignment out.
  const setVariantImage = (variantId: string, imageId: string | null) => {
    const target = product.variants.find((v) => v.id === variantId);
    if (!target) return;
    const colourKey = target.colour.toLowerCase();
    const groupIds = product.variants.filter((v) => v.colour.toLowerCase() === colourKey).map((v) => v.id);
    onChange({
      ...draft,
      variantImages: { ...draft.variantImages, ...Object.fromEntries(groupIds.map((id) => [id, imageId])) },
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border-2 border-gray-300 bg-white shadow-sm">
      <div className="sticky top-0 z-10 flex items-baseline justify-between gap-2 border-b border-gray-200 bg-gray-50/95 px-3 py-1.5 backdrop-blur">
        <span className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold text-gray-400">
            Store {index} of {total}
          </span>
          <h4 className="text-[12px] font-semibold text-gray-900">{storeName}</h4>
        </span>
        <span className="flex items-center gap-2 text-[10px] text-gray-400">
          {listingStatus && <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-semibold uppercase">{listingStatus.replace('_', ' ')}</span>}
          <span className="truncate">{storeDomain}</span>
        </span>
      </div>

      <div className="p-3">
        {showDetails && <StoreDraftDetails storeId={storeId} product={product} draft={draft} set={set} setField={setField} />}

        {showImages && (
          <StoreDraftMedia productId={product.id} draft={draft} toggleImage={toggleImage} setAlt={setAlt} addImages={addImages} removeImage={removeImage} />
        )}

        {(showPricing || showVariants) && (
          <StoreDraftVariants
            storeName={storeName}
            product={product}
            draft={draft}
            defaultStock={defaultStock}
            showPricing={showPricing}
            showVariants={showVariants}
            showVariantImages={showImages && showVariants}
            toggleVariant={toggleVariant}
            setExcludedVariants={setExcludedVariants}
            setPrice={setPrice}
            setSku={setSku}
            setBarcode={setBarcode}
            setStock={setStock}
            setVariantImage={setVariantImage}
          />
        )}

        {!showDetails && !showPricing && !showVariants && !showImages && (
          <p className="text-[11px] text-gray-400">Select what to update above — nothing will be touched on {storeName}.</p>
        )}
      </div>
    </div>
  );
}
