'use client';

type StoreDraftVariantImageProps = {
  variantLabel: string;
  storeName: string;
  images: { id: string; url: string; altText: string | null }[];
  selectedImageId: string | null;
  onChange: (imageId: string | null) => void;
};

/** One variant's image picker in the publish/bulk-update variant matrix — a thumbnail plus a
 * dropdown over this store's own draft media (excluded images already filtered out by the
 * caller), Shopify-style: at most one image per variant, an image may be shared across several.
 * Draft-local like every other field in this table — never touches the hub. */
export default function StoreDraftVariantImage({ variantLabel, storeName, images, selectedImageId, onChange }: StoreDraftVariantImageProps) {
  const selected = selectedImageId ? images.find((img) => img.id === selectedImageId) : undefined;

  return (
    <div className="flex items-center gap-1.5">
      {selected ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={selected.url} alt={selected.altText ?? ''} className="h-8 w-8 shrink-0 rounded object-cover" />
      ) : (
        <div className="h-8 w-8 shrink-0 rounded border border-dashed border-gray-300" />
      )}
      <select
        value={selectedImageId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={images.length === 0}
        aria-label={`Image for ${variantLabel} at ${storeName}`}
        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-1.5 py-1 text-[12px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">{images.length === 0 ? 'No images' : '— none —'}</option>
        {images.map((img) => (
          <option key={img.id} value={img.id}>
            {img.altText || img.url.split('/').pop() || img.id}
          </option>
        ))}
      </select>
    </div>
  );
}
