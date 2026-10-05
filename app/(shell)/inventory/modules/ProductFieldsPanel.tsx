'use client';

import { useState } from 'react';
import ColourSizeModal from './colourSize/ColourSizeModal';
import CategoryPicker from './CategoryPicker';
import HubCategoryPicker from './HubCategoryPicker';
import { useInventoryAccess } from './InventoryAccess';
import { PANEL_MAX_H, PanelHeading, panelBorderClass } from './MainImagePanel';
import { ActionButton } from './PricingMarginPanel';
import ProductIdentityFields from './ProductIdentityFields';
import ProductMiscFields from './ProductMiscFields';
import ProductOptionsRow from './ProductOptionsRow';
import { DenseFieldsContext, TextField } from './ProductFieldRows';
import DescriptionField from './DescriptionField';
import SupplierMultiSelect from './SupplierMultiSelect';
import { Check, Document } from './icons';
import type { useProductDetails } from './hooks/useProductDetails';
import type { useSuppliers } from './hooks/useSuppliers';
import type { OptionLibraryState } from './hooks/useOptionLibrary';
import type { InventoryCategoriesState } from './hooks/useInventoryCategories';
import { useItemNoAvailability } from './hooks/useItemNoAvailability';
import type { ProductRecord, SupplierOption } from './types';

type ProductFieldsPanelProps = {
  details: ReturnType<typeof useProductDetails>;
  supplierOptions: SupplierOption[];
  optionLibrary: OptionLibraryState;
  inventoryCategories: InventoryCategoriesState;
  suppliers: ReturnType<typeof useSuppliers>;
  /** The Colour & size adjustment modal (opened from the Sizes/Colours "+" buttons) needs the
   * full product record and a way to hand its result back to the page. */
  product: ProductRecord | null;
  onOptionsApplied: (product: ProductRecord) => void;
  /** For the New Product wizard's Details step — hides the panel chrome (heading, Save row)
   * since the wizard's own footer drives saving and advancing. */
  embedded?: boolean;
};

/** Always editable — every field is a live input; Save is the only action, disabled until the
 * draft differs from what's saved (see useProductDetails' `dirty`). Two-column field grid
 * (design 6), with Shopify Category and the hub Category paired side by side in one row. */
export default function ProductFieldsPanel({ details: d, supplierOptions, optionLibrary, inventoryCategories, suppliers, product, onOptionsApplied, embedded }: ProductFieldsPanelProps) {
  const itemNoAvailability = useItemNoAvailability(d.form.itemNo, d.productId ?? undefined);
  const [colourSizeOpen, setColourSizeOpen] = useState(false);
  // Read-only for non-admins: the wizard (embedded) is admin-only, so it never hits this.
  const { canEdit } = useInventoryAccess();
  const readOnly = !embedded && !canEdit;

  return (
    <section className={embedded ? 'flex min-w-0 flex-col' : `flex min-w-0 flex-col rounded-[10px] border ${panelBorderClass('details')} bg-inventory-surface shadow-inventory ${PANEL_MAX_H}`}>
      {!embedded && (
        <PanelHeading
          tone="details"
          icon={<Document className="h-3 w-3" />}
          title="Product details"
          action={readOnly ? undefined : <ActionButton onClick={() => d.saveDetails()} icon={<Check className="h-2.5 w-2.5" />} label="Save" primary disabled={!d.dirty} compact />}
        />
      )}

      <DenseFieldsContext.Provider value={!embedded}>
        {/* `relative` lives on this non-scrolling outer wrapper (not the scrolling body below) so
         * the expanded Description editor (Move 5) can grow past the scroll body's own
         * `overflow-y-auto` — it's positioned against this element, not the viewport, a scroll
         * ancestor, or a clipping one. */}
        <div className={embedded ? 'flex flex-1 flex-col' : 'relative flex flex-1 flex-col min-h-0'}>
          <div className={embedded ? 'flex flex-1 flex-col gap-[4px]' : 'flex flex-1 flex-col gap-[4px] p-[6px] min-h-0 overflow-y-auto thin-scroll'}>
            <fieldset disabled={readOnly} className="m-0 grid min-w-0 grid-cols-2 gap-x-[7px] gap-y-[3px] border-0 p-0">
              <ProductIdentityFields details={d} itemNoAvailability={itemNoAvailability} />

              <TextField label="Product name" value={d.form.name} onChange={d.setName} />
              <TextField label="SKU" value={d.form.sku} onChange={d.set('sku')} />

              <TextField label="Brand" value={d.form.brand} onChange={d.set('brand')} />
              <SupplierMultiSelect
                suppliers={supplierOptions}
                selectedIds={d.form.supplierIds}
                onChange={d.setSupplierIds}
                error={d.errors?.supplierId}
                onCreateSupplier={(name) =>
                  suppliers.openCreate({ name, onCreated: (s) => d.setSupplierIds([...d.form.supplierIds, s.id]) })
                }
                onAddSupplier={() =>
                  suppliers.openCreate({ onCreated: (s) => d.setSupplierIds([...d.form.supplierIds, s.id]) })
                }
              />

              <CategoryPicker value={{ id: d.form.categoryId, name: d.form.category }} onChange={d.setCategory} />
              <HubCategoryPicker
                value={{ id: d.form.inventoryCategoryId, name: d.form.inventoryCategoryName }}
                onChange={d.setInventoryCategory}
                categories={inventoryCategories}
              />

              <ProductOptionsRow
                sizes={d.sizes}
                colours={d.colours}
                sizesError={d.errors?.sizes}
                coloursError={d.errors?.colours}
                onEdit={() => setColourSizeOpen(true)}
              />

              {/* Non-embedded: Remark folds into the PO Qty/Status/Verified row to save a row's
               * worth of height. Embedded (wizard): stays on its own row, unchanged. */}
              {embedded ? (
                <>
                  <ProductMiscFields details={d} />
                  <div className="col-span-2">
                    <TextField label="Product Remark" value={d.form.productRemark} onChange={d.set('productRemark')} placeholder="Add remarks…" />
                  </div>
                </>
              ) : (
                <ProductMiscFields
                  details={d}
                  remark={<TextField label="Product Remark" value={d.form.productRemark} onChange={d.set('productRemark')} placeholder="Add remarks…" />}
                />
              )}

              <div className="col-span-2">
                <DescriptionField details={d} compact={!embedded} />
              </div>
            </fieldset>
          </div>
        </div>
      </DenseFieldsContext.Provider>

      {colourSizeOpen && product && (
        <ColourSizeModal
          product={product}
          optionLibrary={optionLibrary}
          onApplied={onOptionsApplied}
          onClose={() => setColourSizeOpen(false)}
        />
      )}
    </section>
  );
}

/** Always shown, whichever way it goes — red for unverified so an unreviewed record reads as
 * a warning rather than fading into "no badge at all". */
export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center rounded-full border border-inventory-secondary/30 bg-inventory-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-inventory-secondary">
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-inventory-danger/30 bg-inventory-danger/10 px-2 py-0.5 text-[11px] font-semibold text-inventory-danger-hover">
      Unverified
    </span>
  );
}
