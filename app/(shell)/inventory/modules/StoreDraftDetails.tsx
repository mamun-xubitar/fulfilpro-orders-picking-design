'use client';

import AiDescriptionField from './AiDescriptionField';
import CategoryPicker from './CategoryPicker';
import CollectionsPicker from './CollectionsPicker';
import ProductStatusSelect from './ProductStatusSelect';
import ProductTypePicker from './ProductTypePicker';
import TagsPicker from './TagsPicker';
import VendorPicker from './VendorPicker';
import { TextField } from './StoreDraftFields';
import type { ProductRecord } from './types';
import type { StoreDraft } from './hooks/useStorePublish';

type StoreDraftDetailsProps = {
  storeId: string;
  product: ProductRecord;
  draft: StoreDraft;
  set: (field: Partial<StoreDraft>) => void;
  setField: (
    field: 'seoTitle' | 'seoDescription' | 'title'
  ) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
};

/** "Product details" + "Settings" — everything Shopify's own product-organization panel covers
 * (title, vendor, Type, Category, Collections) plus status/handle/tags/SEO. */
export default function StoreDraftDetails({ storeId, product, draft, set, setField }: StoreDraftDetailsProps) {
  return (
    <div className="mb-3 space-y-3">
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Product details</p>
        <div className="grid grid-cols-1 gap-x-[7px] gap-y-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label="Title (Product name)" value={draft.title} onChange={setField('title')} placeholder={product.name} />
          </div>
          <VendorPicker storeId={storeId} value={draft.vendor} onChange={(vendor) => set({ vendor })} />
          <ProductTypePicker storeId={storeId} value={draft.productType} onChange={(productType) => set({ productType })} />
          <div className="sm:col-span-2">
            <CategoryPicker value={draft.category} onChange={(category) => set({ category })} />
          </div>
          <div className="sm:col-span-2">
            <CollectionsPicker storeId={storeId} value={draft.collections} onChange={(collections) => set({ collections })} />
          </div>
        </div>
        <AiDescriptionField
          value={draft.description}
          onChange={(html) => set({ description: html })}
          subjectKey={storeId}
          buildRequestData={() => ({
            productId: product.id,
            name: draft.title || product.name,
            brand: draft.vendor || product.brand,
            category: draft.category.name || product.category,
            productRemark: product.productRemark,
            sizes: product.sizes,
            colours: product.colours,
          })}
        />
      </div>

      <div className="space-y-2 border-t border-inventory-divider pt-2">
        <p className="text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Settings</p>
        <div className="grid grid-cols-1 gap-x-[7px] gap-y-2 sm:grid-cols-2">
          <div>
            <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Status</label>
            <ProductStatusSelect
              value={draft.status}
              onChange={(status) => set({ status })}
              className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
            />
          </div>
          <div>
            <label className="mb-[2px] block text-[10px] font-bold uppercase leading-none tracking-[0.4px] text-inventory-text-subtle">Handle</label>
            <input
              type="text"
              value={product.handle}
              disabled
              title="Handle is hub-owned and cannot diverge per store"
              className="h-[24px] w-full cursor-not-allowed rounded-[7px] border border-inventory-border bg-inventory-surface-muted px-[6px] text-[11px] leading-none text-inventory-text-subtle"
            />
          </div>
          <TagsPicker storeId={storeId} value={draft.tags} onChange={(tags) => set({ tags })} />
          <TextField label="SEO title" value={draft.seoTitle} onChange={setField('seoTitle')} placeholder={draft.title || product.name} />
          <div className="sm:col-span-2">
            <TextField label="SEO description" value={draft.seoDescription} onChange={setField('seoDescription')} placeholder="Optional" />
          </div>
        </div>
      </div>
    </div>
  );
}
