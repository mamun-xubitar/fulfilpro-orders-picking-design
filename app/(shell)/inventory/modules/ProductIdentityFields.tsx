'use client';

import { FieldLabel, TextField } from './ProductFieldRows';
import { Lock, Unlock } from './icons';
import type { useProductDetails } from './hooks/useProductDetails';
import type { useItemNoAvailability } from './hooks/useItemNoAvailability';

type ProductIdentityFieldsProps = {
  details: ReturnType<typeof useProductDetails>;
  itemNoAvailability: ReturnType<typeof useItemNoAvailability>;
};

/** Item no. and Handle (with its lock/unlock toggle) — split out of ProductFieldsPanel to keep
 * that file under the component size budget. Not embedded elsewhere; purely a size-budget split. */
export default function ProductIdentityFields({ details: d, itemNoAvailability }: ProductIdentityFieldsProps) {
  return (
    <>
      <TextField
        label="Item no."
        value={d.form.itemNo}
        onChange={d.set('itemNo')}
        error={d.errors?.itemNo ?? (itemNoAvailability.taken ? 'A product with this item number already exists' : undefined)}
      />
      <div className="min-w-0">
        <FieldLabel>Handle</FieldLabel>
        <div className="flex items-center gap-[5px]">
          <input
            type="text"
            value={d.form.handle}
            onChange={d.set('handle')}
            disabled={d.handleLocked}
            aria-label="Handle"
            className="h-[24px] w-full min-w-0 rounded-[7px] border border-inventory-border-strong px-[6px] text-[11px] leading-none outline-none focus:border-inventory-primary focus:ring-2 focus:ring-inventory-primary-ring disabled:cursor-not-allowed disabled:bg-inventory-surface-muted disabled:text-inventory-text-subtle"
          />
          <button
            type="button"
            onClick={d.toggleHandleLock}
            aria-label={d.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
            title={d.handleLocked ? 'Edit handle' : 'Auto-generate handle'}
            className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] border border-inventory-border-strong bg-inventory-surface text-inventory-text-subtle transition-colors duration-150 hover:bg-inventory-surface-hover hover:text-inventory-text-muted cursor-pointer"
          >
            {d.handleLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>
        </div>
      </div>
      {d.errors?.handle && <p className="col-span-2 -mt-1 text-[10px] leading-tight text-inventory-danger">{d.errors.handle}</p>}
    </>
  );
}
