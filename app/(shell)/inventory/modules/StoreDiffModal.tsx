'use client';

import { ModalShell } from '@/components/ModalShell';
import AiDescriptionField from './AiDescriptionField';
import CategoryPicker from './CategoryPicker';
import ClampedHtml from './ClampedHtml';
import ProductStatusSelect from './ProductStatusSelect';
import StoreDiffFieldRow, { StoreValuePreview } from './StoreDiffFieldRow';
import StoreActionConfirmDialog from './StoreActionConfirmDialog';
import StoreDiffImagesSection from './StoreDiffImagesSection';
import StoreImagePickerModal from './StoreImagePickerModal';
import StoreImageUploadModal from './StoreImageUploadModal';
import StoreDiffVariantsSummary from './StoreDiffVariantsSummary';
import StoreDiffVariantsTable from './StoreDiffVariantsTable';
import { useStoreDiff } from './hooks/useStoreDiff';
import type { StoreListingsState } from './hooks/useStoreListings';
import type { ProductRecord, ProductStatusValue, StoreListingResult } from './types';

type StoreDiffModalProps = {
  product: ProductRecord;
  listing: StoreListingResult;
  storeListings: StoreListingsState;
  onClose: () => void;
};

/**
 * Item 4's differences modal — every field where the hub product and this store's live Shopify
 * listing disagree, grouped and colour-coded (StoreDiffFieldRow / StoreDiffVariantsTable), each
 * individually editable with its own Save button. Opened from the store card's Differences badge
 * (OnlineStoresPanel). The modal stays open after a save so several fields can be fixed in one
 * visit — see useStoreDiff's doc comment.
 */
export default function StoreDiffModal({ product, listing, storeListings, onClose }: StoreDiffModalProps) {
  const d = useStoreDiff({ product, listing, storeListings });

  // Nothing to show only when the product isn't on the store at all; an in-sync listing still opens
  // so its images and variants can be edited directly.
  if (!listing.found) {
    return (
      <ModalShell title={`${listing.storeName} — Not published`} onClose={onClose} compact>
        <div className="p-6 text-center">
          <p className="text-[12px] text-inventory-text-muted">This product is not on the store yet.</p>
        </div>
      </ModalShell>
    );
  }

  return (
    <>
    <ModalShell
      title={d.diff.total === 0 ? `${listing.storeName} — In sync` : `${listing.storeName} — ${d.diff.total} difference${d.diff.total === 1 ? '' : 's'}`}
      onClose={onClose}
      extraWide
      compact
      disableBackdropClose
      footer={
        d.confirmOpen ? (
          <ConfirmVariantsSave onCancel={d.cancelConfirm} onConfirm={d.confirmSave} saving={d.savingKey === 'variants' || d.savingKey === 'all'} />
        ) : (
          <div className="flex w-full items-center justify-end">
            <button
              type="button"
              onClick={d.saveAll}
              disabled={d.savingKey !== null}
              className="flex h-[28px] items-center justify-center rounded-[7px] bg-inventory-primary px-[14px] text-[11px] font-bold text-white transition-colors duration-150 hover:bg-inventory-primary-hover disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {d.savingKey === 'all' ? 'Saving…' : 'Save all differences'}
            </button>
          </div>
        )
      }
    >
      <div className="space-y-[10px] p-[10px]">
        {d.diff.total === 0 && (
          <p className="rounded-[8px] border border-inventory-success/35 bg-inventory-success/[8%] px-[8px] py-[6px] text-[11px] text-inventory-success-hover">
            Every field matches the system product. You can still edit images and variants directly below.
          </p>
        )}
        {d.diff.fields.length > 0 && (
          <section className="space-y-[6px]">
            <h4 className="text-[9.5px] font-bold uppercase tracking-[0.4px] text-inventory-text-subtle">Product details</h4>
            {d.diff.fields.map((f) => (
              <StoreDiffFieldRow
                key={f.key}
                tone="details"
                label={f.label}
                preview={
                  f.key === 'description' ? (
                    <div className="max-h-[80px] overflow-y-auto thin-scroll rounded-[6px] border border-inventory-border bg-inventory-surface-muted/60 p-[4px]">
                      {/* No `opacity` here — ClampedHtml's "See more" modal renders inline (not
                          via a portal), so an ancestor's opacity would wash the modal out too. */}
                      <ClampedHtml html={f.storeValue} title={`${listing.storeName} — Description`} />
                    </div>
                  ) : (
                    <StoreValuePreview value={f.storeValue} />
                  )
                }
                onSave={() => d.saveField(f.key)}
                saving={d.savingKey === `field:${f.key}`}
              >
                {f.key === 'description' ? (
                  <AiDescriptionField
                    hideLabel
                    value={d.edits.description ?? f.systemValue}
                    onChange={(html) => d.setEdit('description', html)}
                    subjectKey={listing.storeId}
                    buildRequestData={() => ({
                      productId: product.id,
                      name: d.edits.title || product.name,
                      brand: d.edits.vendor || product.brand,
                      category: d.categoryValue.name || product.category,
                      productRemark: product.productRemark,
                      sizes: product.sizes,
                      colours: product.colours,
                    })}
                  />
                ) : f.key === 'status' ? (
                  <ProductStatusSelect
                    value={(d.edits.status ?? f.systemValue) as ProductStatusValue}
                    onChange={(status) => d.setEdit('status', status)}
                    className="h-[24px] w-full rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring"
                  />
                ) : f.key === 'category' ? (
                  <CategoryPicker hideLabel value={d.categoryValue} onChange={d.setCategory} />
                ) : (
                  <input
                    type="text"
                    value={d.edits[f.key] ?? f.systemValue}
                    onChange={(e) => d.setEdit(f.key, e.target.value)}
                    className="h-[24px] w-full rounded-[6px] border border-inventory-border-strong bg-inventory-surface px-[6px] text-[11px] leading-snug outline-none focus:ring-2"
                  />
                )}
              </StoreDiffFieldRow>
            ))}
          </section>
        )}

        <section className="space-y-[6px]">
          <StoreDiffImagesSection product={product} listing={d.liveListing} rows={d.diff.rows} actions={d.images} savingKey={d.savingKey} />
        </section>

        {d.diff.rows.length > 0 && (
          <section className="space-y-[6px]">
            <StoreDiffVariantsTable
              rows={d.diff.rows}
              systemImages={product.images}
              storeImages={listing.images}
              stockDefaults={d.stockDefaults}
              actions={d.variantActions}
              savingKey={d.savingKey}
              onSave={d.saveVariants}
              saving={d.savingKey === 'variants'}
            />
            <StoreDiffVariantsSummary rows={d.diff.rows} />
          </section>
        )}
      </div>
    </ModalShell>
    {d.images.picker?.mode === 'add' && (
      <StoreImagePickerModal
        systemImages={product.images}
        saving={d.savingKey === 'images:add'}
        onSubmit={d.images.submitAdd}
        onClose={d.images.closePicker}
      />
    )}
    {d.images.picker?.mode === 'upload' && (
      <StoreImageUploadModal image={d.images.picker.image} saving={false} onSubmit={d.images.submitUpload} onClose={d.images.closePicker} />
    )}
    <StoreActionConfirmDialog confirm={d.confirm} />
    </>
  );
}

function ConfirmVariantsSave({ onCancel, onConfirm, saving }: { onCancel: () => void; onConfirm: () => void; saving: boolean }) {
  return (
    <div className="flex w-full flex-col gap-[6px] rounded-[8px] border border-inventory-warning/35 bg-inventory-warning/10 p-[8px]">
      <p className="text-[11px] leading-snug text-inventory-warning-ink">
        Saving variants pushes the system&apos;s full variant list to this store — any Shopify variant that isn&apos;t on the system product will be removed, not just the rows that disagree above.
      </p>
      <div className="flex flex-wrap justify-end gap-[6px]">
        <button type="button" onClick={onCancel} disabled={saving} className="flex h-[24px] items-center rounded-[6px] border border-inventory-border-strong px-[10px] text-[10px] font-bold text-inventory-text-muted hover:bg-inventory-surface-hover disabled:opacity-50 cursor-pointer">
          Cancel
        </button>
        <button type="button" onClick={onConfirm} disabled={saving} className="flex h-[24px] items-center rounded-[6px] bg-inventory-warning px-[10px] text-[10px] font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving…' : 'Confirm save'}
        </button>
      </div>
    </div>
  );
}
