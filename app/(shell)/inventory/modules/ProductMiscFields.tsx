'use client';

import { FieldLabel } from './ProductFieldRows';
import ProductStatusSelect from './ProductStatusSelect';
import type { useProductDetails } from './hooks/useProductDetails';

const FIELD_VISUAL_CLASS =
  'h-[24px] rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

type ProductMiscFieldsProps = { details: ReturnType<typeof useProductDetails> };

/** PO Quantity / Status / Verified trio — split out of ProductFieldsPanel to keep that file under
 * the component size budget. Not embedded elsewhere; purely a size-budget split. */
export default function ProductMiscFields({ details: d }: ProductMiscFieldsProps) {
  return (
    <div className="col-span-2 grid grid-cols-3 gap-x-[7px]">
      <div className="min-w-0">
        <FieldLabel>PO Quantity</FieldLabel>
        <input
          type="number"
          min={1}
          value={d.form.poQuantity}
          onChange={d.set('poQuantity')}
          aria-label="PO Quantity"
          title="Default quantity seeded onto every variant when creating a purchase order"
          className={FIELD_VISUAL_CLASS + ' w-full'}
        />
        {d.errors?.poQuantity && <p className="mt-[2px] text-[10px] leading-tight text-inventory-danger">{d.errors.poQuantity}</p>}
      </div>
      <div className="min-w-0">
        <FieldLabel>Status</FieldLabel>
        <ProductStatusSelect value={d.form.status} onChange={d.setStatus} className={FIELD_VISUAL_CLASS} />
      </div>
      <div className="min-w-0">
        <FieldLabel>Verified</FieldLabel>
        <label className="inline-flex h-[24px] max-w-full cursor-pointer items-center gap-[5px] text-[11px] font-medium leading-none text-inventory-text-muted" aria-label="Verified">
          <input
            type="checkbox"
            checked={d.form.verified}
            onChange={(e) => d.setVerified(e.target.checked)}
            className="h-3 w-3 cursor-pointer accent-inventory-primary"
          />
          <span className="cursor-pointer select-none">Verified</span>
        </label>
      </div>
    </div>
  );
}
