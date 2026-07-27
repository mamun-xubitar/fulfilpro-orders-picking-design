'use client';

import { getShopifyThumbnailUrl } from '../../modules/utils';
import { useProductGallery } from './hooks/useProductGallery';
import GalleryThumbRail from './GalleryThumbRail';
import GallerySizeBreakdown from './GallerySizeBreakdown';
import GalleryLightbox from './GalleryLightbox';
import type { ProductDetail } from './types';

type ProductGalleryProps = {
  product: ProductDetail;
};

export default function ProductGallery({ product }: ProductGalleryProps) {
  const gallery = useProductGallery(product);
  const { entries, active, breakdown, activeKey, setActiveKey, lightboxOpen, openLightbox, closeLightbox, step } = gallery;

  const heading = active ? (active.kind === 'color' ? active.label : 'All colors') : 'All colors';

  return (
    <div className="flex gap-3">
      {entries.length > 0 && (
        <GalleryThumbRail entries={entries} activeKey={activeKey ?? active?.key} onSelect={setActiveKey} />
      )}

      <div className="flex-1 min-w-0">
        <div
          className="aspect-square rounded-xl bg-gray-100 border border-gray-200 overflow-hidden cursor-pointer flex items-center justify-center"
          onClick={() => active && openLightbox()}
        >
          {active ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getShopifyThumbnailUrl(active.url, 600)} alt={active.altText ?? product.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400">No image</span>
          )}
        </div>

        {/* <GallerySizeBreakdown heading={heading} breakdown={breakdown} /> */}
      </div>

      {lightboxOpen && active && (
        <GalleryLightbox
          entries={entries}
          active={active}
          activeKey={activeKey ?? active?.key}
          onSelect={setActiveKey}
          breakdown={breakdown}
          heading={heading}
          title={product.title}
          onClose={closeLightbox}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />
      )}
    </div>
  );
}
