'use client';

import { useContext } from 'react';
import { DenseFieldsContext, FieldLabel } from './ProductFieldRows';
import ProductStatusSelect from './ProductStatusSelect';
import type { useProductDetails } from './hooks/useProductDetails';

const FIELD_VISUAL_CLASS =
  'h-[24px] rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring';

type ProductMiscFieldsProps = {
  details: ReturnType<typeof useProductDetails>;
  /** Product Remark, folded into this row (non-embedded Product details panel only) to save a
   * row's worth of height — see ProductFieldsPanel. Omitted (wizard) leaves the row as PO
   * Quantity / Status / Verified alone, unchanged. */
  remark?: React.ReactNode;
};

/** PO Quantity / Status / Verified trio — split out of ProductFieldsPanel to keep that file under
 * the component size budget. Not embedded elsewhere; purely a size-budget split. */
export default function ProductMiscFields({ details: d, remark }: ProductMiscFieldsProps) {
  const dense = useContext(DenseFieldsContext);
  return (
    <div className={`col-span-2 grid gap-x-[7px] ${remark ? 'grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto_minmax(0,1.8fr)]' : 'grid-cols-3'}`}>
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
        <label
          className={`inline-flex h-[24px] max-w-full cursor-pointer items-center gap-[5px] whitespace-nowrap text-[11px] font-medium leading-none text-inventory-text-muted ${dense ? FIELD_VISUAL_CLASS : ''}`}
          aria-label="Verified"
        >
          <input
            type="checkbox"
            checked={d.form.verified}
            onChange={(e) => d.setVerified(e.target.checked)}
            className="h-3 w-3 cursor-pointer accent-inventory-primary"
          />
          <span className="cursor-pointer select-none">Verified</span>
        </label>
      </div>
      {remark && <div className="min-w-0">{remark}</div>}
    </div>
  );
}
